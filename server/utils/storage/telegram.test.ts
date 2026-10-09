import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi, beforeAll, beforeEach, afterAll, afterEach } from 'vitest'
import { closeDb } from '../db'
import {
  parseTelegramConfig,
  parseTelegramSecrets,
  validateApiProxyUrl,
  validateTelegramConfig,
  TelegramStorageBackend,
  TELEGRAM_MAX_FILE_BYTES
} from './telegram'
import {
  deleteStorageObjectRef,
  getStorageObjectRef
} from './storage-object-refs'
import {
  ensureDefaultBackends,
  ensureStorageSchema,
  getStorageBackendRow,
  insertTelegramBackend
} from '../storage-backends'

describe('telegram config', () => {
  it('parses chat id and optional proxy', () => {
    const config = parseTelegramConfig(JSON.stringify({
      chatId: '-1001',
      apiProxyUrl: 'http://127.0.0.1:7890'
    }))
    expect(config).toEqual({
      chatId: '-1001',
      apiProxyUrl: 'http://127.0.0.1:7890'
    })
  })

  it('rejects invalid proxy protocol', () => {
    expect(validateApiProxyUrl('socks5://127.0.0.1:1080')).toMatch(/http/)
  })

  it('accepts http proxy', () => {
    expect(validateApiProxyUrl('http://127.0.0.1:7890')).toBeNull()
  })

  it('validates required chat id', () => {
    expect(validateTelegramConfig({ chatId: '' })).toBeTruthy()
    expect(validateTelegramConfig({ chatId: '-100' })).toBeNull()
  })

  it('parses bot token secret', () => {
    expect(parseTelegramSecrets(JSON.stringify({ botToken: '123:abc' }))).toEqual({
      botToken: '123:abc'
    })
  })

  it('exposes 20MB limit constant', () => {
    expect(TELEGRAM_MAX_FILE_BYTES).toBe(20 * 1024 * 1024)
  })
})

describe('TelegramStorageBackend', () => {
  const backendId = 'tg-test'
  const key = 'images/2026/01/test.webp'
  const tempDir = mkdtempSync(join(tmpdir(), 'pichost-tg-'))
  const previousDataDir = process.env.DATA_DIR

  beforeAll(() => {
    process.env.DATA_DIR = tempDir
    closeDb()
  })

  afterAll(() => {
    closeDb()
    if (previousDataDir === undefined) {
      delete process.env.DATA_DIR
    } else {
      process.env.DATA_DIR = previousDataDir
    }
    rmSync(tempDir, { recursive: true, force: true })
  })

  beforeEach(() => {
    ensureStorageSchema()
    ensureDefaultBackends()
    if (!getStorageBackendRow(backendId)) {
      insertTelegramBackend({
        id: backendId,
        name: 'TG test',
        config: { chatId: '-100' },
        secrets: { botToken: 'token' },
        quotaBytes: 1024 * 1024 * 1024,
        enabled: false
      })
    }
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    try {
      deleteStorageObjectRef(backendId, key)
    } catch {
      // schema setup may have failed before the ref table existed
    }
    vi.unstubAllGlobals()
  })

  it('retries sendDocument after supergroup chat id migration', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: false,
          description: 'Bad Request: group chat was upgraded to a supergroup chat',
          parameters: { migrate_to_chat_id: -100999 }
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          result: {
            message_id: 99,
            document: { file_id: 'MIG', file_unique_id: 'UQ2' }
          }
        })
      } as Response)

    const backend = new TelegramStorageBackend(
      backendId,
      { chatId: '-123' },
      { botToken: 'token' }
    )

    await backend.put(key, new Uint8Array([4, 5]), {
      originalName: 'test.webp',
      uploadedAt: new Date().toISOString(),
      contentType: 'image/webp',
      size: 2
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const ref = getStorageObjectRef(backendId, key)
    expect(ref?.fileId).toBe('MIG')
  })

  it('put accepts a single photo object and sticker file id', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        result: {
          message_id: 8,
          sticker: { file_id: 'stk', file_unique_id: 'us' }
        }
      })
    } as Response)

    const backend = new TelegramStorageBackend(
      backendId,
      { chatId: '-100' },
      { botToken: 'token' }
    )

    await backend.put(key, new Uint8Array([1]), {
      originalName: 'test.webp',
      uploadedAt: new Date().toISOString(),
      contentType: 'image/webp',
      size: 1
    })

    expect(getStorageObjectRef(backendId, key)?.fileId).toBe('stk')
  })

  it('put accepts photo array when document is absent', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        result: {
          message_id: 7,
          photo: [
            { file_id: 'small', file_unique_id: 'u1', width: 90, height: 90 },
            { file_id: 'large', file_unique_id: 'u2', width: 800, height: 600 }
          ]
        }
      })
    } as Response)

    const backend = new TelegramStorageBackend(
      backendId,
      { chatId: '-100' },
      { botToken: 'token' }
    )

    await backend.put(key, new Uint8Array([1]), {
      originalName: 'test.png',
      uploadedAt: new Date().toISOString(),
      contentType: 'image/png',
      size: 1
    })

    const ref = getStorageObjectRef(backendId, key)
    expect(ref?.fileId).toBe('large')
  })

  it('put stores file ref after sendDocument', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        result: {
          message_id: 42,
          document: {
            file_id: 'AAA',
            file_unique_id: 'UQ'
          }
        }
      })
    } as Response)

    const backend = new TelegramStorageBackend(
      backendId,
      { chatId: '-100' },
      { botToken: 'token' }
    )

    await backend.put(key, new Uint8Array([1, 2, 3]), {
      originalName: 'test.webp',
      uploadedAt: new Date().toISOString(),
      contentType: 'image/webp',
      size: 3
    })

    const ref = getStorageObjectRef(backendId, key)
    expect(ref?.fileId).toBe('AAA')
    expect(ref?.messageId).toBe(42)
  })

  it('testConnection reports telegram errors', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: false, description: 'Unauthorized' })
    } as Response)

    const backend = new TelegramStorageBackend(
      backendId,
      { chatId: '-100' },
      { botToken: 'bad' }
    )

    const result = await backend.testConnection()
    expect(result.ok).toBe(false)
    expect(result.message).toContain('Unauthorized')
  })

  it('createStream downloads file bytes', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        result: {
          message_id: 1,
          document: { file_id: 'FILE1', file_unique_id: 'U1' }
        }
      })
    } as Response)

    const putBackend = new TelegramStorageBackend(
      backendId,
      { chatId: '-100' },
      { botToken: 'token' }
    )
    await putBackend.put(key, new Uint8Array([1]), {
      originalName: 'test.webp',
      uploadedAt: new Date().toISOString(),
      contentType: 'image/webp',
      size: 1
    })

    fetchMock.mockReset()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          result: { file_id: 'FILE1', file_path: 'photos/file.jpg' }
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([9, 8, 7]).buffer
      } as Response)

    const backend = new TelegramStorageBackend(
      backendId,
      { chatId: '-100' },
      { botToken: 'token' }
    )

    const stream = await backend.createStream(key)
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    expect(Buffer.concat(chunks)).toEqual(Buffer.from([9, 8, 7]))
  })
})

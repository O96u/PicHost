import { createReadStream, promises as fs } from 'node:fs'
import type { ReadStream } from 'node:fs'
import { dirname, join } from 'node:path'
import { getDataDir } from '../data-dir'
import { validateImageKey } from '../image-key'
import type { StoredImage, StoredImageMeta, StorageBackend } from './types'

const META_SUFFIX = '.meta.json'

function keyToFilePath(key: string): string {
  return join(getDataDir(), ...key.split('/'))
}

function contentTypeFromKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'svg':
      return 'image/svg+xml'
    case 'ico':
      return 'image/x-icon'
    default:
      return 'application/octet-stream'
  }
}

async function readMeta(key: string): Promise<Partial<StoredImageMeta>> {
  try {
    const raw = await fs.readFile(keyToFilePath(key) + META_SUFFIX, 'utf8')
    return JSON.parse(raw) as Partial<StoredImageMeta>
  } catch {
    return {}
  }
}

export class LocalStorageBackend implements StorageBackend {
  readonly id: string
  readonly type = 'local' as const
  readonly servingMode: 'proxy' | 'public'
  readonly publicUrl: string

  constructor(
    id = 'local',
    servingMode: 'proxy' | 'public' = 'proxy',
    publicUrl = ''
  ) {
    this.id = id
    this.servingMode = servingMode
    this.publicUrl = publicUrl
  }

  async put(key: string, bytes: Uint8Array, meta: StoredImageMeta): Promise<void> {
    const filePath = keyToFilePath(key)
    await fs.mkdir(dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, bytes)
    await fs.writeFile(filePath + META_SUFFIX, JSON.stringify(meta))
  }

  async head(key: string): Promise<StoredImage | null> {
    if (!validateImageKey(key)) return null

    let stat
    try {
      stat = await fs.stat(keyToFilePath(key))
    } catch {
      return null
    }
    if (!stat.isFile()) return null

    const meta = await readMeta(key)
    return {
      key,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      contentType: meta.contentType ?? contentTypeFromKey(key),
      originalName: meta.originalName ?? key.split('/').pop() ?? 'image',
      uploadedAt: meta.uploadedAt ?? stat.mtime.toISOString(),
      userId: meta.userId ?? null,
      backendId: this.id
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = keyToFilePath(key)
    await fs.unlink(filePath)
    await fs.unlink(filePath + META_SUFFIX).catch(() => {})
  }

  async createStream(
    key: string,
    range?: { start: number, end: number }
  ): Promise<ReadStream> {
    return createReadStream(keyToFilePath(key), range)
  }

  async testConnection(): Promise<{ ok: boolean, message: string }> {
    try {
      await fs.access(getDataDir())
      return { ok: true, message: '本地磁盘可访问' }
    } catch {
      return { ok: false, message: '无法访问数据目录' }
    }
  }

  async getUsageStats(): Promise<{ count: number, bytes: number }> {
    return { count: 0, bytes: 0 }
  }
}

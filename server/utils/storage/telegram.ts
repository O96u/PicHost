import { Readable } from 'node:stream'
import { getImageIndexAsStored } from '../image-index'
import { validateImageKey } from '../image-key'
import { logException } from '../logger'
import {
  deleteStorageObjectRef,
  getStorageObjectRef,
  setStorageObjectRef
} from './storage-object-refs'
import type {
  ServingMode,
  StoredImage,
  StoredImageMeta,
  StorageBackend,
  TelegramBackendConfig,
  TelegramBackendSecrets,
  TelegramObjectRef
} from './types'

export const TELEGRAM_MAX_FILE_BYTES = 20 * 1024 * 1024
const TELEGRAM_API_BASE = 'https://api.telegram.org'

export function parseTelegramConfig(raw: string): TelegramBackendConfig | null {
  try {
    const parsed = JSON.parse(raw) as Partial<TelegramBackendConfig>
    if (!parsed.chatId?.trim()) return null
    const apiProxyUrl = parsed.apiProxyUrl?.trim()
    return {
      chatId: parsed.chatId.trim(),
      apiProxyUrl: apiProxyUrl || undefined
    }
  } catch {
    return null
  }
}

export function parseTelegramSecrets(raw: string): TelegramBackendSecrets | null {
  try {
    const parsed = JSON.parse(raw) as Partial<TelegramBackendSecrets>
    if (!parsed.botToken?.trim()) return null
    return { botToken: parsed.botToken.trim() }
  } catch {
    return null
  }
}

export function validateTelegramConfig(config: TelegramBackendConfig): string | null {
  if (!config.chatId.trim()) {
    return 'Chat ID 不能为空'
  }
  if (config.apiProxyUrl) {
    const error = validateApiProxyUrl(config.apiProxyUrl)
    if (error) return error
  }
  return null
}

export function validateApiProxyUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return null
    }
    return 'API 代理仅支持 http:// 或 https:// 地址'
  } catch {
    return 'API 代理地址格式无效'
  }
}

interface TelegramApiResponse<T> {
  ok: boolean
  result?: T
  description?: string
  parameters?: {
    retry_after?: number
    migrate_to_chat_id?: number
  }
}

export class TelegramApiCallError extends Error {
  readonly migrateToChatId?: number

  constructor(description: string, migrateToChatId?: number) {
    super(formatTelegramApiErrorMessage(description, migrateToChatId))
    this.name = 'TelegramApiCallError'
    this.migrateToChatId = migrateToChatId
  }
}

function formatTelegramApiErrorMessage(
  description: string,
  migrateToChatId?: number
): string {
  if (migrateToChatId != null) {
    return `Telegram 群组已升级，请使用 Chat ID：${migrateToChatId}`
  }
  const lower = description.toLowerCase()
  if (lower.includes('upgraded to a supergroup')) {
    return '群组已升级为超级群组，请在存储设置中更新 Chat ID（新 ID 一般为 -100 开头，可向 @GetTheirIDBot 查询）'
  }
  return description
}

interface TelegramFileIdentity {
  file_id: string
  file_unique_id: string
}

interface TelegramSentMessage {
  message_id: number
  document?: TelegramFileIdentity & { file_name?: string, thumbnail?: TelegramFileIdentity }
  photo?: TelegramFileIdentity[] | TelegramFileIdentity
  animation?: TelegramFileIdentity & { thumbnail?: TelegramFileIdentity }
  video?: TelegramFileIdentity & { thumbnail?: TelegramFileIdentity }
  sticker?: TelegramFileIdentity & { thumbnail?: TelegramFileIdentity }
  audio?: TelegramFileIdentity
  voice?: TelegramFileIdentity
  video_note?: TelegramFileIdentity
}

function asFileIdentity(value: unknown): TelegramFileIdentity | null {
  if (!value || typeof value !== 'object') return null
  const rec = value as Partial<TelegramFileIdentity>
  if (typeof rec.file_id !== 'string' || !rec.file_id) return null
  return {
    file_id: rec.file_id,
    file_unique_id: typeof rec.file_unique_id === 'string' ? rec.file_unique_id : ''
  }
}

function photoList(photo: TelegramSentMessage['photo']): TelegramFileIdentity[] {
  if (!photo) return []
  if (Array.isArray(photo)) {
    return photo.map(asFileIdentity).filter((item): item is TelegramFileIdentity => item != null)
  }
  const single = asFileIdentity(photo)
  return single ? [single] : []
}

function fileRefFromSentMessage(
  message: TelegramSentMessage
): TelegramObjectRef | null {
  const messageId = message.message_id
  const document = asFileIdentity(message.document)
  if (document) {
    return {
      fileId: document.file_id,
      fileUniqueId: document.file_unique_id,
      messageId
    }
  }

  const photos = photoList(message.photo)
  const largest = photos.at(-1)
  if (largest) {
    return {
      fileId: largest.file_id,
      fileUniqueId: largest.file_unique_id,
      messageId
    }
  }

  for (const media of [
    message.sticker,
    message.animation,
    message.video,
    message.audio,
    message.voice,
    message.video_note
  ]) {
    const file = asFileIdentity(media)
    if (file) {
      return {
        fileId: file.file_id,
        fileUniqueId: file.file_unique_id,
        messageId
      }
    }
  }

  return null
}

interface TelegramFile {
  file_id: string
  file_unique_id: string
  file_path?: string
  file_size?: number
}

function apiUrl(botToken: string, method: string): string {
  return `${TELEGRAM_API_BASE}/bot${botToken}/${method}`
}

function fileDownloadUrl(botToken: string, filePath: string): string {
  return `${TELEGRAM_API_BASE}/file/bot${botToken}/${filePath}`
}

async function telegramFetch(
  url: string,
  init: RequestInit,
  apiProxyUrl?: string
): Promise<Response> {
  const proxy = apiProxyUrl?.trim()
  if (!proxy) {
    return fetch(url, init)
  }

  const undici = await import('undici')
  const dispatcher = new undici.ProxyAgent(proxy)
  const response = await undici.fetch(url, {
    ...init,
    dispatcher
  } as Parameters<typeof undici.fetch>[1])
  return response as unknown as Response
}

async function callTelegramApi<T>(
  botToken: string,
  method: string,
  init: RequestInit,
  apiProxyUrl?: string,
  attempt = 0
): Promise<T> {
  const response = await telegramFetch(apiUrl(botToken, method), init, apiProxyUrl)
  const body = await response.json() as TelegramApiResponse<T>

  if (!body.ok) {
    const retryAfter = body.parameters?.retry_after
    if (response.status === 429 && retryAfter && attempt < 2) {
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
      return callTelegramApi(botToken, method, init, apiProxyUrl, attempt + 1)
    }
    const description = body.description ?? `HTTP ${response.status}`
    if (response.status === 429 || description.toLowerCase().includes('too many')) {
      throw new Error('Telegram 请求过于频繁，请稍后重试')
    }
    const migrateToChatId = body.parameters?.migrate_to_chat_id
    throw new TelegramApiCallError(description, migrateToChatId)
  }

  if (body.result === undefined) {
    throw new Error('Telegram API 返回为空')
  }

  return body.result
}

function filenameFromKey(key: string): string {
  const base = key.split('/').pop() ?? 'image'
  return base.replace(/[^\w.-]+/g, '_').slice(0, 200) || 'image'
}

/** Node fetch + FormData/Blob 发往 Telegram 时经常丢文件，改用手写 multipart。 */
function buildSendDocumentMultipart(input: {
  chatId: string
  caption: string
  filename: string
  bytes: Uint8Array
}): { body: Uint8Array, contentType: string } {
  const boundary = `----PicHost${crypto.randomUUID().replace(/-/g, '')}`
  const crlf = '\r\n'
  const safeFilename = input.filename.replace(/"/g, '\\"')
  const preamble = [
    `--${boundary}${crlf}`,
    `Content-Disposition: form-data; name="chat_id"${crlf}${crlf}`,
    `${input.chatId}${crlf}`,
    `--${boundary}${crlf}`,
    `Content-Disposition: form-data; name="disable_content_type_detection"${crlf}${crlf}`,
    `true${crlf}`,
    `--${boundary}${crlf}`,
    `Content-Disposition: form-data; name="caption"${crlf}${crlf}`,
    `${input.caption}${crlf}`,
    `--${boundary}${crlf}`,
    `Content-Disposition: form-data; name="document"; filename="${safeFilename}"${crlf}`,
    // 固定 octet-stream，避免 Telegram 把图片转成 photo 后响应里不带 file_id
    `Content-Type: application/octet-stream${crlf}${crlf}`
  ].join('')

  const suffix = `${crlf}--${boundary}--${crlf}`
  const body = Buffer.concat([
    Buffer.from(preamble, 'utf8'),
    Buffer.from(input.bytes),
    Buffer.from(suffix, 'utf8')
  ])

  return {
    body: new Uint8Array(body),
    contentType: `multipart/form-data; boundary=${boundary}`
  }
}

export class TelegramStorageBackend implements StorageBackend {
  readonly id: string
  readonly type = 'telegram' as const
  readonly servingMode: ServingMode = 'proxy'
  readonly publicUrl = ''
  private chatId: string
  private readonly botToken: string
  private readonly apiProxyUrl?: string

  constructor(
    id: string,
    config: TelegramBackendConfig,
    secrets: TelegramBackendSecrets
  ) {
    this.id = id
    this.chatId = config.chatId
    this.botToken = secrets.botToken
    this.apiProxyUrl = config.apiProxyUrl
  }

  private async persistChatIdMigration(newChatId: string): Promise<void> {
    if (newChatId === this.chatId) return
    this.chatId = newChatId
    const { updateStorageBackend } = await import('../storage-backends')
    updateStorageBackend(this.id, { config: { chatId: newChatId } })
  }

  private async withChatIdMigrationRetry<T>(
    fn: (chatId: string) => Promise<T>
  ): Promise<T> {
    try {
      return await fn(this.chatId)
    } catch (error) {
      if (
        error instanceof TelegramApiCallError
        && error.migrateToChatId != null
      ) {
        const newId = String(error.migrateToChatId)
        await this.persistChatIdMigration(newId)
        return await fn(newId)
      }
      throw error
    }
  }

  async put(key: string, bytes: Uint8Array, _meta: StoredImageMeta): Promise<void> {
    if (!validateImageKey(key)) {
      throw new Error('Invalid image key')
    }
    if (bytes.byteLength > TELEGRAM_MAX_FILE_BYTES) {
      throw new Error('文件超过 Telegram 存储上限（20MB）')
    }

    const filename = filenameFromKey(key)
    const caption = key.length <= 1024 ? key : key.slice(0, 1021) + '...'

    const message = await this.withChatIdMigrationRetry(async (chatId) => {
      const { body, contentType: multipartType } = buildSendDocumentMultipart({
        chatId,
        caption,
        filename,
        bytes
      })
      return callTelegramApi<TelegramSentMessage>(
        this.botToken,
        'sendDocument',
        {
          method: 'POST',
          headers: { 'Content-Type': multipartType },
          body: body.buffer.slice(
            body.byteOffset,
            body.byteOffset + body.byteLength
          ) as ArrayBuffer
        },
        this.apiProxyUrl
      )
    })

    const ref = fileRefFromSentMessage(message)
    if (!ref) {
      if (message.message_id != null) {
        await this.deleteChatMessage(this.chatId, message.message_id).catch((error) => {
          logException('telegram rollback message failed', error, {
            messageId: message.message_id
          })
        })
      }
      logException(
        'telegram sendDocument: message has no file id',
        new Error('Telegram 未返回文件信息'),
        {
          messageId: message.message_id,
          keys: Object.keys(message)
        }
      )
      throw new Error('Telegram 未返回文件信息')
    }
    setStorageObjectRef(this.id, key, ref)
  }

  async head(key: string): Promise<StoredImage | null> {
    if (!validateImageKey(key)) return null

    const indexed = getImageIndexAsStored(key)
    if (!indexed || indexed.backendId !== this.id) {
      return null
    }

    const ref = getStorageObjectRef(this.id, key)
    if (!ref) return null

    return { ...indexed, backendId: this.id }
  }

  private async deleteChatMessage(chatId: string, messageId: number): Promise<void> {
    await callTelegramApi<boolean>(
      this.botToken,
      'deleteMessage',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId
        })
      },
      this.apiProxyUrl
    )
  }

  async delete(key: string): Promise<void> {
    const ref = getStorageObjectRef(this.id, key)
    deleteStorageObjectRef(this.id, key)

    if (ref?.messageId == null) return

    try {
      await this.withChatIdMigrationRetry(chatId =>
        this.deleteChatMessage(chatId, ref.messageId as number)
      )
    } catch (error) {
      logException('telegram deleteMessage failed', error, { key, messageId: ref.messageId })
    }
  }

  async createStream(
    key: string,
    range?: { start: number, end: number }
  ): Promise<Readable> {
    const ref = getStorageObjectRef(this.id, key)
    if (!ref?.fileId) {
      throw new Error('Telegram 文件引用不存在')
    }

    const file = await callTelegramApi<TelegramFile>(
      this.botToken,
      'getFile',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: ref.fileId })
      },
      this.apiProxyUrl
    )

    if (!file.file_path) {
      throw new Error('Telegram 文件路径不可用')
    }

    const downloadUrl = fileDownloadUrl(this.botToken, file.file_path)
    const response = await telegramFetch(downloadUrl, { method: 'GET' }, this.apiProxyUrl)
    if (!response.ok) {
      throw new Error(`Telegram 文件下载失败（${response.status}）`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())

    if (range) {
      const slice = buffer.subarray(range.start, range.end + 1)
      return Readable.from(slice)
    }

    return Readable.from(buffer)
  }

  async testConnection(): Promise<{ ok: boolean, message: string }> {
    try {
      await callTelegramApi<{ id: number, username?: string }>(
        this.botToken,
        'getMe',
        { method: 'GET' },
        this.apiProxyUrl
      )
      await this.withChatIdMigrationRetry(chatId =>
        callTelegramApi<{ id: number, title?: string }>(
          this.botToken,
          'getChat',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId })
          },
          this.apiProxyUrl
        )
      )
      return { ok: true, message: '连接成功' }
    } catch (error) {
      const message = error instanceof Error ? error.message : '连接失败'
      return { ok: false, message }
    }
  }

  async getUsageStats(): Promise<{ count: number, bytes: number }> {
    return { count: 0, bytes: 0 }
  }
}

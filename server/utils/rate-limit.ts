import { createHash } from 'node:crypto'
import { createError, getHeader, type H3Event } from 'h3'
import { clientIp } from './logger'

const UPLOAD_IP_MAX = 60
const UPLOAD_TOKEN_MAX = 120
const UPLOAD_WINDOW_MS = 15 * 60 * 1000

const stores = new Map<string, Map<string, { count: number, resetAt: number }>>()

function getStore(name: string): Map<string, { count: number, resetAt: number }> {
  let store = stores.get(name)
  if (!store) {
    store = new Map()
    stores.set(name, store)
  }
  return store
}

function assertRateLimit(
  storeName: string,
  key: string,
  max: number,
  windowMs: number,
  message: string
): void {
  const store = getStore(storeName)
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  entry.count += 1
  if (entry.count > max) {
    throw createError({
      statusCode: 429,
      statusMessage: message
    })
  }
}

export function checkUploadRateLimit(event: H3Event, apiToken?: string): void {
  const ip = clientIp(event)
  assertRateLimit(
    'upload-ip',
    ip,
    UPLOAD_IP_MAX,
    UPLOAD_WINDOW_MS,
    '上传过于频繁，请稍后再试'
  )

  const headerToken = getHeader(event, 'auth-token')?.trim() ?? ''
  const token = apiToken?.trim() || headerToken
  if (!token) return

  const hash = createHash('sha256').update(token).digest('hex').slice(0, 32)
  assertRateLimit(
    'upload-token',
    hash,
    UPLOAD_TOKEN_MAX,
    UPLOAD_WINDOW_MS,
    '上传过于频繁，请稍后再试'
  )
}

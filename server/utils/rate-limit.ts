import { createHash } from 'node:crypto'
import { createError, getHeader, type H3Event } from 'h3'
import { clientIp } from './logger'
import { getUploadRateLimitSettings, getLoginRateLimitSettings } from './upload-policy'

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
  const { ipMax, tokenMax, windowMs } = getUploadRateLimitSettings()
  const ip = clientIp(event)
  assertRateLimit(
    'upload-ip',
    ip,
    ipMax,
    windowMs,
    '上传过于频繁，请稍后再试'
  )

  const headerToken = getHeader(event, 'auth-token')?.trim() ?? ''
  const token = apiToken?.trim() || headerToken
  if (!token) return

  const hash = createHash('sha256').update(token).digest('hex').slice(0, 32)
  assertRateLimit(
    'upload-token',
    hash,
    tokenMax,
    windowMs,
    '上传过于频繁，请稍后再试'
  )
}

const loginAttempts = new Map<string, { count: number, resetAt: number }>()

export function checkLoginRateLimit(ip: string): void {
  const { max, windowMs } = getLoginRateLimitSettings()
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + windowMs })
    return
  }
  entry.count += 1
  if (entry.count > max) {
    throw createError({
      statusCode: 429,
      statusMessage: '登录尝试过于频繁，请稍后再试'
    })
  }
}

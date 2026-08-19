import type { H3Event } from 'h3'
import { getAdminSecret, getApiUploadToken } from './env'
import { createApiError } from './r2'

const AUTH_COOKIE = 'pic_auth'
const SESSION_SALT = 'pic-session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 天

async function createSessionToken(secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(SESSION_SALT))
  return Array.from(new Uint8Array(sig), byte => byte.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

export async function setAuthCookie(event: H3Event, secret: string): Promise<void> {
  const token = await createSessionToken(secret)
  setCookie(event, AUTH_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE
  })
}

export function clearAuthCookie(event: H3Event): void {
  deleteCookie(event, AUTH_COOKIE, { path: '/' })
}

export async function verifyAdminSecret(
  event: H3Event,
  secret: string
): Promise<boolean> {
  const cookie = getCookie(event, AUTH_COOKIE)
  if (!cookie) return false
  const expected = await createSessionToken(secret)
  return timingSafeEqual(cookie, expected)
}

export async function requireAdminAuth(event: H3Event): Promise<void> {
  const config = useRuntimeConfig(event)

  if (import.meta.dev && config.devBypassAccess) {
    return
  }

  const adminSecret = getAdminSecret(event)
  if (!adminSecret) {
    createApiError(
      event,
      'UNAUTHORIZED',
      '未配置 ADMIN_SECRET，请在 Pages 环境变量中设置',
      401
    )
  }

  if (await verifyAdminSecret(event, adminSecret)) {
    return
  }

  createApiError(event, 'UNAUTHORIZED', '未授权访问，请先登录', 401)
}

export async function checkAdminSecret(
  input: string,
  secret: string
): Promise<boolean> {
  return timingSafeEqual(input, secret)
}

function extractBearerToken(event: H3Event): string {
  const auth = getHeader(event, 'authorization')
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7).trim()
  }

  const apiToken = getHeader(event, 'x-api-token')
  return apiToken?.trim() ?? ''
}

export function verifyApiUploadToken(event: H3Event): boolean {
  const expected = getApiUploadToken(event)
  if (!expected) return false

  const token = extractBearerToken(event)
  if (!token) return false

  return timingSafeEqual(token, expected)
}

/** EasyImage 等图床在表单字段 token 中传 API_UPLOAD_TOKEN */
export function verifyUploadTokenValue(event: H3Event, token: string): boolean {
  const expected = getApiUploadToken(event)
  if (!expected || !token) return false
  return timingSafeEqual(token, expected)
}

/** 网页登录 Cookie，或油猴/脚本使用的 API_UPLOAD_TOKEN */
export async function requireUploadAuth(event: H3Event): Promise<void> {
  const config = useRuntimeConfig(event)

  if (import.meta.dev && config.devBypassAccess) {
    return
  }

  if (verifyApiUploadToken(event)) {
    return
  }

  await requireAdminAuth(event)
}

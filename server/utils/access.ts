import type { H3Event } from 'h3'
import { findUserByApiToken } from './db'
import { getAdminSecret, getApiUploadToken } from './env'
import { createApiError } from './api-error'
import {
  getCurrentUser,
  type AuthUser
} from './auth'

const LEGACY_AUTH_COOKIE = 'pic_auth'
const LEGACY_SESSION_SALT = 'pic-session'
const LEGACY_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

export async function createLegacySessionToken(secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(LEGACY_SESSION_SALT))
  return Array.from(new Uint8Array(sig), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function setLegacyAuthCookie(event: H3Event, secret: string): Promise<void> {
  const token = await createLegacySessionToken(secret)
  const isHttps = getRequestURL(event, {
    xForwardedHost: true,
    xForwardedProto: true
  }).protocol === 'https:'
  setCookie(event, LEGACY_AUTH_COOKIE, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: LEGACY_COOKIE_MAX_AGE
  })
}

export function clearLegacyAuthCookie(event: H3Event): void {
  deleteCookie(event, LEGACY_AUTH_COOKIE, { path: '/' })
}

export async function verifyLegacyAuth(event: H3Event): Promise<boolean> {
  const adminSecret = getAdminSecret(event)
  if (!adminSecret) return false

  const cookie = getCookie(event, LEGACY_AUTH_COOKIE)
  if (!cookie) return false

  const expected = await createLegacySessionToken(adminSecret)
  return timingSafeEqual(cookie, expected)
}

export async function checkAdminSecret(
  input: string,
  secret: string
): Promise<boolean> {
  return timingSafeEqual(input, secret)
}

function extractApiToken(event: H3Event): string {
  const token = getHeader(event, 'auth-token')
  return token?.trim() ?? ''
}

export function verifyGlobalApiUploadToken(event: H3Event): boolean {
  const expected = getApiUploadToken(event)
  if (!expected) return false

  const token = extractApiToken(event)
  if (!token) return false

  return timingSafeEqual(token, expected)
}

export function resolveUserIdFromApiToken(event: H3Event): number | null {
  const token = extractApiToken(event)
  if (!token) return null
  return findUserByApiToken(token)?.id ?? null
}

export function verifyApiUploadToken(event: H3Event): boolean {
  return verifyGlobalApiUploadToken(event)
    || resolveUserIdFromApiToken(event) !== null
}

/** EasyImage 等图床在表单字段 token 中传 API_UPLOAD_TOKEN */
export function verifyUploadTokenValue(event: H3Event, token: string): boolean {
  const expected = getApiUploadToken(event)
  if (expected && token && timingSafeEqual(token, expected)) {
    return true
  }
  return findUserByApiToken(token) !== null
}

function devBypass(event: H3Event): boolean {
  const config = useRuntimeConfig(event)
  return import.meta.dev && Boolean(config.devBypassAccess)
}

export async function requireUserAuth(event: H3Event): Promise<AuthUser> {
  if (devBypass(event)) {
    return { id: 0, username: 'dev', role: 'admin' }
  }

  const user = await getCurrentUser(event)
  if (!user) {
    createApiError(event, 'UNAUTHORIZED', '未授权访问，请先登录', 401)
  }

  return user
}

export async function requireAdminAuth(event: H3Event): Promise<AuthUser> {
  const user = await requireUserAuth(event)
  if (user.role !== 'admin') {
    createApiError(event, 'FORBIDDEN', '需要管理员权限', 403)
  }
  return user
}

export async function requireUploadAuth(event: H3Event): Promise<void> {
  if (devBypass(event)) {
    return
  }

  if (verifyApiUploadToken(event)) {
    return
  }

  const user = await getCurrentUser(event)
  if (!user) {
    createApiError(event, 'UNAUTHORIZED', '未授权访问，请先登录', 401)
  }
}

/** 图库读删等管理接口：API Token 或网页登录 Session */
export async function requireApiOrAdminAuth(event: H3Event): Promise<void> {
  if (devBypass(event)) {
    return
  }

  if (verifyApiUploadToken(event)) {
    return
  }

  const user = await getCurrentUser(event)
  if (!user) {
    createApiError(event, 'UNAUTHORIZED', '未授权访问，请先登录', 401)
  }
}

/** 列表/搜索/删除时按用户过滤；全局 Token 视为管理员，用户 Token 仅见自己的 */
export async function getImageUserFilter(
  event: H3Event
): Promise<number | 'admin'> {
  if (devBypass(event)) {
    return 'admin'
  }

  const userIdFromToken = resolveUserIdFromApiToken(event)
  if (userIdFromToken !== null) {
    return userIdFromToken
  }

  if (verifyGlobalApiUploadToken(event)) {
    return 'admin'
  }

  const user = await requireUserAuth(event)
  if (user.role === 'admin') {
    return 'admin'
  }
  return user.id
}

export async function assertImageOwnership(
  event: H3Event,
  userId: number | null | undefined
): Promise<void> {
  if (devBypass(event)) {
    return
  }

  const userIdFromToken = resolveUserIdFromApiToken(event)
  if (userIdFromToken !== null) {
    const ownerId = userId ?? null
    if (ownerId !== userIdFromToken) {
      createApiError(event, 'FORBIDDEN', '无权操作此图片', 403)
    }
    return
  }

  if (verifyGlobalApiUploadToken(event)) {
    return
  }

  const user = await requireUserAuth(event)
  if (user.role === 'admin') {
    return
  }

  const ownerId = userId ?? null
  if (ownerId === null || ownerId !== user.id) {
    createApiError(event, 'FORBIDDEN', '无权操作此图片', 403)
  }
}

export function resolveActivitySource(event: H3Event): 'api' | 'web' {
  return verifyApiUploadToken(event) ? 'api' : 'web'
}

export async function getUploadUserId(event: H3Event): Promise<number | null> {
  if (devBypass(event)) {
    return null
  }

  const userIdFromToken = resolveUserIdFromApiToken(event)
  if (userIdFromToken !== null) {
    return userIdFromToken
  }

  if (verifyGlobalApiUploadToken(event)) {
    return null
  }

  const user = await getCurrentUser(event)
  return user?.id ?? null
}

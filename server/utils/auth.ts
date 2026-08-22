import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import {
  countUsers,
  createSessionRow,
  deleteSession,
  findSessionById,
  findUserById,
  findUserByUsername,
  insertUser,
  type UserRole,
  type UserRow
} from './db'

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEY_LEN = 64
const MIN_PASSWORD_LENGTH = 8
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,32}$/

export const SESSION_COOKIE = 'pic_session'
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7 // 7 days

export interface AuthUser {
  id: number
  username: string
  role: UserRole
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username)
}

export function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, SCRYPT_KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P
  })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derived.toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false

  const N = Number(parts[1])
  const r = Number(parts[2])
  const p = Number(parts[3])
  const salt = parts[4]
  const hashHex = parts[5]
  if (!salt || !hashHex || !Number.isFinite(N)) return false

  try {
    const derived = scryptSync(password, salt, SCRYPT_KEY_LEN, { N, r, p })
    return timingSafeEqualStr(derived.toString('hex'), hashHex)
  } catch {
    return false
  }
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

function sessionExpiresAt(): string {
  return new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000).toISOString()
}

function cookieSecure(event: H3Event): boolean {
  return getRequestURL(event, {
    xForwardedHost: true,
    xForwardedProto: true
  }).protocol === 'https:'
}

export function setSessionCookie(event: H3Event, sessionId: string): void {
  setCookie(event, SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: cookieSecure(event),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SEC
  })
}

export function clearSessionCookie(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

export async function createSession(
  event: H3Event,
  userId: number
): Promise<string> {
  const sessionId = randomBytes(24).toString('hex')
  const token = generateSessionToken()
  const tokenHash = hashSessionToken(token)
  const expiresAt = sessionExpiresAt()
  const createdAt = new Date().toISOString()

  createSessionRow({
    id: sessionId,
    userId,
    tokenHash,
    expiresAt,
    createdAt
  })

  setSessionCookie(event, sessionId)
  return sessionId
}

export async function destroySession(event: H3Event): Promise<void> {
  const sessionId = getCookie(event, SESSION_COOKIE)
  if (sessionId) {
    deleteSession(sessionId)
  }
  clearSessionCookie(event)
}

export function rowToAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    username: row.username,
    role: row.role
  }
}

export async function getCurrentUser(event: H3Event): Promise<AuthUser | null> {
  const sessionId = getCookie(event, SESSION_COOKIE)
  if (!sessionId) return null

  const session = findSessionById(sessionId)
  if (!session) return null

  if (new Date(session.expires_at) <= new Date()) {
    deleteSession(sessionId)
    return null
  }

  const user = findUserById(session.user_id)
  if (!user) return null

  return rowToAuthUser(user)
}

export async function createUserAccount(input: {
  username: string
  password: string
  role: UserRole
}): Promise<AuthUser> {
  if (!isValidUsername(input.username)) {
    throw new Error('INVALID_USERNAME')
  }
  if (!isValidPassword(input.password)) {
    throw new Error('INVALID_PASSWORD')
  }

  const existing = findUserByUsername(input.username)
  if (existing) {
    throw new Error('USERNAME_TAKEN')
  }

  const passwordHash = hashPassword(input.password)
  const createdAt = new Date().toISOString()
  const id = insertUser({
    username: input.username,
    passwordHash,
    role: input.role,
    createdAt
  })

  return {
    id,
    username: input.username,
    role: input.role
  }
}

export function isInitialized(): boolean {
  return countUsers() > 0
}

import { randomBytes, timingSafeEqual } from 'node:crypto'
import { getBackupJob, updateBackupJob } from './jobs'

const WATCH_PAYLOAD_KEY = 'watchToken'
const WATCH_TTL_MS = 4 * 60 * 60 * 1000

interface WatchEntry {
  token: string
  expiresAt: number
}

const watchStore: Map<string, WatchEntry> = (globalThis as typeof globalThis & {
  __pichostBackupWatchTokens?: Map<string, WatchEntry>
}).__pichostBackupWatchTokens ?? new Map()

;(globalThis as typeof globalThis & {
  __pichostBackupWatchTokens?: Map<string, WatchEntry>
}).__pichostBackupWatchTokens = watchStore

function tokensEqual(expected: string, provided: string): boolean {
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(provided, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function readWatchTokenFromJob(jobId: string): string | null {
  const job = getBackupJob(jobId)
  const value = job?.payload?.[WATCH_PAYLOAD_KEY]
  return typeof value === 'string' && value.length > 0 ? value : null
}

function persistWatchTokenToJob(jobId: string, token: string): void {
  const job = getBackupJob(jobId)
  if (!job) return
  updateBackupJob(jobId, {
    payload: { ...job.payload, [WATCH_PAYLOAD_KEY]: token }
  })
}

export function issueBackupJobWatchToken(jobId: string): string {
  const token = randomBytes(24).toString('hex')
  watchStore.set(jobId, {
    token,
    expiresAt: Date.now() + WATCH_TTL_MS
  })
  persistWatchTokenToJob(jobId, token)
  return token
}

export function validateBackupJobWatchToken(jobId: string, token: string): boolean {
  if (!token) return false

  const entry = watchStore.get(jobId)
  if (entry) {
    if (Date.now() > entry.expiresAt) {
      watchStore.delete(jobId)
    } else if (tokensEqual(entry.token, token)) {
      return true
    }
  }

  const stored = readWatchTokenFromJob(jobId)
  if (!stored) return false
  return tokensEqual(stored, token)
}

export function revokeBackupJobWatchToken(jobId: string): void {
  watchStore.delete(jobId)
  const job = getBackupJob(jobId)
  if (!job || !(WATCH_PAYLOAD_KEY in job.payload)) return
  const { [WATCH_PAYLOAD_KEY]: _removed, ...nextPayload } = job.payload as Record<string, unknown> & {
    watchToken?: string
  }
  updateBackupJob(jobId, { payload: nextPayload })
}

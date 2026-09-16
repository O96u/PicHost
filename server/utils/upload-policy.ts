import {
  ALLOWED_MIME_TYPES,
  type AllowedMimeType
} from './constants'
import { getSetting, setSetting } from './db'

export const SETTINGS_UPLOAD_MAX_FILE_SIZE_MB = 'upload_max_file_size_mb'
export const SETTINGS_ALLOWED_MIME_TYPES = 'allowed_mime_types'
export const SETTINGS_UPLOAD_RATE_IP_MAX = 'upload_rate_ip_max'
export const SETTINGS_UPLOAD_RATE_TOKEN_MAX = 'upload_rate_token_max'
export const SETTINGS_UPLOAD_RATE_WINDOW_MINUTES = 'upload_rate_window_minutes'
export const SETTINGS_LOGIN_RATE_MAX = 'login_rate_max'
export const SETTINGS_LOGIN_RATE_WINDOW_MINUTES = 'login_rate_window_minutes'
export const SETTINGS_PRESERVE_ORIGINAL_UPLOAD = 'preserve_original_upload'

export const DEFAULT_UPLOAD_MAX_FILE_SIZE_MB = 10
export const MIN_UPLOAD_MAX_FILE_SIZE_MB = 1
export const MAX_UPLOAD_MAX_FILE_SIZE_MB = 100

export const DEFAULT_UPLOAD_RATE_IP_MAX = 60
export const DEFAULT_UPLOAD_RATE_TOKEN_MAX = 120
export const DEFAULT_UPLOAD_RATE_WINDOW_MINUTES = 15
export const MIN_UPLOAD_RATE_MAX = 1
export const MAX_UPLOAD_RATE_IP_MAX = 1000
export const MAX_UPLOAD_RATE_TOKEN_MAX = 5000
export const MIN_RATE_WINDOW_MINUTES = 1
export const MAX_RATE_WINDOW_MINUTES = 1440

export const DEFAULT_LOGIN_RATE_MAX = 10
export const DEFAULT_LOGIN_RATE_WINDOW_MINUTES = 15
export const MAX_LOGIN_RATE_MAX = 100

export const ALL_MIME_TYPE_OPTIONS = [
  { mime: 'image/jpeg', label: 'JPEG' },
  { mime: 'image/png', label: 'PNG' },
  { mime: 'image/webp', label: 'WebP' },
  { mime: 'image/gif', label: 'GIF' },
  { mime: 'image/svg+xml', label: 'SVG' },
  { mime: 'image/x-icon', label: 'ICO' }
] as const satisfies ReadonlyArray<{ mime: AllowedMimeType, label: string }>

export type PolicySource = 'env' | 'db' | 'default'

function readEnv(name: string): string {
  try {
    return process.env[name]?.trim() ?? ''
  } catch {
    return ''
  }
}

function parsePositiveInt(raw: string, min: number, max: number): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const value = Number(trimmed)
  if (!Number.isFinite(value) || !Number.isInteger(value)) return null
  if (value < min || value > max) return null
  return value
}

export function parseUploadMaxFileSizeMb(raw: string): number | null {
  return parsePositiveInt(raw, MIN_UPLOAD_MAX_FILE_SIZE_MB, MAX_UPLOAD_MAX_FILE_SIZE_MB)
}

export function parseUploadRateIpMax(raw: string): number | null {
  return parsePositiveInt(raw, MIN_UPLOAD_RATE_MAX, MAX_UPLOAD_RATE_IP_MAX)
}

export function parseUploadRateTokenMax(raw: string): number | null {
  return parsePositiveInt(raw, MIN_UPLOAD_RATE_MAX, MAX_UPLOAD_RATE_TOKEN_MAX)
}

export function parseUploadRateWindowMinutes(raw: string): number | null {
  return parsePositiveInt(raw, MIN_RATE_WINDOW_MINUTES, MAX_RATE_WINDOW_MINUTES)
}

export function parseLoginRateMax(raw: string): number | null {
  return parsePositiveInt(raw, MIN_UPLOAD_RATE_MAX, MAX_LOGIN_RATE_MAX)
}

export function parseLoginRateWindowMinutes(raw: string): number | null {
  return parsePositiveInt(raw, MIN_RATE_WINDOW_MINUTES, MAX_RATE_WINDOW_MINUTES)
}

export function parsePreserveOriginalUpload(raw: string): boolean | null {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return null
  if (trimmed === 'true' || trimmed === '1' || trimmed === 'yes') return true
  if (trimmed === 'false' || trimmed === '0' || trimmed === 'no') return false
  return null
}

export function serializePreserveOriginalUpload(value: boolean): string {
  return value ? 'true' : 'false'
}

export function normalizeAllowedMimeTypes(raw: string): AllowedMimeType[] {
  const allowedSet = new Set<string>(ALLOWED_MIME_TYPES)
  const seen = new Set<string>()
  const result: AllowedMimeType[] = []

  for (const part of raw.split(',')) {
    const mime = part.trim().toLowerCase()
    if (!mime || seen.has(mime) || !allowedSet.has(mime)) continue
    seen.add(mime)
    result.push(mime as AllowedMimeType)
  }

  return result
}

export function serializeAllowedMimeTypes(mimes: readonly string[]): string {
  const normalized = new Set(normalizeAllowedMimeTypes(mimes.join(',')))
  return ALL_MIME_TYPE_OPTIONS
    .map(option => option.mime)
    .filter(mime => normalized.has(mime))
    .join(',')
}

function getUploadMaxFileSizeMbSource(): PolicySource {
  if (getSetting(SETTINGS_UPLOAD_MAX_FILE_SIZE_MB) !== null) return 'db'
  if (parseUploadMaxFileSizeMb(readEnv('UPLOAD_MAX_FILE_SIZE_MB')) !== null) return 'env'
  return 'default'
}

function getAllowedMimeTypesSource(): PolicySource {
  if (getSetting(SETTINGS_ALLOWED_MIME_TYPES) !== null) return 'db'
  if (normalizeAllowedMimeTypes(readEnv('ALLOWED_MIME_TYPES')).length > 0) return 'env'
  return 'default'
}

function getUploadRateIpMaxSource(): PolicySource {
  if (getSetting(SETTINGS_UPLOAD_RATE_IP_MAX) !== null) return 'db'
  if (parseUploadRateIpMax(readEnv('UPLOAD_RATE_IP_MAX')) !== null) return 'env'
  return 'default'
}

function getUploadRateTokenMaxSource(): PolicySource {
  if (getSetting(SETTINGS_UPLOAD_RATE_TOKEN_MAX) !== null) return 'db'
  if (parseUploadRateTokenMax(readEnv('UPLOAD_RATE_TOKEN_MAX')) !== null) return 'env'
  return 'default'
}

function getUploadRateWindowMinutesSource(): PolicySource {
  if (getSetting(SETTINGS_UPLOAD_RATE_WINDOW_MINUTES) !== null) return 'db'
  if (parseUploadRateWindowMinutes(readEnv('UPLOAD_RATE_WINDOW_MINUTES')) !== null) return 'env'
  return 'default'
}

function getLoginRateMaxSource(): PolicySource {
  if (getSetting(SETTINGS_LOGIN_RATE_MAX) !== null) return 'db'
  if (parseLoginRateMax(readEnv('LOGIN_RATE_MAX')) !== null) return 'env'
  return 'default'
}

function getLoginRateWindowMinutesSource(): PolicySource {
  if (getSetting(SETTINGS_LOGIN_RATE_WINDOW_MINUTES) !== null) return 'db'
  if (parseLoginRateWindowMinutes(readEnv('LOGIN_RATE_WINDOW_MINUTES')) !== null) return 'env'
  return 'default'
}

function getPreserveOriginalUploadSource(): PolicySource {
  if (getSetting(SETTINGS_PRESERVE_ORIGINAL_UPLOAD) !== null) return 'db'
  if (parsePreserveOriginalUpload(readEnv('PRESERVE_ORIGINAL_UPLOAD')) !== null) return 'env'
  return 'default'
}

export function getUploadMaxFileSizeMb(): number {
  const dbRaw = getSetting(SETTINGS_UPLOAD_MAX_FILE_SIZE_MB)
  if (dbRaw !== null) {
    const parsed = parseUploadMaxFileSizeMb(dbRaw)
    if (parsed !== null) return parsed
  }
  const fromEnv = parseUploadMaxFileSizeMb(readEnv('UPLOAD_MAX_FILE_SIZE_MB'))
  if (fromEnv !== null) return fromEnv
  return DEFAULT_UPLOAD_MAX_FILE_SIZE_MB
}

export function getMaxFileSizeBytes(): number {
  return getUploadMaxFileSizeMb() * 1024 * 1024
}

export function getAllowedMimeTypesList(): AllowedMimeType[] {
  const dbRaw = getSetting(SETTINGS_ALLOWED_MIME_TYPES)
  if (dbRaw !== null) {
    const parsed = normalizeAllowedMimeTypes(dbRaw)
    if (parsed.length > 0) return parsed
  }
  const fromEnv = normalizeAllowedMimeTypes(readEnv('ALLOWED_MIME_TYPES'))
  if (fromEnv.length > 0) return fromEnv
  return [...ALLOWED_MIME_TYPES]
}

export function isMimeTypeAllowed(mime: string): mime is AllowedMimeType {
  return getAllowedMimeTypesList().includes(mime as AllowedMimeType)
}

export function isPreserveOriginalUpload(): boolean {
  const dbRaw = getSetting(SETTINGS_PRESERVE_ORIGINAL_UPLOAD)
  if (dbRaw !== null) {
    const parsed = parsePreserveOriginalUpload(dbRaw)
    if (parsed !== null) return parsed
  }
  const fromEnv = parsePreserveOriginalUpload(readEnv('PRESERVE_ORIGINAL_UPLOAD'))
  if (fromEnv !== null) return fromEnv
  return false
}

export function getUploadRateLimitSettings(): {
  ipMax: number
  tokenMax: number
  windowMs: number
} {
  const ipMax = (() => {
    const dbRaw = getSetting(SETTINGS_UPLOAD_RATE_IP_MAX)
    if (dbRaw !== null) {
      const parsed = parseUploadRateIpMax(dbRaw)
      if (parsed !== null) return parsed
    }
    return parseUploadRateIpMax(readEnv('UPLOAD_RATE_IP_MAX')) ?? DEFAULT_UPLOAD_RATE_IP_MAX
  })()

  const tokenMax = (() => {
    const dbRaw = getSetting(SETTINGS_UPLOAD_RATE_TOKEN_MAX)
    if (dbRaw !== null) {
      const parsed = parseUploadRateTokenMax(dbRaw)
      if (parsed !== null) return parsed
    }
    return parseUploadRateTokenMax(readEnv('UPLOAD_RATE_TOKEN_MAX')) ?? DEFAULT_UPLOAD_RATE_TOKEN_MAX
  })()

  const windowMinutes = (() => {
    const dbRaw = getSetting(SETTINGS_UPLOAD_RATE_WINDOW_MINUTES)
    if (dbRaw !== null) {
      const parsed = parseUploadRateWindowMinutes(dbRaw)
      if (parsed !== null) return parsed
    }
    return parseUploadRateWindowMinutes(readEnv('UPLOAD_RATE_WINDOW_MINUTES'))
      ?? DEFAULT_UPLOAD_RATE_WINDOW_MINUTES
  })()

  return {
    ipMax,
    tokenMax,
    windowMs: windowMinutes * 60 * 1000
  }
}

export function getLoginRateLimitSettings(): {
  max: number
  windowMs: number
} {
  const max = (() => {
    const dbRaw = getSetting(SETTINGS_LOGIN_RATE_MAX)
    if (dbRaw !== null) {
      const parsed = parseLoginRateMax(dbRaw)
      if (parsed !== null) return parsed
    }
    return parseLoginRateMax(readEnv('LOGIN_RATE_MAX')) ?? DEFAULT_LOGIN_RATE_MAX
  })()

  const windowMinutes = (() => {
    const dbRaw = getSetting(SETTINGS_LOGIN_RATE_WINDOW_MINUTES)
    if (dbRaw !== null) {
      const parsed = parseLoginRateWindowMinutes(dbRaw)
      if (parsed !== null) return parsed
    }
    return parseLoginRateWindowMinutes(readEnv('LOGIN_RATE_WINDOW_MINUTES'))
      ?? DEFAULT_LOGIN_RATE_WINDOW_MINUTES
  })()

  return {
    max,
    windowMs: windowMinutes * 60 * 1000
  }
}

export function formatMaxFileSizeMessage(): string {
  return `图片大小不能超过 ${getUploadMaxFileSizeMb()} MB`
}

export function getUploadPolicySettingsPayload() {
  return {
    uploadMaxFileSizeMb: getUploadMaxFileSizeMb(),
    uploadMaxFileSizeMbSource: getUploadMaxFileSizeMbSource(),
    uploadMaxFileSizeMbEnvFallback: parseUploadMaxFileSizeMb(readEnv('UPLOAD_MAX_FILE_SIZE_MB'))
      ?? DEFAULT_UPLOAD_MAX_FILE_SIZE_MB,
    allowedMimeTypes: getAllowedMimeTypesList(),
    allowedMimeTypesSource: getAllowedMimeTypesSource(),
    allowedMimeTypesEnvFallback: normalizeAllowedMimeTypes(readEnv('ALLOWED_MIME_TYPES')),
    uploadRateIpMax: getUploadRateLimitSettings().ipMax,
    uploadRateIpMaxSource: getUploadRateIpMaxSource(),
    uploadRateTokenMax: getUploadRateLimitSettings().tokenMax,
    uploadRateTokenMaxSource: getUploadRateTokenMaxSource(),
    uploadRateWindowMinutes: getUploadRateLimitSettings().windowMs / (60 * 1000),
    uploadRateWindowMinutesSource: getUploadRateWindowMinutesSource(),
    loginRateMax: getLoginRateLimitSettings().max,
    loginRateMaxSource: getLoginRateMaxSource(),
    loginRateWindowMinutes: getLoginRateLimitSettings().windowMs / (60 * 1000),
    loginRateWindowMinutesSource: getLoginRateWindowMinutesSource(),
    preserveOriginalUpload: isPreserveOriginalUpload(),
    preserveOriginalUploadSource: getPreserveOriginalUploadSource(),
    mimeTypeOptions: ALL_MIME_TYPE_OPTIONS.map(option => ({
      mime: option.mime,
      label: option.label
    }))
  }
}

export function setUploadPolicySettings(input: {
  uploadMaxFileSizeMb?: number
  allowedMimeTypes?: readonly string[]
  uploadRateIpMax?: number
  uploadRateTokenMax?: number
  uploadRateWindowMinutes?: number
  loginRateMax?: number
  loginRateWindowMinutes?: number
  preserveOriginalUpload?: boolean
}): void {
  if (input.uploadMaxFileSizeMb !== undefined) {
    setSetting(SETTINGS_UPLOAD_MAX_FILE_SIZE_MB, String(input.uploadMaxFileSizeMb))
  }
  if (input.allowedMimeTypes !== undefined) {
    setSetting(SETTINGS_ALLOWED_MIME_TYPES, serializeAllowedMimeTypes(input.allowedMimeTypes))
  }
  if (input.uploadRateIpMax !== undefined) {
    setSetting(SETTINGS_UPLOAD_RATE_IP_MAX, String(input.uploadRateIpMax))
  }
  if (input.uploadRateTokenMax !== undefined) {
    setSetting(SETTINGS_UPLOAD_RATE_TOKEN_MAX, String(input.uploadRateTokenMax))
  }
  if (input.uploadRateWindowMinutes !== undefined) {
    setSetting(SETTINGS_UPLOAD_RATE_WINDOW_MINUTES, String(input.uploadRateWindowMinutes))
  }
  if (input.loginRateMax !== undefined) {
    setSetting(SETTINGS_LOGIN_RATE_MAX, String(input.loginRateMax))
  }
  if (input.loginRateWindowMinutes !== undefined) {
    setSetting(SETTINGS_LOGIN_RATE_WINDOW_MINUTES, String(input.loginRateWindowMinutes))
  }
  if (input.preserveOriginalUpload !== undefined) {
    setSetting(
      SETTINGS_PRESERVE_ORIGINAL_UPLOAD,
      serializePreserveOriginalUpload(input.preserveOriginalUpload)
    )
  }
}

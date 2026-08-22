import type { AllowedMimeType } from './constants'

const EXT_MAP: Record<AllowedMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico'
}

export const DEFAULT_FOLDER = 'images'

/** 避免与站点路由 / 静态资源冲突 */
const RESERVED_FOLDERS = new Set([
  'api',
  'stats',
  '_nuxt',
  '__nuxt',
  'assets',
  'public',
  'favicon',
  'robots',
  'sitemap',
  'sw'
])

function generateRandomId(length = 12): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('')
}

export function mimeToExtension(mime: AllowedMimeType): string {
  return EXT_MAP[mime]
}

/** 目录名：字母数字开头，允许 - _，最长 32；不含路径分隔符 */
export function isValidFolderName(name: string): boolean {
  if (!name || typeof name !== 'string') return false
  if (name.length > 32) return false
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name)) return false
  return !RESERVED_FOLDERS.has(name.toLowerCase())
}

export function normalizeFolderName(raw: string | undefined | null): string {
  const trimmed = raw?.trim() || DEFAULT_FOLDER
  return trimmed
}

export function generateImageKey(
  contentType: AllowedMimeType,
  date = new Date(),
  prefix = DEFAULT_FOLDER
): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const id = generateRandomId(12)
  const ext = mimeToExtension(contentType)
  return `${prefix}/${year}/${month}/${id}.${ext}`
}

export function validateImageKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false
  if (key.startsWith('/')) return false
  if (key.includes('..')) return false
  if (key.includes('//')) return false

  const match = key.match(
    /^([A-Za-z0-9][A-Za-z0-9_-]*)\/\d{4}\/\d{2}\/[^/\\]+\.(jpg|jpeg|png|webp|gif|svg|ico)$/i
  )
  if (!match) return false
  return isValidFolderName(match[1]!)
}

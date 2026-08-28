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

export type StorageLayout = 'date' | 'flat'

const IMAGE_EXT_PATTERN = /\.(jpg|jpeg|png|webp|gif|svg|ico)$/i

function generateRandomId(length = 12): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('')
}

export function mimeToExtension(mime: AllowedMimeType): string {
  return EXT_MAP[mime]
}

/** 路径段：字母数字开头，允许 - _ .，最长 64 */
function isValidPathSegment(segment: string): boolean {
  if (!segment || segment.length > 64) return false
  if (segment === '.' || segment === '..') return false
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment)
}

export function generateImageKey(
  contentType: AllowedMimeType,
  date = new Date(),
  layout: StorageLayout = 'date'
): string {
  const id = generateRandomId(12)
  const ext = mimeToExtension(contentType)
  if (layout === 'flat') {
    return `${DEFAULT_FOLDER}/${id}.${ext}`
  }
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${DEFAULT_FOLDER}/${year}/${month}/${id}.${ext}`
}

export function validateImageKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false
  if (key.startsWith('/')) return false
  if (key.includes('..')) return false
  if (key.includes('//')) return false

  const parts = key.split('/')
  if (parts.length < 2 || parts.some(part => !part)) return false

  if (parts[0] !== DEFAULT_FOLDER) return false

  const filename = parts[parts.length - 1]!
  if (!IMAGE_EXT_PATTERN.test(filename)) return false

  for (let i = 1; i < parts.length - 1; i++) {
    if (!isValidPathSegment(parts[i]!)) return false
  }

  return true
}

/** 将遗留顶层目录 key（如 blog/foo.webp）映射为 images/blog/foo.webp */
export function toCanonicalImageKey(key: string): string | null {
  if (validateImageKey(key)) return key
  if (!key || key.startsWith('/') || key.includes('..') || key.includes('//')) return null

  const parts = key.split('/')
  if (parts.length < 2 || parts.some(part => !part)) return null
  if (parts[0] === DEFAULT_FOLDER) return null

  const filename = parts[parts.length - 1]!
  if (!IMAGE_EXT_PATTERN.test(filename)) return null

  for (let i = 0; i < parts.length - 1; i++) {
    if (!isValidPathSegment(parts[i]!)) return null
  }

  const canonical = `${DEFAULT_FOLDER}/${key}`
  return validateImageKey(canonical) ? canonical : null
}

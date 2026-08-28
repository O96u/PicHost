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

/** 默认目录 images 始终排在首位，其余按字母序 */
export function sortFolderNames(folders: string[]): string[] {
  const seen = new Set<string>()
  const valid: string[] = []
  for (const folder of folders) {
    if (!isValidFolderName(folder) || seen.has(folder)) continue
    seen.add(folder)
    valid.push(folder)
  }
  if (!seen.has(DEFAULT_FOLDER)) {
    valid.push(DEFAULT_FOLDER)
  }
  const rest = valid
    .filter(folder => folder !== DEFAULT_FOLDER)
    .sort((a, b) => a.localeCompare(b))
  return [DEFAULT_FOLDER, ...rest]
}

export function generateImageKey(
  contentType: AllowedMimeType,
  date = new Date(),
  prefix = DEFAULT_FOLDER,
  layout: StorageLayout = 'date'
): string {
  const id = generateRandomId(12)
  const ext = mimeToExtension(contentType)
  if (layout === 'flat') {
    return `${prefix}/${id}.${ext}`
  }
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${prefix}/${year}/${month}/${id}.${ext}`
}

export function validateImageKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false
  if (key.startsWith('/')) return false
  if (key.includes('..')) return false
  if (key.includes('//')) return false

  const parts = key.split('/')
  if (parts.length < 2 || parts.some(part => !part)) return false

  const folder = parts[0]!
  if (!isValidFolderName(folder)) return false

  const filename = parts[parts.length - 1]!
  if (!IMAGE_EXT_PATTERN.test(filename)) return false

  if (parts.length === 2) {
    return true
  }

  if (parts.length === 4) {
    const year = parts[1]!
    const month = parts[2]!
    return /^\d{4}$/.test(year) && /^\d{2}$/.test(month)
  }

  return false
}

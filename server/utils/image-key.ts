import type { AllowedMimeType } from './constants'

const EXT_MAP: Record<AllowedMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
}

function generateRandomId(length = 12): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('')
}

export function mimeToExtension(mime: AllowedMimeType): string {
  return EXT_MAP[mime]
}

export function generateImageKey(
  contentType: AllowedMimeType,
  date = new Date()
): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const id = generateRandomId(12)
  const ext = mimeToExtension(contentType)
  return `images/${year}/${month}/${id}.${ext}`
}

export function validateImageKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false
  if (key.startsWith('/')) return false
  if (key.includes('..')) return false
  if (!key.startsWith('images/')) return false
  if (key.includes('//')) return false
  // images/YYYY/MM/文件名.ext（允许历史文件名中的 - _ .，仍禁止路径穿越）
  return /^images\/\d{4}\/\d{2}\/[^/\\]+\.(jpg|jpeg|png|webp|gif)$/i.test(key)
}

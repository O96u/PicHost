import { basename } from 'node:path'
import { DEFAULT_FOLDER, validateImageKey } from './image-key'

/** 存储 key → 对外 URL 路径（不含域名） */
export function storageKeyToPublicPath(key: string): string {
  const prefix = `${DEFAULT_FOLDER}/`
  if (key.startsWith(prefix)) return key.slice(prefix.length)
  return key
}

/**
 * 对外 URL 路径：
 * - hideFolder=true：仅文件名（img.com/a8K3xP.webp）
 * - hideFolder=false：去掉内部 images/ 前缀（img.com/2026/08/a.webp）
 */
export function toPublicImagePath(key: string, hideFolder: boolean): string {
  if (hideFolder) return basename(key)
  return storageKeyToPublicPath(key)
}

/** 公开相对路径 → 存储 key；legacy 完整 key（含 images/）仍接受 */
export function toStorageKeyFromPublicPath(publicPath: string): string | null {
  const raw = publicPath.replace(/^\/+/, '')
  if (!raw) return null
  if (validateImageKey(raw)) return raw
  const candidate = `${DEFAULT_FOLDER}/${raw}`
  return validateImageKey(candidate) ? candidate : null
}

const HIDDEN_DATE_PATH_PATTERN
  = /^\d{4}\/\d{2}\/[^/\\]+\.(jpg|jpeg|png|webp|gif|svg|ico)$/i

const BARE_FILENAME_PATTERN
  = /^[^/\\]+\.(jpg|jpeg|png|webp|gif|svg|ico)$/i

export function isHiddenImageDatePath(path: string): boolean {
  return HIDDEN_DATE_PATH_PATTERN.test(path)
}

export function isBareImageFilename(path: string): boolean {
  return BARE_FILENAME_PATTERN.test(path)
}

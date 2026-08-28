import { basename } from 'node:path'

/** 对外 URL 路径：可选隐藏目录前缀（输出纯文件名） */
export function toPublicImagePath(key: string, hideFolder: boolean): string {
  if (!hideFolder) return key
  return basename(key)
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

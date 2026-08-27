/** 对外 URL 路径：可选去掉 key 的首段目录（如 images/） */
export function toPublicImagePath(key: string, hideFolder: boolean): string {
  if (!hideFolder) return key
  const slash = key.indexOf('/')
  return slash > 0 ? key.slice(slash + 1) : key
}

const HIDDEN_DATE_PATH_PATTERN
  = /^\d{4}\/\d{2}\/[^/\\]+\.(jpg|jpeg|png|webp|gif|svg|ico)$/i

export function isHiddenImageDatePath(path: string): boolean {
  return HIDDEN_DATE_PATH_PATTERN.test(path)
}

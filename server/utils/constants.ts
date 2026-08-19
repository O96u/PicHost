export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

export const MAX_FILE_SIZE = 10 * 1024 * 1024
export const MAX_FILES_PER_UPLOAD = 10
export const MAX_DELETE_BATCH = 100
export const DEFAULT_LIST_LIMIT = 30
export const MAX_LIST_LIMIT = 100

export const IMAGE_CACHE_CONTROL
  = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400'

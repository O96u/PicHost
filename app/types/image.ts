export type ErrorCode
  = | 'UNAUTHORIZED'
    | 'INVALID_REQUEST'
    | 'TOO_MANY_FILES'
    | 'FILE_TOO_LARGE'
    | 'UNSUPPORTED_FILE_TYPE'
    | 'INVALID_FILE_SIGNATURE'
    | 'INVALID_IMAGE_KEY'
    | 'IMAGE_NOT_FOUND'
    | 'UPLOAD_FAILED'
    | 'DELETE_FAILED'
    | 'R2_ERROR'
    | 'PURGE_FAILED'

export interface ApiError {
  code: ErrorCode
  message: string
}

export interface ApiErrorResponse {
  success: false
  error: ApiError
}

export interface ImageItem {
  key: string
  url: string
  originalName: string
  contentType: string
  size: number
  uploadedAt: string
  markdown: string
  html: string
}

export interface UploadErrorItem {
  name: string
  error: ApiError
}

export interface UploadResponse {
  success: boolean
  items: ImageItem[]
  errors: UploadErrorItem[]
}

export interface ImageListResponse {
  items: ImageItem[]
  cursor?: string
  truncated: boolean
}

export interface DeleteResponse {
  success: boolean
}

export interface BatchDeleteResponse {
  success: boolean
  deleted: string[]
  failed: Array<{ key: string, error: ApiError }>
}

export interface UploadProgressItem {
  name: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

import type { Readable } from 'node:stream'

export interface StoredImageMeta {
  originalName: string
  uploadedAt: string
  contentType: string
  size: number
  userId?: number | null
}

export interface StoredImage extends StoredImageMeta {
  key: string
  mtimeMs: number
  backendId?: string
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface FolderStorageStat {
  folder: string
  count: number
  bytes: number
}

export type StorageBackendType = 'local' | 's3'
export type ServingMode = 'proxy' | 'public'

export interface S3BackendConfig {
  endpoint: string
  region: string
  bucket: string
  prefix?: string
  forcePathStyle?: boolean
}

export interface S3BackendSecrets {
  accessKeyId: string
  secretAccessKey: string
}

export interface StorageBackendRow {
  id: string
  name: string
  type: StorageBackendType
  config_json: string
  secret_json: string
  serving_mode: ServingMode
  public_url: string
  quota_bytes: number | null
  enabled: number
  is_default: number
  sort_order: number
}

export interface StorageBackendInfo {
  id: string
  name: string
  type: StorageBackendType
  config: S3BackendConfig | Record<string, never>
  servingMode: ServingMode
  publicUrl: string
  quotaBytes: number | null
  enabled: boolean
  isDefault: boolean
  sortOrder: number
}

export interface StorageBackend {
  readonly id: string
  readonly type: StorageBackendType
  readonly servingMode: ServingMode
  readonly publicUrl: string
  put(key: string, bytes: Uint8Array, meta: StoredImageMeta): Promise<void>
  head(key: string): Promise<StoredImage | null>
  delete(key: string): Promise<void>
  createStream(key: string, range?: { start: number, end: number }): Promise<Readable>
  testConnection(): Promise<{ ok: boolean, message: string }>
  getUsageStats(): Promise<{ count: number, bytes: number }>
}

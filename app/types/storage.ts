export type ServingMode = 'proxy' | 'public'

export interface StorageCapacity {
  totalBytes: number | null
  usedBytes: number
  freeBytes: number | null
  percent: number | null
  source: 'disk' | 'quota'
}

export interface StorageBackendItem {
  id: string
  name: string
  type: 'local' | 's3'
  config: {
    endpoint?: string
    region?: string
    bucket?: string
    prefix?: string
    forcePathStyle?: boolean
  }
  secretsMasked: {
    accessKeyId?: string
    secretAccessKey?: string
  }
  servingMode: ServingMode
  publicUrl: string
  quotaBytes: number | null
  enabled: boolean
  isDefault: boolean
  usage: { count: number, bytes: number }
  capacity: StorageCapacity
}

export interface StorageListResponse {
  backends: StorageBackendItem[]
  activeBackendId: string
  envOverride: boolean
}

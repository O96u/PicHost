import {
  createBackendFromEnv,
  createBackendInstance,
  getBackendIdForKey,
  getDefaultBackendRow,
  getStorageBackendRow,
  LOCAL_BACKEND_ID,
  ensureDefaultBackends
} from '../storage-backends'
import type { StorageBackend, StorageBackendRow } from './types'

export async function getActiveBackend(): Promise<StorageBackend> {
  const fromEnv = createBackendFromEnv()
  if (fromEnv) return fromEnv

  ensureDefaultBackends()
  const row = getDefaultBackendRow()
  if (!row) {
    return createBackendInstance({
      id: LOCAL_BACKEND_ID,
      name: '本地磁盘',
      type: 'local',
      config_json: '{}',
      secret_json: '{}',
      serving_mode: 'proxy',
      public_url: '',
      quota_bytes: null,
      enabled: 1,
      is_default: 1,
      sort_order: 0
    })
  }

  return createBackendInstance(row)
}

export async function getBackendForKey(key: string): Promise<StorageBackend> {
  const fromEnv = createBackendFromEnv()
  if (fromEnv) return fromEnv

  ensureDefaultBackends()
  const backendId = getBackendIdForKey(key) ?? LOCAL_BACKEND_ID
  const row = getStorageBackendRow(backendId)

  if (!row || !row.enabled) {
    return createBackendInstance(fallbackLocalRow())
  }

  try {
    return createBackendInstance(row)
  } catch {
    return createBackendInstance(fallbackLocalRow())
  }
}

export function getActiveBackendRow(): StorageBackendRow | null {
  const fromEnv = createBackendFromEnv()
  if (fromEnv) {
    return {
      id: fromEnv.id,
      name: 'S3 (环境变量)',
      type: 's3',
      config_json: '{}',
      secret_json: '{}',
      serving_mode: fromEnv.servingMode,
      public_url: fromEnv.publicUrl,
      quota_bytes: null,
      enabled: 1,
      is_default: 1,
      sort_order: 0
    }
  }

  ensureDefaultBackends()
  return getDefaultBackendRow()
}

export async function getBackendRowForKey(key: string): Promise<StorageBackendRow> {
  const fromEnv = createBackendFromEnv()
  if (fromEnv) {
    return {
      id: fromEnv.id,
      name: 'S3 (环境变量)',
      type: 's3',
      config_json: '{}',
      secret_json: '{}',
      serving_mode: fromEnv.servingMode,
      public_url: fromEnv.publicUrl,
      quota_bytes: null,
      enabled: 1,
      is_default: 1,
      sort_order: 0
    }
  }

  ensureDefaultBackends()
  const backendId = getBackendIdForKey(key) ?? LOCAL_BACKEND_ID
  return getStorageBackendRow(backendId) ?? fallbackLocalRow()
}

function fallbackLocalRow(): StorageBackendRow {
  return {
    id: LOCAL_BACKEND_ID,
    name: '本地磁盘',
    type: 'local',
    config_json: '{}',
    secret_json: '{}',
    serving_mode: 'proxy',
    public_url: '',
    quota_bytes: null,
    enabled: 1,
    is_default: 1,
    sort_order: 0
  }
}

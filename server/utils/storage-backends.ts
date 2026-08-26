import type { DatabaseSync } from 'node:sqlite'
import { getDb } from './db'
import { LocalStorageBackend } from './storage/local'
import {
  parseS3Config,
  parseS3Secrets,
  S3StorageBackend
} from './storage/s3'
import type {
  S3BackendConfig,
  ServingMode,
  StorageBackendInfo,
  StorageBackendRow,
  StorageBackendType
} from './storage/types'

export const LOCAL_BACKEND_ID = 'local'
export const S3_BACKEND_ID = 's3-primary'

function migrateStorageTables(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS storage_backends (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('local', 's3')),
      config_json TEXT NOT NULL DEFAULT '{}',
      secret_json TEXT NOT NULL DEFAULT '{}',
      serving_mode TEXT NOT NULL DEFAULT 'proxy' CHECK(serving_mode IN ('proxy', 'public')),
      public_url TEXT NOT NULL DEFAULT '',
      quota_bytes INTEGER,
      enabled INTEGER NOT NULL DEFAULT 1,
      is_default INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS images (
      key TEXT PRIMARY KEY,
      backend_id TEXT NOT NULL,
      user_id INTEGER,
      folder TEXT NOT NULL,
      original_name TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY (backend_id) REFERENCES storage_backends(id)
    );
    CREATE INDEX IF NOT EXISTS idx_images_uploaded_at ON images(uploaded_at DESC);
    CREATE INDEX IF NOT EXISTS idx_images_backend_id ON images(backend_id);
    CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);
    CREATE INDEX IF NOT EXISTS idx_images_folder ON images(folder);
  `)
}

export function ensureStorageSchema(): void {
  migrateStorageTables(getDb())
}

export function ensureDefaultBackends(): void {
  ensureStorageSchema()
  const db = getDb()

  const local = db.prepare(`
    SELECT id FROM storage_backends WHERE id = ?
  `).get(LOCAL_BACKEND_ID)

  if (!local) {
    db.prepare(`
      INSERT INTO storage_backends
        (id, name, type, config_json, secret_json, serving_mode, public_url,
         quota_bytes, enabled, is_default, sort_order)
      VALUES (?, ?, 'local', '{}', '{}', 'proxy', '', NULL, 1, 1, 0)
    `).run(LOCAL_BACKEND_ID, '本地磁盘')
  }

  const s3 = db.prepare(`
    SELECT id FROM storage_backends WHERE id = ?
  `).get(S3_BACKEND_ID)

  if (!s3) {
    db.prepare(`
      INSERT INTO storage_backends
        (id, name, type, config_json, secret_json, serving_mode, public_url,
         quota_bytes, enabled, is_default, sort_order)
      VALUES (?, ?, 's3', '{}', '{}', 'proxy', '', NULL, 0, 0, 1)
    `).run(S3_BACKEND_ID, 'S3 兼容存储')
  }
}

function rowToInfo(row: StorageBackendRow, _maskSecrets = true): StorageBackendInfo & {
  secretsMasked: Record<string, string>
} {
  const config = row.type === 's3'
    ? (parseS3Config(row.config_json) ?? {})
    : {}
  let secretsMasked: Record<string, string> = {}
  if (row.type === 's3') {
    const secrets = parseS3Secrets(row.secret_json)
    secretsMasked = {
      accessKeyId: secrets?.accessKeyId
        ? maskSecret(secrets.accessKeyId)
        : '',
      secretAccessKey: secrets?.secretAccessKey
        ? maskSecret(secrets.secretAccessKey)
        : ''
    }
  }

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    config,
    servingMode: row.serving_mode,
    publicUrl: row.public_url,
    quotaBytes: row.quota_bytes,
    enabled: row.enabled === 1,
    isDefault: row.is_default === 1,
    sortOrder: row.sort_order,
    secretsMasked
  }
}

function maskSecret(value: string): string {
  if (value.length <= 4) return '****'
  return `${value.slice(0, 4)}${'*'.repeat(Math.min(8, value.length - 4))}`
}

export function listStorageBackendRows(): StorageBackendRow[] {
  ensureDefaultBackends()
  return getDb().prepare(`
    SELECT id, name, type, config_json, secret_json, serving_mode, public_url,
           quota_bytes, enabled, is_default, sort_order
    FROM storage_backends
    ORDER BY sort_order ASC, id ASC
  `).all() as unknown as StorageBackendRow[]
}

export function listStorageBackends(maskSecrets = true): Array<StorageBackendInfo & {
  secretsMasked: Record<string, string>
}> {
  return listStorageBackendRows().map(row => rowToInfo(row, maskSecrets))
}

export function getStorageBackendRow(id: string): StorageBackendRow | null {
  ensureDefaultBackends()
  const row = getDb().prepare(`
    SELECT id, name, type, config_json, secret_json, serving_mode, public_url,
           quota_bytes, enabled, is_default, sort_order
    FROM storage_backends
    WHERE id = ?
  `).get(id) as StorageBackendRow | undefined
  return row ?? null
}

export function getDefaultBackendRow(): StorageBackendRow | null {
  ensureDefaultBackends()
  const row = getDb().prepare(`
    SELECT id, name, type, config_json, secret_json, serving_mode, public_url,
           quota_bytes, enabled, is_default, sort_order
    FROM storage_backends
    WHERE is_default = 1 AND enabled = 1
    LIMIT 1
  `).get() as StorageBackendRow | undefined
  return row ?? null
}

export function getBackendIdForKey(key: string): string | null {
  ensureStorageSchema()
  const row = getDb().prepare(`
    SELECT backend_id FROM images WHERE key = ?
  `).get(key) as { backend_id: string } | undefined
  return row?.backend_id ?? null
}

export function setDefaultBackend(id: string): void {
  const db = getDb()
  db.exec('UPDATE storage_backends SET is_default = 0')
  db.prepare(`
    UPDATE storage_backends SET is_default = 1, enabled = 1 WHERE id = ?
  `).run(id)
}

export interface StorageBackendPatch {
  name?: string
  config?: Record<string, unknown>
  secrets?: { accessKeyId?: string, secretAccessKey?: string }
  servingMode?: ServingMode
  publicUrl?: string
  quotaBytes?: number | null
  enabled?: boolean
  isDefault?: boolean
}

export function updateStorageBackend(id: string, patch: StorageBackendPatch): void {
  const row = getStorageBackendRow(id)
  if (!row) {
    throw new Error(`Storage backend not found: ${id}`)
  }

  const name = patch.name ?? row.name
  let configJson = row.config_json
  let secretJson = row.secret_json

  if (patch.config !== undefined) {
    const current = row.type === 's3'
      ? (parseS3Config(row.config_json) ?? {})
      : {}
    configJson = JSON.stringify({ ...current, ...patch.config })
  }

  if (patch.secrets !== undefined && row.type === 's3') {
    const current = parseS3Secrets(row.secret_json) ?? {
      accessKeyId: '',
      secretAccessKey: ''
    }
    const next = {
      accessKeyId: patch.secrets.accessKeyId?.trim()
        ? patch.secrets.accessKeyId.trim()
        : current.accessKeyId,
      secretAccessKey: patch.secrets.secretAccessKey?.trim()
        ? patch.secrets.secretAccessKey.trim()
        : current.secretAccessKey
    }
    secretJson = JSON.stringify(next)
  }

  const servingMode = patch.servingMode ?? row.serving_mode
  const publicUrl = patch.publicUrl ?? row.public_url
  const quotaBytes = patch.quotaBytes !== undefined
    ? patch.quotaBytes
    : row.quota_bytes
  const enabled = patch.enabled !== undefined
    ? (patch.enabled ? 1 : 0)
    : row.enabled

  getDb().prepare(`
    UPDATE storage_backends
    SET name = ?, config_json = ?, secret_json = ?, serving_mode = ?,
        public_url = ?, quota_bytes = ?, enabled = ?
    WHERE id = ?
  `).run(name, configJson, secretJson, servingMode, publicUrl, quotaBytes, enabled, id)

  if (patch.isDefault) {
    setDefaultBackend(id)
  }
}

export function isStorageEnvConfigured(): boolean {
  return getStorageBackendFromEnv() !== null
}

export function getStorageBackendFromEnv(): {
  type: StorageBackendType
  config: Record<string, unknown>
  secrets: { accessKeyId: string, secretAccessKey: string }
  servingMode: ServingMode
  publicUrl: string
} | null {
  const backendType = process.env.STORAGE_BACKEND?.trim()
  if (backendType !== 's3') return null

  const endpoint = process.env.S3_ENDPOINT?.trim() ?? ''
  const region = process.env.S3_REGION?.trim() ?? ''
  const bucket = process.env.S3_BUCKET?.trim() ?? ''
  const accessKeyId = process.env.S3_ACCESS_KEY?.trim() ?? ''
  const secretAccessKey = process.env.S3_SECRET_KEY?.trim() ?? ''

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null
  }

  return {
    type: 's3',
    config: {
      endpoint,
      region: region || 'auto',
      bucket,
      prefix: process.env.S3_PREFIX?.trim() || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true'
    },
    secrets: { accessKeyId, secretAccessKey },
    servingMode: process.env.S3_PUBLIC_URL?.trim() ? 'public' : 'proxy',
    publicUrl: process.env.S3_PUBLIC_URL?.trim() ?? ''
  }
}

export function createBackendInstance(row: StorageBackendRow) {
  if (row.type === 'local') {
    return new LocalStorageBackend(
      row.id,
      row.serving_mode,
      row.public_url
    )
  }

  const config = parseS3Config(row.config_json)
  const secrets = parseS3Secrets(row.secret_json)
  if (!config || !secrets) {
    throw new Error(`Invalid S3 configuration for backend ${row.id}`)
  }

  return new S3StorageBackend(
    row.id,
    config,
    secrets,
    row.serving_mode,
    row.public_url
  )
}

export function createBackendFromEnv() {
  const env = getStorageBackendFromEnv()
  if (!env) return null

  return new S3StorageBackend(
    S3_BACKEND_ID,
    env.config as unknown as S3BackendConfig,
    env.secrets,
    env.servingMode,
    env.publicUrl
  )
}

export function getBackendUsageStats(backendId: string): { count: number, bytes: number } {
  ensureStorageSchema()
  const row = getDb().prepare(`
    SELECT COUNT(*) AS count, COALESCE(SUM(size), 0) AS bytes
    FROM images
    WHERE backend_id = ?
  `).get(backendId) as { count: number, bytes: number }
  return { count: row.count, bytes: row.bytes }
}

function getNextSortOrder(): number {
  const row = getDb().prepare(`
    SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM storage_backends
  `).get() as { max_order: number }
  return row.max_order + 1
}

export function generateStorageBackendId(): string {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  const suffix = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `s3-${suffix}`
}

export function insertStorageBackend(input: {
  id?: string
  name: string
  config: S3BackendConfig
  secrets: { accessKeyId: string, secretAccessKey: string }
  servingMode?: ServingMode
  publicUrl?: string
  quotaBytes?: number | null
  enabled?: boolean
  isDefault?: boolean
}): string {
  ensureDefaultBackends()
  const id = input.id ?? generateStorageBackendId()
  const sortOrder = getNextSortOrder()

  getDb().prepare(`
    INSERT INTO storage_backends
      (id, name, type, config_json, secret_json, serving_mode, public_url,
       quota_bytes, enabled, is_default, sort_order)
    VALUES (?, ?, 's3', ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    id,
    input.name,
    JSON.stringify(input.config),
    JSON.stringify(input.secrets),
    input.servingMode ?? 'proxy',
    input.publicUrl ?? '',
    input.quotaBytes ?? null,
    input.enabled === false ? 0 : 1,
    sortOrder
  )

  if (input.isDefault) {
    setDefaultBackend(id)
  }

  return id
}

export function deleteStorageBackend(id: string): void {
  if (id === LOCAL_BACKEND_ID) {
    throw new Error('Cannot delete local backend')
  }

  const usage = getBackendUsageStats(id)
  if (usage.count > 0) {
    throw new Error('Cannot delete backend with stored images')
  }

  const row = getStorageBackendRow(id)
  if (!row) {
    throw new Error(`Storage backend not found: ${id}`)
  }

  if (row.is_default) {
    throw new Error('Cannot delete the default backend')
  }

  getDb().prepare('DELETE FROM storage_backends WHERE id = ?').run(id)
}

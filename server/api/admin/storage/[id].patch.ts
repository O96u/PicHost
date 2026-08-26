import { requireAdminAuth } from '../../../utils/access'
import { createApiError } from '../../../utils/api-error'
import {
  isStorageEnvConfigured,
  LOCAL_BACKEND_ID,
  updateStorageBackend,
  getStorageBackendRow,
  setDefaultBackend,
  type StorageBackendPatch
} from '../../../utils/storage-backends'
import { parseS3Config, validateS3Config } from '../../../utils/storage/s3'
import { parseQuotaBytes } from '../../../utils/storage-capacity'
import type { ServingMode } from '../../../utils/storage/types'

interface StoragePatchBody {
  name?: string
  config?: {
    endpoint?: string
    region?: string
    bucket?: string
    prefix?: string
    forcePathStyle?: boolean
  }
  secrets?: {
    accessKeyId?: string
    secretAccessKey?: string
  }
  servingMode?: ServingMode
  publicUrl?: string
  quotaBytes?: number | null
  enabled?: boolean
  isDefault?: boolean
}

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  if (isStorageEnvConfigured()) {
    createApiError(event, 'FORBIDDEN', '存储配置已由环境变量覆盖，无法在后台修改', 409)
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    createApiError(event, 'INVALID_REQUEST', '缺少存储后端 ID', 400)
  }

  const row = getStorageBackendRow(id)
  if (!row) {
    createApiError(event, 'INVALID_REQUEST', '存储后端不存在', 404)
  }

  const body = await readBody<StoragePatchBody>(event).catch(
    (): StoragePatchBody => ({})
  )

  if (id === LOCAL_BACKEND_ID && body.isDefault === false) {
    createApiError(event, 'INVALID_REQUEST', '必须保留一个默认存储后端', 400)
  }

  const patch: StorageBackendPatch = {}

  if (body.name !== undefined) {
    patch.name = body.name.trim() || row.name
  }

  if (body.config !== undefined && row.type === 's3') {
    const current = parseS3Config(row.config_json) ?? {
      endpoint: '',
      region: 'auto',
      bucket: ''
    }
    const next = {
      endpoint: body.config.endpoint?.trim() ?? current.endpoint,
      region: body.config.region?.trim() ?? current.region,
      bucket: body.config.bucket?.trim() ?? current.bucket,
      prefix: body.config.prefix?.trim() || undefined,
      forcePathStyle: body.config.forcePathStyle ?? current.forcePathStyle
    }
    const error = validateS3Config(next)
    if (error) {
      createApiError(event, 'INVALID_REQUEST', error, 400)
    }
    patch.config = next
  }

  if (body.secrets !== undefined && row.type === 's3') {
    patch.secrets = body.secrets
  }

  if (body.servingMode !== undefined) {
    if (body.servingMode !== 'proxy' && body.servingMode !== 'public') {
      createApiError(event, 'INVALID_REQUEST', '访问方式无效', 400)
    }
    patch.servingMode = body.servingMode
  }

  if (body.publicUrl !== undefined) {
    patch.publicUrl = body.publicUrl.trim()
  }

  if (body.quotaBytes !== undefined) {
    if (row.type === 's3') {
      const quotaBytes = parseQuotaBytes(body.quotaBytes)
      if (!quotaBytes) {
        createApiError(event, 'INVALID_REQUEST', '请填写有效的存储套餐总量', 400)
      }
      patch.quotaBytes = quotaBytes
    }
  }

  if (body.enabled !== undefined) {
    if (id === LOCAL_BACKEND_ID && !body.enabled) {
      createApiError(event, 'INVALID_REQUEST', '本地磁盘后端不可停用', 400)
    }
    patch.enabled = body.enabled
  }

  if (body.isDefault !== undefined) {
    patch.isDefault = body.isDefault
  }

  updateStorageBackend(id, patch)

  if (body.isDefault) {
    setDefaultBackend(id)
  }

  return { success: true }
})

import { requireAdminAuth } from '../../../utils/access'
import { createApiError } from '../../../utils/api-error'
import {
  insertStorageBackend,
  isStorageEnvConfigured
} from '../../../utils/storage-backends'
import { validateS3Config } from '../../../utils/storage/s3'
import { parseQuotaBytes } from '../../../utils/storage-capacity'
import type { ServingMode } from '../../../utils/storage/types'

interface StorageCreateBody {
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

  const body = await readBody<StorageCreateBody>(event).catch(
    (): StorageCreateBody => ({})
  )

  const name = body.name?.trim() || 'S3 兼容存储'
  const config = {
    endpoint: body.config?.endpoint?.trim() ?? '',
    region: body.config?.region?.trim() || 'auto',
    bucket: body.config?.bucket?.trim() ?? '',
    prefix: body.config?.prefix?.trim() || undefined,
    forcePathStyle: body.config?.forcePathStyle ?? false
  }

  const error = validateS3Config(config)
  if (error) {
    createApiError(event, 'INVALID_REQUEST', error, 400)
  }

  const accessKeyId = body.secrets?.accessKeyId?.trim() ?? ''
  const secretAccessKey = body.secrets?.secretAccessKey?.trim() ?? ''
  if (!accessKeyId || !secretAccessKey) {
    createApiError(event, 'INVALID_REQUEST', 'Access Key 与 Secret Key 不能为空', 400)
  }

  if (body.servingMode && body.servingMode !== 'proxy' && body.servingMode !== 'public') {
    createApiError(event, 'INVALID_REQUEST', '访问方式无效', 400)
  }

  const quotaBytes = parseQuotaBytes(body.quotaBytes)
  if (!quotaBytes) {
    createApiError(event, 'INVALID_REQUEST', '请填写有效的存储套餐总量', 400)
  }

  const id = insertStorageBackend({
    name,
    config,
    secrets: { accessKeyId, secretAccessKey },
    servingMode: body.servingMode,
    publicUrl: body.publicUrl?.trim(),
    quotaBytes,
    enabled: body.enabled,
    isDefault: body.isDefault
  })

  return { success: true, id }
})

import { requireAdminAuth } from '../../../utils/access'
import { createApiError } from '../../../utils/api-error'
import {
  insertStorageBackend,
  insertTelegramBackend,
  isStorageEnvConfigured
} from '../../../utils/storage-backends'
import { validateS3Config } from '../../../utils/storage/s3'
import {
  validateTelegramConfig,
  validateApiProxyUrl
} from '../../../utils/storage/telegram'
import { parseQuotaBytes } from '../../../utils/storage-capacity'
import type { ServingMode } from '../../../utils/storage/types'

interface StorageCreateBody {
  type?: 's3' | 'telegram'
  name?: string
  provider?: string
  config?: {
    endpoint?: string
    region?: string
    bucket?: string
    prefix?: string
    forcePathStyle?: boolean
    chatId?: string
    apiProxyUrl?: string
  }
  secrets?: {
    accessKeyId?: string
    secretAccessKey?: string
    botToken?: string
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

  const backendType = body.type === 'telegram' ? 'telegram' : 's3'

  if (backendType === 'telegram') {
    const name = body.name?.trim() || 'Telegram 频道'
    const chatId = body.config?.chatId?.trim() ?? ''
    const apiProxyUrl = body.config?.apiProxyUrl?.trim() ?? ''
    const botToken = body.secrets?.botToken?.trim() ?? ''

    if (!chatId || !botToken) {
      createApiError(event, 'INVALID_REQUEST', 'Bot Token 与 Chat ID 不能为空', 400)
    }

    const config = {
      chatId,
      apiProxyUrl: apiProxyUrl || undefined
    }
    const configError = validateTelegramConfig(config)
    if (configError) {
      createApiError(event, 'INVALID_REQUEST', configError, 400)
    }
    if (apiProxyUrl) {
      const proxyError = validateApiProxyUrl(apiProxyUrl)
      if (proxyError) {
        createApiError(event, 'INVALID_REQUEST', proxyError, 400)
      }
    }

    const quotaBytes = parseQuotaBytes(body.quotaBytes)
    if (!quotaBytes) {
      createApiError(event, 'INVALID_REQUEST', '请填写有效的存储套餐总量', 400)
    }

    const id = insertTelegramBackend({
      name,
      config,
      secrets: { botToken },
      quotaBytes,
      enabled: body.enabled,
      isDefault: body.isDefault
    })

    return { success: true, id }
  }

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
    provider: body.provider?.trim(),
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

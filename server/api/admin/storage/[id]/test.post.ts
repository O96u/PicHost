import { requireAdminAuth } from '../../../../utils/access'
import { createApiError } from '../../../../utils/api-error'
import {
  createBackendInstance,
  getStorageBackendRow,
  isStorageEnvConfigured
} from '../../../../utils/storage-backends'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  if (isStorageEnvConfigured()) {
    createApiError(event, 'FORBIDDEN', '存储配置已由环境变量覆盖，无法在后台测试', 409)
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    createApiError(event, 'INVALID_REQUEST', '缺少存储后端 ID', 400)
  }

  const row = getStorageBackendRow(id)
  if (!row) {
    createApiError(event, 'INVALID_REQUEST', '存储后端不存在', 404)
  }

  try {
    const backend = createBackendInstance(row)
    const result = await backend.testConnection()
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : '连接失败'
    return { ok: false, message }
  }
})

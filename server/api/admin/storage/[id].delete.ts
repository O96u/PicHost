import { requireAdminAuth } from '../../../utils/access'
import { createApiError } from '../../../utils/api-error'
import {
  deleteStorageBackend,
  isStorageEnvConfigured,
  LOCAL_BACKEND_ID
} from '../../../utils/storage-backends'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  if (isStorageEnvConfigured()) {
    createApiError(event, 'FORBIDDEN', '存储配置已由环境变量覆盖，无法在后台修改', 409)
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    createApiError(event, 'INVALID_REQUEST', '缺少存储后端 ID', 400)
  }

  if (id === LOCAL_BACKEND_ID) {
    createApiError(event, 'INVALID_REQUEST', '本地磁盘后端不可删除', 400)
  }

  try {
    deleteStorageBackend(id)
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除失败'
    if (message.includes('stored images')) {
      createApiError(event, 'INVALID_REQUEST', '该后端仍有图片，无法删除', 400)
    }
    if (message.includes('default backend')) {
      createApiError(event, 'INVALID_REQUEST', '请先切换默认后端后再删除', 400)
    }
    createApiError(event, 'INVALID_REQUEST', message, 400)
  }

  return { success: true }
})

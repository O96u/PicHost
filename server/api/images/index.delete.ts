import type { DeleteResponse } from '~/types/image'
import { requireApiOrAdminAuth, assertImageOwnership, resolveActivitySource } from '../../utils/access'
import { createApiError } from '../../utils/api-error'
import { insertActivityLog } from '../../utils/db'
import { validateImageKey } from '../../utils/image-key'
import { deleteImage, headImage } from '../../utils/storage'
import { logInfo } from '../../utils/logger'

interface DeleteBody {
  key?: string
}

export default defineEventHandler(async (event) => {
  try {
    await requireApiOrAdminAuth(event)

    const query = getQuery(event)
    const body = await readBody<DeleteBody>(event).catch(() => null)
    const key = (typeof query.key === 'string' ? query.key : undefined)
      ?? body?.key

    if (!key || !validateImageKey(key)) {
      createApiError(event, 'INVALID_IMAGE_KEY', '无效的图片路径', 400)
    }

    const existing = await headImage(key)
    if (!existing) {
      createApiError(event, 'IMAGE_NOT_FOUND', '图片不存在', 404)
    }

    await assertImageOwnership(event, existing.userId)

    try {
      await deleteImage(key)
    } catch {
      createApiError(event, 'DELETE_FAILED', '删除失败', 500)
    }

    insertActivityLog({
      action: 'delete',
      key,
      originalName: existing.originalName,
      size: existing.size,
      contentType: existing.contentType,
      source: resolveActivitySource(event)
    })

    logInfo('delete success', { key, size: existing.size })

    const response: DeleteResponse = { success: true }
    return response
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    createApiError(event, 'DELETE_FAILED', '删除失败', 500)
  }
})

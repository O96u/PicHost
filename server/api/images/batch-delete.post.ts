import type { BatchDeleteResponse } from '~/types/image'
import { requireApiOrAdminAuth, assertImageOwnership, resolveActivitySource } from '../../utils/access'
import { createApiError } from '../../utils/api-error'
import { MAX_DELETE_BATCH } from '../../utils/constants'
import { insertActivityLog } from '../../utils/db'
import { validateImageKey } from '../../utils/image-key'
import { deleteImage, headImage } from '../../utils/storage'
import { logInfo } from '../../utils/logger'

interface BatchDeleteBody {
  keys?: string[]
}

// POST 版本：避免部分环境下 DELETE 请求体丢失
export default defineEventHandler(async (event) => {
  try {
    await requireApiOrAdminAuth(event)

    const body = await readBody<BatchDeleteBody>(event)
    const keys = body?.keys

    if (!Array.isArray(keys) || !keys.length) {
      createApiError(event, 'INVALID_REQUEST', '请提供要删除的图片列表', 400)
    }

    if (keys.length > MAX_DELETE_BATCH) {
      createApiError(
        event,
        'INVALID_REQUEST',
        `每次最多删除 ${MAX_DELETE_BATCH} 张图片`,
        400
      )
    }

    for (const key of keys) {
      if (!validateImageKey(key)) {
        createApiError(event, 'INVALID_IMAGE_KEY', `无效的图片路径: ${key}`, 400)
      }
    }

    const deleted: string[] = []
    const failed: BatchDeleteResponse['failed'] = []

    for (const key of keys) {
      try {
        const existing = await headImage(key)

        if (!existing) {
          failed.push({
            key,
            error: { code: 'IMAGE_NOT_FOUND', message: '图片不存在' }
          })
          continue
        }

        try {
          await assertImageOwnership(event, existing.userId)
        } catch {
          failed.push({
            key,
            error: { code: 'FORBIDDEN', message: '无权操作此图片' }
          })
          continue
        }

        await deleteImage(key)
        deleted.push(key)

        insertActivityLog({
          action: 'delete',
          key,
          originalName: existing.originalName,
          size: existing.size,
          contentType: existing.contentType,
          source: resolveActivitySource(event),
          userId: existing.userId ?? null,
          backendId: existing.backendId ?? null
        })

        logInfo('delete success', { key, size: existing.size })
      } catch {
        failed.push({
          key,
          error: { code: 'DELETE_FAILED', message: '删除失败' }
        })
      }
    }

    const response: BatchDeleteResponse = {
      success: failed.length === 0,
      deleted,
      failed
    }

    if (!deleted.length && failed.length) {
      setResponseStatus(event, 400)
    }

    return response
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    createApiError(event, 'DELETE_FAILED', '删除失败', 500)
  }
})

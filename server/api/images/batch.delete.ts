import type { ApiError, BatchDeleteResponse } from '~/types/image'
import { requireAdminAuth } from '../../utils/access'
import { MAX_DELETE_BATCH } from '../../utils/constants'
import { validateImageKey } from '../../utils/image-key'
import { purgeImageCache } from '../../utils/purge'
import { createApiError, getR2Bucket } from '../../utils/r2'

interface BatchDeleteBody {
  keys?: string[]
}

export default defineEventHandler(async (event) => {
  try {
    await requireAdminAuth(event)

    const body = await readBody<BatchDeleteBody>(event).catch(() => null)
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

    const bucket = getR2Bucket(event)
    const deleted: string[] = []
    const failed: Array<{ key: string, error: ApiError }> = []

    for (const key of keys) {
      try {
        let existing = null
        try {
          existing = await bucket.head(key)
        } catch {
          failed.push({
            key,
            error: { code: 'R2_ERROR', message: '读取图片失败' }
          })
          continue
        }

        if (!existing) {
          failed.push({
            key,
            error: { code: 'IMAGE_NOT_FOUND', message: '图片不存在' }
          })
          continue
        }

        await bucket.delete(key)
        deleted.push(key)
      } catch {
        failed.push({
          key,
          error: { code: 'DELETE_FAILED', message: '删除失败' }
        })
      }
    }

    if (deleted.length) {
      try {
        await purgeImageCache(event, deleted)
      } catch {
        // 缓存清理失败不影响删除结果
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

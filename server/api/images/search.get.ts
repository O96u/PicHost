import type { ImageListResponse } from '~/types/image'
import { requireAdminAuth } from '../../utils/access'
import {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT
} from '../../utils/constants'
import { createApiError, getR2Bucket } from '../../utils/r2'
import { searchImagesInBucket } from '../../utils/r2-images'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim() : ''

  if (!q) {
    createApiError(event, 'INVALID_REQUEST', '请提供搜索关键词 q', 400)
  }

  if (q.length > 200) {
    createApiError(event, 'INVALID_REQUEST', '搜索关键词过长', 400)
  }

  const limitRaw = Number(query.limit ?? DEFAULT_LIST_LIMIT)
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, Math.floor(limitRaw)), MAX_LIST_LIMIT)
    : DEFAULT_LIST_LIMIT

  const scanCursor = typeof query.cursor === 'string' ? query.cursor : undefined

  const bucket = getR2Bucket(event)
  const result = await searchImagesInBucket(event, bucket, {
    query: q,
    limit,
    scanCursor
  })

  const response: ImageListResponse = {
    items: result.items,
    cursor: result.scanCursor,
    truncated: result.truncated
  }

  return response
})

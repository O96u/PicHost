import type { ImageListResponse } from '~/types/image'
import { requireAdminAuth } from '../../utils/access'
import {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT
} from '../../utils/constants'
import { getR2Bucket } from '../../utils/r2'
import { mapR2ObjectToImageItem } from '../../utils/r2-images'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  const bucket = getR2Bucket(event)
  const query = getQuery(event)

  const limitRaw = Number(query.limit ?? DEFAULT_LIST_LIMIT)
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, Math.floor(limitRaw)), MAX_LIST_LIMIT)
    : DEFAULT_LIST_LIMIT

  const cursor = typeof query.cursor === 'string' ? query.cursor : undefined

  const listing = await bucket.list({
    prefix: 'images/',
    limit,
    cursor,
    include: ['httpMetadata', 'customMetadata']
  })

  const items = listing.objects.map(object => mapR2ObjectToImageItem(event, object))

  items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))

  const response: ImageListResponse = {
    items,
    cursor: listing.truncated ? listing.cursor : undefined,
    truncated: listing.truncated
  }

  return response
})

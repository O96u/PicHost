import type { ImageListResponse } from '~/types/image'
import { requireApiOrAdminAuth, getImageUserFilter } from '../../utils/access'
import { getCurrentUser } from '../../utils/auth'
import {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT
} from '../../utils/constants'
import { createApiError } from '../../utils/api-error'
import { getUploadSourcesForKeys, listUserIdUsernameMap } from '../../utils/db'
import { mapStoredImageToItem } from '../../utils/image-response'
import { listStorageBackendNameMap } from '../../utils/storage-backends'
import { readBackendIdQuery } from '../../utils/image-query'
import { listImages } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  await requireApiOrAdminAuth(event)

  const query = getQuery(event)

  const limitRaw = Number(query.limit ?? DEFAULT_LIST_LIMIT)
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, Math.floor(limitRaw)), MAX_LIST_LIMIT)
    : DEFAULT_LIST_LIMIT

  const pageRaw = Number(query.page ?? 1)
  const page = Number.isFinite(pageRaw) && pageRaw > 0
    ? Math.floor(pageRaw)
    : 1

  const backendId = readBackendIdQuery(query)
  if (backendId === null) {
    createApiError(event, 'INVALID_REQUEST', '无效的存储后端', 400)
  }
  const userFilter = await getImageUserFilter(event)

  const listing = await listImages({ limit, page, userFilter, backendId })

  const user = await getCurrentUser(event)
  const ownerMap = user?.role === 'admin' ? listUserIdUsernameMap() : undefined
  const backendMap = listStorageBackendNameMap()
  const sourceMap = getUploadSourcesForKeys(listing.items.map(item => item.key))
  const items = listing.items.map(stored =>
    mapStoredImageToItem(event, stored, { ownerMap, backendMap, sourceMap })
  )

  items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))

  const response: ImageListResponse = {
    items,
    total: listing.total,
    page: listing.page,
    pageSize: listing.pageSize,
    totalPages: listing.totalPages
  }

  return response
})

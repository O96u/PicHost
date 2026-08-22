import type { ImageListResponse } from '~/types/image'
import { requireApiOrAdminAuth, getImageUserFilter } from '../../utils/access'
import { getCurrentUser } from '../../utils/auth'
import {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT
} from '../../utils/constants'
import { listUserIdUsernameMap } from '../../utils/db'
import { mapStoredImageToItem } from '../../utils/image-response'
import { isValidFolderName } from '../../utils/image-key'
import { listImages } from '../../utils/storage'

function readFolderQuery(query: Record<string, unknown>): string | undefined {
  const raw = typeof query.folder === 'string' ? query.folder.trim() : ''
  if (!raw || raw === 'all') return undefined
  return isValidFolderName(raw) ? raw : undefined
}

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

  const folder = readFolderQuery(query)
  const userFilter = await getImageUserFilter(event)

  const listing = await listImages({ limit, page, folder, userFilter })

  const user = await getCurrentUser(event)
  const ownerMap = user?.role === 'admin' ? listUserIdUsernameMap() : undefined
  const items = listing.items.map(stored =>
    mapStoredImageToItem(event, stored, { ownerMap })
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

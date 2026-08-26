import { getImageUserFilter, requireApiOrAdminAuth } from '../../utils/access'
import { isValidFolderName } from '../../utils/image-key'
import { readBackendIdQuery } from '../../utils/image-query'
import { createApiError } from '../../utils/api-error'
import { countImages } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  await requireApiOrAdminAuth(event)
  const userFilter = await getImageUserFilter(event)

  const query = getQuery(event)
  const raw = typeof query.folder === 'string' ? query.folder.trim() : ''
  const folder = raw && raw !== 'all' && isValidFolderName(raw) ? raw : undefined
  const backendId = readBackendIdQuery(query)
  if (backendId === null) {
    createApiError(event, 'INVALID_REQUEST', '无效的存储后端', 400)
  }

  const total = await countImages(folder, userFilter, backendId)

  return { total }
})

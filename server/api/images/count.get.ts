import { getImageUserFilter, requireApiOrAdminAuth } from '../../utils/access'
import { readBackendIdQuery } from '../../utils/image-query'
import { createApiError } from '../../utils/api-error'
import { countImages } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  await requireApiOrAdminAuth(event)
  const userFilter = await getImageUserFilter(event)

  const query = getQuery(event)
  const backendId = readBackendIdQuery(query)
  if (backendId === null) {
    createApiError(event, 'INVALID_REQUEST', '无效的存储后端', 400)
  }

  const total = await countImages(userFilter, backendId)

  return { total }
})

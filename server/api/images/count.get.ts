import { getImageUserFilter, requireApiOrAdminAuth } from '../../utils/access'
import { isValidFolderName } from '../../utils/image-key'
import { countImages } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  await requireApiOrAdminAuth(event)
  const userFilter = await getImageUserFilter(event)

  const query = getQuery(event)
  const raw = typeof query.folder === 'string' ? query.folder.trim() : ''
  const folder = raw && raw !== 'all' && isValidFolderName(raw) ? raw : undefined

  const total = await countImages(folder, userFilter)

  return { total }
})

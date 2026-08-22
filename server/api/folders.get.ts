import { getImageUserFilter, requireUserAuth } from '../utils/access'
import { listFolders, listFoldersForUser } from '../utils/storage'

export default defineEventHandler(async (event) => {
  await requireUserAuth(event)
  const userFilter = await getImageUserFilter(event)
  const folders = userFilter === 'admin'
    ? await listFolders()
    : await listFoldersForUser(userFilter)
  return { folders }
})

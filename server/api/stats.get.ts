import { getImageUserFilter, requireUserAuth } from '../utils/access'
import { createApiError } from '../utils/api-error'
import { logException } from '../utils/logger'
import { countUsers, getActivityStats } from '../utils/db'
import {
  countImages,
  getFolderStorageStats,
  getUserScopedStorageStats
} from '../utils/storage'

export default defineEventHandler(async (event) => {
  const user = await requireUserAuth(event)
  const userFilter = await getImageUserFilter(event)

  try {
    if (user.role === 'admin' && userFilter === 'admin') {
      const [activity, storedCount, byFolder] = await Promise.all([
        Promise.resolve(getActivityStats()),
        countImages(),
        getFolderStorageStats()
      ])

      return {
        ...activity,
        storedCount,
        byFolder,
        userCount: countUsers()
      }
    }

    const scoped = await getUserScopedStorageStats(user.id)

    return {
      uploadToday: scoped.uploadToday,
      uploadMonth: scoped.uploadMonth,
      deleteToday: 0,
      deleteMonth: 0,
      uploadTotal: scoped.storedCount,
      deleteTotal: 0,
      uploadBytesTotal: scoped.uploadBytesTotal,
      bySource: { web: scoped.storedCount, api: 0, twikoo: 0 },
      byFolderUploads: scoped.byFolder.map(item => ({
        folder: item.folder,
        count: item.count
      })),
      storedCount: scoped.storedCount,
      byFolder: scoped.byFolder
    }
  } catch (error) {
    logException('stats failed', error)
    createApiError(event, 'INVALID_REQUEST', '读取统计失败', 500)
  }
})

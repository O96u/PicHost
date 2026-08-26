import { getDataDir } from '../utils/data-dir'
import { runAutoDeleteCleanup } from '../utils/auto-delete'
import { migrateLocalImagesToIndex } from '../utils/image-index'
import { ensureDefaultBackends } from '../utils/storage-backends'
import { logInfo } from '../utils/logger'

export default defineNitroPlugin(() => {
  const port = process.env.NITRO_PORT || process.env.PORT || '6892'
  logInfo('PicHost starting', {
    port,
    dataDir: getDataDir(),
    nodeEnv: process.env.NODE_ENV || 'development',
    imageBaseUrl: process.env.IMAGE_BASE_URL || '(request origin)',
    storageBackend: process.env.STORAGE_BACKEND || 'db',
    logLevel: process.env.LOG_LEVEL || 'info'
  })

  ensureDefaultBackends()
  void migrateLocalImagesToIndex().then((count) => {
    if (count > 0) {
      logInfo('migrated local images to index', { count })
    }
  })

  void runAutoDeleteCleanup().then((result) => {
    if (!result.skipped && (result.deleted > 0 || result.failed > 0)) {
      logInfo('startup auto-delete', { ...result })
    }
  })
})

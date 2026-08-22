import { getDataDir } from '../utils/storage'
import { runAutoDeleteCleanup } from '../utils/auto-delete'
import { logInfo } from '../utils/logger'

export default defineNitroPlugin(() => {
  const port = process.env.NITRO_PORT || process.env.PORT || '6892'
  logInfo('PicHost starting', {
    port,
    dataDir: getDataDir(),
    nodeEnv: process.env.NODE_ENV || 'development',
    imageBaseUrl: process.env.IMAGE_BASE_URL || '(request origin)',
    logLevel: process.env.LOG_LEVEL || 'info'
  })

  void runAutoDeleteCleanup().then((result) => {
    if (!result.skipped && (result.deleted > 0 || result.failed > 0)) {
      logInfo('startup auto-delete', { ...result })
    }
  })
})

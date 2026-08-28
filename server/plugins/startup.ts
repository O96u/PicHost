import { getDataDir } from '../utils/data-dir'
import { runAutoDeleteCleanup } from '../utils/auto-delete'
import { migrateLocalImagesToIndex, purgeOrphanImageIndexRows, reconcileLegacyImageKeys, repairLocalImageIndexMetadata } from '../utils/image-index'
import { ensureDefaultBackends } from '../utils/storage-backends'
import { logException, logInfo } from '../utils/logger'

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

  void (async () => {
    const dataDir = getDataDir()
    try {
      logInfo('开始同步图片索引：扫描本地磁盘', { path: `${dataDir}/images/` })

      const inserted = await migrateLocalImagesToIndex()
      if (inserted > 0) {
        logInfo('磁盘扫描完成：已补全缺失索引', { inserted })
      } else {
        logInfo('磁盘扫描完成：索引与磁盘一致，无需补全')
      }

      logInfo('开始归一化遗留图片路径（如 blog/ → images/blog/）')
      const reconciled = await reconcileLegacyImageKeys()
      if (reconciled.updated > 0 || reconciled.removed > 0) {
        logInfo('遗留路径归一化完成', reconciled)
      } else {
        logInfo('遗留路径归一化完成：无需调整')
      }

      logInfo('开始校验索引与磁盘一致性，清理无文件的孤儿记录')
      const purged = await purgeOrphanImageIndexRows()
      if (purged > 0) {
        logInfo('孤儿索引清理完成', { removed: purged })
      } else {
        logInfo('孤儿索引清理完成：未发现孤儿记录')
      }

      logInfo('开始修复存量 Content-Type 元数据')
      const repaired = repairLocalImageIndexMetadata()
      if (repaired > 0) {
        logInfo('Content-Type 修复完成', { repaired })
      } else {
        logInfo('Content-Type 修复完成：无需修复')
      }

      logInfo('图片索引同步结束')
    } catch (error) {
      logException('图片索引同步失败', error)
    }
  })()

  void (async () => {
    try {
      logInfo('开始执行启动时自动删除检查')
      const result = await runAutoDeleteCleanup()
      if (result.skipped) {
        logInfo('自动删除检查完成：策略未启用')
      } else if (result.deleted > 0 || result.failed > 0) {
        logInfo('自动删除检查完成', { ...result })
      } else {
        logInfo('自动删除检查完成：无到期图片')
      }
    } catch (error) {
      logException('启动时自动删除失败', error)
    }
  })()
})

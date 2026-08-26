import { requireAdminAuth } from '../../../utils/access'
import {
  getBackendUsageStats,
  isStorageEnvConfigured,
  listStorageBackends
} from '../../../utils/storage-backends'
import { buildBackendCapacity } from '../../../utils/storage-capacity'
import { getActiveBackendRow } from '../../../utils/storage/resolver'
import type { StorageBackendInfo } from '../../../utils/storage/types'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  const rows = listStorageBackends()
  const backends = await Promise.all(rows.map(async (backend: StorageBackendInfo & {
    secretsMasked: Record<string, string>
  }) => {
    const usage = getBackendUsageStats(backend.id)
    const capacity = await buildBackendCapacity(
      backend.id,
      backend.type,
      usage.bytes,
      backend.quotaBytes
    )
    return {
      ...backend,
      usage,
      capacity
    }
  }))

  const activeBackend = getActiveBackendRow()

  return {
    backends,
    activeBackendId: activeBackend?.id ?? 'local',
    envOverride: isStorageEnvConfigured()
  }
})

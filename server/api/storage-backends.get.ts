import { requireUserAuth } from '../utils/access'
import {
  ensureStorageSchema,
  listStorageBackendNameMap,
  LOCAL_BACKEND_ID
} from '../utils/storage-backends'

function sortBackendsForFilter<T extends { id: string, name: string }>(backends: T[]): T[] {
  return [...backends].sort((a, b) => {
    if (a.id === LOCAL_BACKEND_ID) return -1
    if (b.id === LOCAL_BACKEND_ID) return 1
    return a.name.localeCompare(b.name, 'zh-CN')
  })
}

export default defineEventHandler(async (event) => {
  await requireUserAuth(event)
  ensureStorageSchema()

  const map = listStorageBackendNameMap()
  const backends = sortBackendsForFilter(
    Array.from(map.entries()).map(([id, backend]) => ({
      id,
      name: backend.name,
      type: backend.type
    }))
  )

  return { backends }
})

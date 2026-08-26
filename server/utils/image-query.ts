import { getStorageBackendRow } from './storage-backends'

export function readBackendIdQuery(
  query: Record<string, unknown>
): string | undefined | null {
  const raw = typeof query.backendId === 'string' ? query.backendId.trim() : ''
  if (!raw || raw === 'all') return undefined
  return getStorageBackendRow(raw)?.id ?? null
}

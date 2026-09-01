import { getStorageBackendRow } from './storage-backends'
import { ALLOWED_MIME_TYPES } from './constants'

export function readBackendIdQuery(
  query: Record<string, unknown>
): string | undefined | null {
  const raw = typeof query.backendId === 'string' ? query.backendId.trim() : ''
  if (!raw || raw === 'all') return undefined
  return getStorageBackendRow(raw)?.id ?? null
}

export function readContentTypeQuery(
  query: Record<string, unknown>
): string | undefined | null {
  const raw = typeof query.contentType === 'string' ? query.contentType.trim() : ''
  if (!raw || raw === 'all') return undefined
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(raw)) return null
  return raw
}

export function readUploadSourceQuery(
  query: Record<string, unknown>
): 'web' | 'api' | undefined | null {
  const raw = typeof query.uploadSource === 'string' ? query.uploadSource.trim() : ''
  if (!raw || raw === 'all') return undefined
  if (raw === 'web' || raw === 'api') return raw
  return null
}

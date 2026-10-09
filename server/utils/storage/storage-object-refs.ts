import { getDb } from '../db'
import type { TelegramObjectRef } from './types'

export function getStorageObjectRef(
  backendId: string,
  key: string
): TelegramObjectRef | null {
  const row = getDb().prepare(`
    SELECT ref_json FROM storage_object_refs
    WHERE backend_id = ? AND key = ?
  `).get(backendId, key) as { ref_json: string } | undefined

  if (!row) return null

  try {
    return JSON.parse(row.ref_json) as TelegramObjectRef
  } catch {
    return null
  }
}

export function setStorageObjectRef(
  backendId: string,
  key: string,
  ref: TelegramObjectRef
): void {
  getDb().prepare(`
    INSERT INTO storage_object_refs (backend_id, key, ref_json)
    VALUES (?, ?, ?)
    ON CONFLICT(backend_id, key) DO UPDATE SET ref_json = excluded.ref_json
  `).run(backendId, key, JSON.stringify(ref))
}

export function deleteStorageObjectRef(backendId: string, key: string): void {
  getDb().prepare(`
    DELETE FROM storage_object_refs WHERE backend_id = ? AND key = ?
  `).run(backendId, key)
}

export function deleteStorageObjectRefsForBackend(backendId: string): void {
  getDb().prepare(`
    DELETE FROM storage_object_refs WHERE backend_id = ?
  `).run(backendId)
}

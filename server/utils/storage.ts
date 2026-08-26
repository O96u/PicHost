import type { ReadStream } from 'node:fs'
import type { Readable } from 'node:stream'
import {
  countImages as countImagesFromIndex,
  deleteImageIndex,
  getFolderStorageStats as getFolderStorageStatsFromIndex,
  getImageIndexAsStored,
  getUserScopedStorageStats as getUserScopedStorageStatsFromIndex,
  insertImageIndex,
  listFolders as listFoldersFromIndex,
  listFoldersForUser as listFoldersForUserFromIndex,
  listImageKeysForAutoDelete,
  listImages as listImagesFromIndex,
  searchImages as searchImagesFromIndex
} from './image-index'
import {
  getActiveBackend,
  getBackendForKey
} from './storage/resolver'
import type {
  FolderStorageStat,
  PaginatedResult,
  StoredImage,
  StoredImageMeta
} from './storage/types'

export type {
  FolderStorageStat,
  PaginatedResult,
  StoredImage,
  StoredImageMeta
} from './storage/types'

export { getDataDir } from './data-dir'

export async function putImage(
  key: string,
  bytes: Uint8Array,
  meta: StoredImageMeta
): Promise<string> {
  const backend = await getActiveBackend()
  await backend.put(key, bytes, meta)
  insertImageIndex({
    key,
    backendId: backend.id,
    userId: meta.userId,
    originalName: meta.originalName,
    contentType: meta.contentType,
    size: meta.size,
    uploadedAt: meta.uploadedAt
  })
  return backend.id
}

export async function headImage(key: string): Promise<StoredImage | null> {
  const indexed = getImageIndexAsStored(key)
  if (indexed) return indexed

  const backend = await getBackendForKey(key)
  const stored = await backend.head(key)
  if (!stored) return null

  insertImageIndex({
    key: stored.key,
    backendId: backend.id,
    userId: stored.userId,
    originalName: stored.originalName,
    contentType: stored.contentType,
    size: stored.size,
    uploadedAt: stored.uploadedAt
  })

  return { ...stored, backendId: backend.id }
}

export async function createImageStream(
  key: string,
  range?: { start: number, end: number }
): Promise<ReadStream | Readable> {
  const backend = await getBackendForKey(key)
  return backend.createStream(key, range)
}

export async function deleteImage(key: string): Promise<void> {
  const backend = await getBackendForKey(key)
  await backend.delete(key)
  deleteImageIndex(key)
}

export async function listFolders(): Promise<string[]> {
  return listFoldersFromIndex()
}

export async function listImageKeys(): Promise<string[]> {
  const images = await listImageKeysForAutoDelete()
  return images.map(image => image.key)
}

export async function countImages(
  folder?: string,
  userFilter?: number | 'admin',
  backendId?: string
): Promise<number> {
  return countImagesFromIndex(folder, userFilter, backendId)
}

export async function getFolderStorageStats(
  userFilter?: number | 'admin'
): Promise<FolderStorageStat[]> {
  return getFolderStorageStatsFromIndex(userFilter)
}

export async function listFoldersForUser(
  userFilter?: number | 'admin'
): Promise<string[]> {
  return listFoldersForUserFromIndex(userFilter)
}

export async function getUserScopedStorageStats(userId: number): Promise<{
  storedCount: number
  uploadBytesTotal: number
  uploadToday: number
  uploadMonth: number
  byFolder: FolderStorageStat[]
}> {
  return getUserScopedStorageStatsFromIndex(userId)
}

export async function listImages(options: {
  limit: number
  page?: number
  folder?: string
  userFilter?: number | 'admin'
  backendId?: string
}): Promise<PaginatedResult<StoredImage>> {
  return listImagesFromIndex(options)
}

export async function searchImages(options: {
  query: string
  limit: number
  page?: number
  folder?: string
  userFilter?: number | 'admin'
  backendId?: string
}): Promise<PaginatedResult<StoredImage>> {
  return searchImagesFromIndex(options)
}

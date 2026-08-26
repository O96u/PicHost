import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { getDb } from './db'
import { getDataDir } from './data-dir'
import { isValidFolderName, validateImageKey, DEFAULT_FOLDER } from './image-key'
import {
  ensureDefaultBackends,
  ensureStorageSchema,
  LOCAL_BACKEND_ID
} from './storage-backends'
import type { PaginatedResult, StoredImage, StoredImageMeta } from './storage/types'

const META_SUFFIX = '.meta.json'

export interface ImageIndexRow {
  key: string
  backend_id: string
  user_id: number | null
  folder: string
  original_name: string
  content_type: string
  size: number
  uploaded_at: string
}

function keyToFilePath(key: string): string {
  return join(getDataDir(), ...key.split('/'))
}

async function readLocalMeta(key: string): Promise<Partial<StoredImageMeta>> {
  try {
    const raw = await fs.readFile(keyToFilePath(key) + META_SUFFIX, 'utf8')
    return JSON.parse(raw) as Partial<StoredImageMeta>
  } catch {
    return {}
  }
}

function rowToStoredImage(row: ImageIndexRow): StoredImage {
  const uploadedMs = new Date(row.uploaded_at).getTime()
  return {
    key: row.key,
    backendId: row.backend_id,
    originalName: row.original_name,
    uploadedAt: row.uploaded_at,
    contentType: row.content_type,
    size: row.size,
    userId: row.user_id,
    mtimeMs: Number.isFinite(uploadedMs) ? uploadedMs : Date.now()
  }
}

function buildUserFilterSql(
  userFilter: number | 'admin' | undefined,
  params: Array<string | number>
): string {
  if (userFilter === undefined || userFilter === 'admin') return ''
  params.push(userFilter)
  return ' AND user_id = ?'
}

export function insertImageIndex(input: {
  key: string
  backendId: string
  userId?: number | null
  originalName: string
  contentType: string
  size: number
  uploadedAt: string
}): void {
  ensureStorageSchema()
  const folder = input.key.split('/')[0] ?? DEFAULT_FOLDER
  getDb().prepare(`
    INSERT INTO images
      (key, backend_id, user_id, folder, original_name, content_type, size, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      backend_id = excluded.backend_id,
      user_id = excluded.user_id,
      folder = excluded.folder,
      original_name = excluded.original_name,
      content_type = excluded.content_type,
      size = excluded.size,
      uploaded_at = excluded.uploaded_at
  `).run(
    input.key,
    input.backendId,
    input.userId ?? null,
    folder,
    input.originalName,
    input.contentType,
    input.size,
    input.uploadedAt
  )
}

export function deleteImageIndex(key: string): void {
  ensureStorageSchema()
  getDb().prepare('DELETE FROM images WHERE key = ?').run(key)
}

export function getImageIndexRow(key: string): ImageIndexRow | null {
  ensureStorageSchema()
  const row = getDb().prepare(`
    SELECT key, backend_id, user_id, folder, original_name, content_type, size, uploaded_at
    FROM images
    WHERE key = ?
  `).get(key) as ImageIndexRow | undefined
  return row ?? null
}

export function getImageIndexAsStored(key: string): StoredImage | null {
  const row = getImageIndexRow(key)
  return row ? rowToStoredImage(row) : null
}

async function readDirNames(path: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(path, { withFileTypes: true })
    return entries.filter(e => e.isDirectory()).map(e => e.name)
  } catch {
    return []
  }
}

async function readFileNames(path: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(path, { withFileTypes: true })
    return entries.filter(e => e.isFile()).map(e => e.name)
  } catch {
    return []
  }
}

async function listLocalImageKeys(): Promise<string[]> {
  const keys: string[] = []
  const dataDir = getDataDir()
  const prefixes = await readDirNames(dataDir)

  for (const prefix of prefixes) {
    if (!isValidFolderName(prefix)) continue
    const root = join(dataDir, prefix)
    const years = await readDirNames(root)
    for (const year of years) {
      const months = await readDirNames(join(root, year))
      for (const month of months) {
        const files = await readFileNames(join(root, year, month))
        for (const file of files) {
          if (file.endsWith(META_SUFFIX)) continue
          const key = `${prefix}/${year}/${month}/${file}`
          if (validateImageKey(key)) keys.push(key)
        }
      }
    }
  }

  return keys
}

export async function migrateLocalImagesToIndex(): Promise<number> {
  ensureDefaultBackends()
  const keys = await listLocalImageKeys()
  let inserted = 0

  for (const key of keys) {
    const existing = getImageIndexRow(key)
    if (existing) continue

    let stat
    try {
      stat = await fs.stat(keyToFilePath(key))
    } catch {
      continue
    }

    const meta = await readLocalMeta(key)
    const uploadedAt = meta.uploadedAt ?? stat.mtime.toISOString()

    insertImageIndex({
      key,
      backendId: LOCAL_BACKEND_ID,
      userId: meta.userId ?? null,
      originalName: meta.originalName ?? key.split('/').pop() ?? 'image',
      contentType: meta.contentType ?? 'application/octet-stream',
      size: stat.size,
      uploadedAt
    })
    inserted++
  }

  return inserted
}

export async function listFolders(): Promise<string[]> {
  ensureStorageSchema()
  const rows = getDb().prepare(`
    SELECT DISTINCT folder FROM images ORDER BY folder ASC
  `).all() as Array<{ folder: string }>

  const folders = rows.map(row => row.folder).filter(isValidFolderName)
  if (!folders.includes(DEFAULT_FOLDER)) {
    folders.push(DEFAULT_FOLDER)
  }
  return folders.sort((a, b) => a.localeCompare(b))
}

export async function listFoldersForUser(
  userFilter?: number | 'admin'
): Promise<string[]> {
  ensureStorageSchema()
  const params: Array<string | number> = []
  const userSql = buildUserFilterSql(userFilter, params)

  const rows = getDb().prepare(`
    SELECT DISTINCT folder FROM images WHERE 1=1${userSql} ORDER BY folder ASC
  `).all(...params) as Array<{ folder: string }>

  const folders = rows.map(row => row.folder).filter(isValidFolderName)
  if (!folders.length) {
    folders.push(DEFAULT_FOLDER)
  }
  return folders.sort((a, b) => a.localeCompare(b))
}

function buildBackendFilterSql(
  backendId: string | undefined,
  params: Array<string | number>
): string {
  if (!backendId) return ''
  params.push(backendId)
  return ' AND backend_id = ?'
}

export async function countImages(
  folder?: string,
  userFilter?: number | 'admin',
  backendId?: string
): Promise<number> {
  ensureStorageSchema()
  const params: Array<string | number> = []
  const clauses: string[] = ['1=1']

  if (folder && isValidFolderName(folder)) {
    clauses.push('folder = ?')
    params.push(folder)
  }

  const userSql = buildUserFilterSql(userFilter, params)
  const backendSql = buildBackendFilterSql(backendId, params)
  const row = getDb().prepare(`
    SELECT COUNT(*) AS count FROM images WHERE ${clauses.join(' AND ')}${userSql}${backendSql}
  `).get(...params) as { count: number }

  return row.count
}

function paginateSlice<T>(
  all: T[],
  limit: number,
  page?: number
): PaginatedResult<T> {
  const total = all.length
  const pageSize = limit
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const requestedPage = Math.max(1, page ?? 1)
  const safePage = Math.min(requestedPage, totalPages)
  const start = (safePage - 1) * pageSize
  const items = all.slice(start, start + pageSize)

  return { items, total, page: safePage, pageSize, totalPages }
}

export async function listImages(options: {
  limit: number
  page?: number
  folder?: string
  userFilter?: number | 'admin'
  backendId?: string
}): Promise<PaginatedResult<StoredImage>> {
  ensureStorageSchema()
  const params: Array<string | number> = []
  const clauses: string[] = ['1=1']

  if (options.folder && isValidFolderName(options.folder)) {
    clauses.push('folder = ?')
    params.push(options.folder)
  }

  const userSql = buildUserFilterSql(options.userFilter, params)
  const backendSql = buildBackendFilterSql(options.backendId, params)
  const rows = getDb().prepare(`
    SELECT key, backend_id, user_id, folder, original_name, content_type, size, uploaded_at
    FROM images
    WHERE ${clauses.join(' AND ')}${userSql}${backendSql}
    ORDER BY uploaded_at DESC, key DESC
  `).all(...params) as unknown as ImageIndexRow[]

  const sliced = paginateSlice(rows, options.limit, options.page)
  return {
    ...sliced,
    items: sliced.items.map(rowToStoredImage)
  }
}

export async function searchImages(options: {
  query: string
  limit: number
  page?: number
  folder?: string
  userFilter?: number | 'admin'
  backendId?: string
}): Promise<PaginatedResult<StoredImage>> {
  ensureStorageSchema()
  const needle = options.query.trim().toLowerCase()
  const params: Array<string | number> = []
  const clauses: string[] = ['1=1']

  if (options.folder && isValidFolderName(options.folder)) {
    clauses.push('folder = ?')
    params.push(options.folder)
  }

  const userSql = buildUserFilterSql(options.userFilter, params)
  const backendSql = buildBackendFilterSql(options.backendId, params)
  const rows = getDb().prepare(`
    SELECT key, backend_id, user_id, folder, original_name, content_type, size, uploaded_at
    FROM images
    WHERE ${clauses.join(' AND ')}${userSql}${backendSql}
    ORDER BY uploaded_at DESC, key DESC
  `).all(...params) as unknown as ImageIndexRow[]

  const matches = rows.filter((row) => {
    if (!needle) return true
    return row.key.toLowerCase().includes(needle)
      || row.original_name.toLowerCase().includes(needle)
  })

  const sliced = paginateSlice(matches, options.limit, options.page)
  return {
    ...sliced,
    items: sliced.items.map(rowToStoredImage)
  }
}

export async function getFolderStorageStats(
  userFilter?: number | 'admin'
): Promise<Array<{ folder: string, count: number, bytes: number }>> {
  ensureStorageSchema()
  const params: Array<string | number> = []
  const userSql = buildUserFilterSql(userFilter, params)

  const rows = getDb().prepare(`
    SELECT folder, COUNT(*) AS count, COALESCE(SUM(size), 0) AS bytes
    FROM images
    WHERE 1=1${userSql}
    GROUP BY folder
    ORDER BY bytes DESC, folder ASC
  `).all(...params) as Array<{ folder: string, count: number, bytes: number }>

  return rows
}

function startOfDayIsoInShanghai(now = new Date()): string {
  const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const y = shifted.getUTCFullYear()
  const m = shifted.getUTCMonth()
  const d = shifted.getUTCDate()
  return new Date(Date.UTC(y, m, d) - 8 * 60 * 60 * 1000).toISOString()
}

function startOfMonthIsoInShanghai(now = new Date()): string {
  const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const y = shifted.getUTCFullYear()
  const m = shifted.getUTCMonth()
  return new Date(Date.UTC(y, m, 1) - 8 * 60 * 60 * 1000).toISOString()
}

export async function getUserScopedStorageStats(userId: number): Promise<{
  storedCount: number
  uploadBytesTotal: number
  uploadToday: number
  uploadMonth: number
  byFolder: Array<{ folder: string, count: number, bytes: number }>
}> {
  ensureStorageSchema()
  const startOfDay = startOfDayIsoInShanghai()
  const startOfMonth = startOfMonthIsoInShanghai()

  const rows = getDb().prepare(`
    SELECT folder, size, uploaded_at
    FROM images
    WHERE user_id = ?
  `).all(userId) as Array<{ folder: string, size: number, uploaded_at: string }>

  const map = new Map<string, { count: number, bytes: number }>()
  let uploadBytesTotal = 0
  let uploadToday = 0
  let uploadMonth = 0

  for (const row of rows) {
    uploadBytesTotal += row.size
    if (row.uploaded_at >= startOfDay) uploadToday += 1
    if (row.uploaded_at >= startOfMonth) uploadMonth += 1

    const current = map.get(row.folder) ?? { count: 0, bytes: 0 }
    current.count += 1
    current.bytes += row.size
    map.set(row.folder, current)
  }

  const byFolder = [...map.entries()]
    .map(([folder, stat]) => ({ folder, ...stat }))
    .sort((a, b) => b.bytes - a.bytes || a.folder.localeCompare(b.folder))

  return {
    storedCount: rows.length,
    uploadBytesTotal,
    uploadToday,
    uploadMonth,
    byFolder
  }
}

export async function listImageKeysForAutoDelete(): Promise<StoredImage[]> {
  ensureStorageSchema()
  const rows = getDb().prepare(`
    SELECT key, backend_id, user_id, folder, original_name, content_type, size, uploaded_at
    FROM images
    ORDER BY uploaded_at ASC
  `).all() as unknown as ImageIndexRow[]

  return rows.map(rowToStoredImage)
}

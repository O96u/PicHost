import { createReadStream, promises as fs } from 'node:fs'
import type { ReadStream } from 'node:fs'
import { dirname, join } from 'node:path'
import { isValidFolderName, validateImageKey, DEFAULT_FOLDER } from './image-key'

/**
 * 本地文件系统存储层
 *
 * 目录布局（DATA_DIR 默认 ./data，容器内挂载 /data）：
 *   <DATA_DIR>/<type>/YYYY/MM/<随机ID>.webp            按上传 type 分目录（默认 images）
 *   <DATA_DIR>/twikoo/YYYY/MM/<随机ID>.webp           twikoo 评论图片
 *   <DATA_DIR>/<type>/YYYY/MM/<随机ID>.webp.meta.json  元数据（原始文件名等）
 *
 * 列表按日期降序（新月份在前），meta 缺失时回退到文件属性。
 */

export interface StoredImageMeta {
  originalName: string
  uploadedAt: string
  contentType: string
  size: number
  userId?: number | null
}

export interface StoredImage extends StoredImageMeta {
  key: string
  mtimeMs: number
}

const META_SUFFIX = '.meta.json'

export function getDataDir(): string {
  return process.env.DATA_DIR || join(process.cwd(), 'data')
}

function keyToFilePath(key: string): string {
  // key 均已通过 validateImageKey 校验，不存在路径穿越
  return join(getDataDir(), ...key.split('/'))
}

function contentTypeFromKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'svg':
      return 'image/svg+xml'
    case 'ico':
      return 'image/x-icon'
    default:
      return 'application/octet-stream'
  }
}

async function readMeta(key: string): Promise<Partial<StoredImageMeta>> {
  try {
    const raw = await fs.readFile(keyToFilePath(key) + META_SUFFIX, 'utf8')
    return JSON.parse(raw) as Partial<StoredImageMeta>
  } catch {
    return {}
  }
}

export async function putImage(
  key: string,
  bytes: Uint8Array,
  meta: StoredImageMeta
): Promise<void> {
  const filePath = keyToFilePath(key)
  await fs.mkdir(dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, bytes)
  await fs.writeFile(filePath + META_SUFFIX, JSON.stringify(meta))
}

export async function headImage(key: string): Promise<StoredImage | null> {
  if (!validateImageKey(key)) return null

  let stat
  try {
    stat = await fs.stat(keyToFilePath(key))
  } catch {
    return null
  }
  if (!stat.isFile()) return null

  const meta = await readMeta(key)
  return {
    key,
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    contentType: meta.contentType ?? contentTypeFromKey(key),
    originalName: meta.originalName ?? key.split('/').pop() ?? 'image',
    uploadedAt: meta.uploadedAt ?? stat.mtime.toISOString(),
    userId: meta.userId ?? null
  }
}

export function createImageStream(
  key: string,
  range?: { start: number, end: number }
): ReadStream {
  return createReadStream(keyToFilePath(key), range)
}

export async function deleteImage(key: string): Promise<void> {
  const filePath = keyToFilePath(key)
  await fs.unlink(filePath)
  await fs.unlink(filePath + META_SUFFIX).catch(() => {
    // meta 文件可能不存在（外部导入的历史图片）
  })
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function listFolders(): Promise<string[]> {
  const names = await readDirNames(getDataDir())
  const folders = names.filter(isValidFolderName)
  if (!folders.includes(DEFAULT_FOLDER)) {
    folders.push(DEFAULT_FOLDER)
  }
  return folders.sort((a, b) => a.localeCompare(b))
}

/** 遍历各 type 目录下的 YYYY/MM，返回按日期降序的 key 列表（新月份在前） */
export async function listImageKeys(folder?: string): Promise<string[]> {
  const keys: string[] = []
  const prefixes = folder && isValidFolderName(folder)
    ? [folder]
    : await listFolders()

  for (const prefix of prefixes) {
    const root = join(getDataDir(), prefix)
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

  // 按 YYYY/MM/文件名 降序排，使不同 type 按时间交错而不是分块
  return keys.sort((a, b) => {
    const aDate = a.slice(a.indexOf('/') + 1)
    const bDate = b.slice(b.indexOf('/') + 1)
    return bDate.localeCompare(aDate) || b.localeCompare(a)
  })
}

async function readDirNames(path: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(path, { withFileTypes: true })
    return entries.filter(e => e.isDirectory()).map(e => e.name)
  } catch {
    return []
  }
}

function matchesUserFilter(
  meta: StoredImageMeta,
  userFilter: number | 'admin'
): boolean {
  if (userFilter === 'admin') return true
  const ownerId = meta.userId ?? null
  if (ownerId === null) return false
  return ownerId === userFilter
}

async function filterKeysByUser(
  keys: string[],
  userFilter?: number | 'admin'
): Promise<string[]> {
  if (userFilter === undefined || userFilter === 'admin') {
    return keys
  }

  const filtered: string[] = []
  for (const key of keys) {
    const meta = await readMeta(key)
    if (matchesUserFilter(meta as StoredImageMeta, userFilter)) {
      filtered.push(key)
    }
  }
  return filtered
}

async function readFileNames(path: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(path, { withFileTypes: true })
    return entries.filter(e => e.isFile()).map(e => e.name)
  } catch {
    return []
  }
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

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages
  }
}

export async function countImages(
  folder?: string,
  userFilter?: number | 'admin'
): Promise<number> {
  let keys = await listImageKeys(folder)
  keys = await filterKeysByUser(keys, userFilter)
  return keys.length
}

export interface FolderStorageStat {
  folder: string
  count: number
  bytes: number
}

/** 按顶层目录统计当前磁盘上的图片数量与体积 */
export async function getFolderStorageStats(
  userFilter?: number | 'admin'
): Promise<FolderStorageStat[]> {
  let keys = await listImageKeys()
  keys = await filterKeysByUser(keys, userFilter)
  const map = new Map<string, { count: number, bytes: number }>()

  for (const key of keys) {
    const folder = key.split('/')[0] ?? 'unknown'
    const meta = await headImage(key)
    if (!meta) continue
    const current = map.get(folder) ?? { count: 0, bytes: 0 }
    current.count += 1
    current.bytes += meta.size
    map.set(folder, current)
  }

  return [...map.entries()]
    .map(([folder, stat]) => ({ folder, ...stat }))
    .sort((a, b) => b.bytes - a.bytes || a.folder.localeCompare(b.folder))
}

export async function listFoldersForUser(
  userFilter?: number | 'admin'
): Promise<string[]> {
  if (userFilter === undefined || userFilter === 'admin') {
    return listFolders()
  }

  let keys = await listImageKeys()
  keys = await filterKeysByUser(keys, userFilter)
  const folders = new Set<string>()
  for (const key of keys) {
    const folder = key.split('/')[0]
    if (folder && isValidFolderName(folder)) {
      folders.add(folder)
    }
  }
  if (!folders.size) {
    folders.add(DEFAULT_FOLDER)
  }
  return [...folders].sort((a, b) => a.localeCompare(b))
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

/** 普通用户统计：基于本人图片 meta，不依赖全局 activity_logs */
export async function getUserScopedStorageStats(userId: number): Promise<{
  storedCount: number
  uploadBytesTotal: number
  uploadToday: number
  uploadMonth: number
  byFolder: FolderStorageStat[]
}> {
  let keys = await listImageKeys()
  keys = await filterKeysByUser(keys, userId)

  const startOfDay = startOfDayIsoInShanghai()
  const startOfMonth = startOfMonthIsoInShanghai()
  const map = new Map<string, { count: number, bytes: number }>()
  let uploadBytesTotal = 0
  let uploadToday = 0
  let uploadMonth = 0

  for (const key of keys) {
    const meta = await headImage(key)
    if (!meta) continue

    uploadBytesTotal += meta.size
    if (meta.uploadedAt >= startOfDay) uploadToday += 1
    if (meta.uploadedAt >= startOfMonth) uploadMonth += 1

    const folder = key.split('/')[0] ?? 'unknown'
    const current = map.get(folder) ?? { count: 0, bytes: 0 }
    current.count += 1
    current.bytes += meta.size
    map.set(folder, current)
  }

  const byFolder = [...map.entries()]
    .map(([folder, stat]) => ({ folder, ...stat }))
    .sort((a, b) => b.bytes - a.bytes || a.folder.localeCompare(b.folder))

  return {
    storedCount: keys.length,
    uploadBytesTotal,
    uploadToday,
    uploadMonth,
    byFolder
  }
}

export async function listImages(options: {
  limit: number
  page?: number
  folder?: string
  userFilter?: number | 'admin'
}): Promise<PaginatedResult<StoredImage>> {
  let keys = await listImageKeys(options.folder)
  keys = await filterKeysByUser(keys, options.userFilter)
  const sliced = paginateSlice(keys, options.limit, options.page)
  const items = (await Promise.all(sliced.items.map(headImage)))
    .filter((item): item is StoredImage => item !== null)

  return {
    ...sliced,
    items
  }
}

export async function searchImages(options: {
  query: string
  limit: number
  page?: number
  folder?: string
  userFilter?: number | 'admin'
}): Promise<PaginatedResult<StoredImage>> {
  const needle = options.query.trim().toLowerCase()
  let keys = await listImageKeys(options.folder)
  keys = await filterKeysByUser(keys, options.userFilter)
  const matches: StoredImage[] = []

  for (const key of keys) {
    const keyMatches = key.toLowerCase().includes(needle)
    const item = await headImage(key)
    if (!item) continue

    if (keyMatches || item.originalName.toLowerCase().includes(needle)) {
      matches.push(item)
    }
  }

  return paginateSlice(matches, options.limit, options.page)
}

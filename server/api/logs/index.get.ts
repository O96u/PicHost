import { requireUserAuth } from '../../utils/access'
import { createApiError } from '../../utils/api-error'
import { logException } from '../../utils/logger'
import {
  listActivityLogs,
  listUserIdUsernameMap,
  summarizeActivityLogs,
  type LogAction,
  type LogSource
} from '../../utils/db'
import { ensureStorageSchema } from '../../utils/storage-backends'
import {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT
} from '../../utils/constants'

export default defineEventHandler(async (event) => {
  const user = await requireUserAuth(event)

  const query = getQuery(event)

  const limitRaw = Number(query.limit ?? DEFAULT_LIST_LIMIT)
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, Math.floor(limitRaw)), MAX_LIST_LIMIT)
    : DEFAULT_LIST_LIMIT

  const actionRaw = typeof query.action === 'string' ? query.action : ''
  const action = (actionRaw === 'upload' || actionRaw === 'delete')
    ? actionRaw as LogAction
    : undefined

  const sourceRaw = typeof query.source === 'string' ? query.source : ''
  const source = (sourceRaw === 'web' || sourceRaw === 'api')
    ? sourceRaw as LogSource
    : undefined

  const folder = typeof query.folder === 'string' && query.folder.trim()
    ? query.folder.trim()
    : undefined

  const searchRaw = typeof query.q === 'string' ? query.q.trim() : ''
  const search = searchRaw || undefined

  const pageRaw = Number(query.page ?? 1)
  const page = Number.isFinite(pageRaw) && pageRaw > 0
    ? Math.floor(pageRaw)
    : 1

  let userId: number | undefined
  if (user.role === 'admin') {
    const userIdRaw = query.userId
    if (userIdRaw !== undefined && userIdRaw !== '' && userIdRaw !== 'all') {
      const parsed = Number(userIdRaw)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        createApiError(event, 'INVALID_REQUEST', '无效的用户筛选', 400)
      }
      userId = Math.floor(parsed)
    }
  } else {
    userId = user.id
  }

  try {
    ensureStorageSchema()
    const result = listActivityLogs({ limit, page, action, source, folder, userId, search })
    const summary = summarizeActivityLogs({ source, folder, userId, search })
    const userMap = user.role === 'admin' ? listUserIdUsernameMap() : undefined

    return {
      items: result.items.map(row => ({
        id: row.id,
        action: row.action,
        key: row.key,
        originalName: row.original_name,
        size: row.size,
        contentType: row.content_type,
        source: row.source,
        userId: row.user_id,
        username: row.username,
        storage: row.backend_id
          ? {
              id: row.backend_id,
              name: row.backend_name ?? row.backend_id,
              type: (row.backend_type === 'local' ? 'local' : 's3') as 'local' | 's3'
            }
          : null,
        createdAt: row.created_at
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      summary,
      users: userMap
        ? Array.from(userMap.entries())
            .map(([id, username]) => ({ id, username }))
            .sort((a, b) => a.username.localeCompare(b.username))
        : undefined
    }
  } catch (error) {
    logException('activity logs list failed', error)
    createApiError(event, 'INVALID_REQUEST', '读取操作记录失败', 500)
  }
})

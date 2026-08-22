import { requireAdminAuth } from '../../utils/access'
import { createApiError } from '../../utils/api-error'
import {
  listActivityLogs,
  type LogAction,
  type LogSource
} from '../../utils/db'
import {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT
} from '../../utils/constants'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

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
  const source = (sourceRaw === 'web' || sourceRaw === 'api' || sourceRaw === 'twikoo')
    ? sourceRaw as LogSource
    : undefined

  const folder = typeof query.folder === 'string' && query.folder.trim()
    ? query.folder.trim()
    : undefined

  const pageRaw = Number(query.page ?? 1)
  const page = Number.isFinite(pageRaw) && pageRaw > 0
    ? Math.floor(pageRaw)
    : 1

  try {
    const result = listActivityLogs({ limit, page, action, source, folder })
    return {
      items: result.items.map(row => ({
        id: row.id,
        action: row.action,
        key: row.key,
        originalName: row.original_name,
        size: row.size,
        contentType: row.content_type,
        source: row.source,
        createdAt: row.created_at
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages
    }
  } catch (error) {
    console.error('[logs] list failed', error)
    createApiError(event, 'INVALID_REQUEST', '读取操作记录失败', 500)
  }
})

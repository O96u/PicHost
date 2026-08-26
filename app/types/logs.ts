export type LogAction = 'upload' | 'delete'
export type LogSource = 'web' | 'api' | 'twikoo'

export interface ActivityLogUser {
  id: number
  username: string
}

export interface ActivityLogStorage {
  id: string
  name: string
  type: 'local' | 's3'
}

export interface ActivityLogItem {
  id: number
  action: LogAction
  key: string
  originalName: string
  size: number
  contentType: string
  source: LogSource
  userId: number | null
  username: string | null
  storage: ActivityLogStorage | null
  createdAt: string
}

export interface ActivityLogSummary {
  total: number
  upload: number
  delete: number
}

export interface ActivityLogListResponse {
  items: ActivityLogItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  summary: ActivityLogSummary
  users?: ActivityLogUser[]
}

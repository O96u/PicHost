import { createApiError } from '../../../../../utils/api-error'
import { serializeBackupJob } from '../../../../../utils/backup/api'
import { getBackupJob } from '../../../../../utils/backup/jobs'
import { validateBackupJobWatchToken } from '../../../../../utils/backup/watch-token'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const token = getQuery(event).token
  if (!id) {
    createApiError(event, 'INVALID_REQUEST', '缺少任务 ID', 400)
  }
  if (typeof token !== 'string' || !validateBackupJobWatchToken(id, token)) {
    createApiError(event, 'FORBIDDEN', '无效或已过期的任务监视令牌', 403)
  }

  const job = getBackupJob(id)
  if (!job) {
    createApiError(event, 'INVALID_REQUEST', '任务不存在', 404)
  }

  const activeJob = job.status === 'pending' || job.status === 'running' ? job : null
  return {
    job: serializeBackupJob(job),
    activeJob: activeJob ? serializeBackupJob(activeJob) : null
  }
})

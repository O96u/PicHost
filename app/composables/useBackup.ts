import type {
  BackupEstimate,
  BackupJobItem,
  BackupPackageItem,
  BackupRestorePreview,
  BackendSyncPreview
} from '~/types/backup'

const jobs = ref<BackupJobItem[]>([])
const jobsPage = ref(1)
const jobsPageSize = ref(10)
const jobsTotal = ref(0)
const jobsTotalPages = ref(1)
const jobsLoading = ref(false)
const activeJobState = ref<BackupJobItem | null>(null)
const estimate = ref<BackupEstimate | null>(null)
const packages = ref<BackupPackageItem[]>([])
const loadingEstimate = ref(false)
const polling = ref(false)
const watchJobId = ref<string | null>(null)
const watchToken = ref<string | null>(null)
const WATCH_SESSION_KEY = 'pichost-backup-watch'
let pollTimer: ReturnType<typeof setInterval> | null = null

function readWatchSession(): { jobId: string, token: string } | null {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(WATCH_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { jobId?: string, token?: string }
    if (!parsed.jobId || !parsed.token) return null
    return { jobId: parsed.jobId, token: parsed.token }
  } catch {
    return null
  }
}

function writeWatchSession(jobId: string, token: string) {
  if (!import.meta.client) return
  sessionStorage.setItem(WATCH_SESSION_KEY, JSON.stringify({ jobId, token }))
}

function clearWatchSession() {
  if (!import.meta.client) return
  sessionStorage.removeItem(WATCH_SESSION_KEY)
}

function isActiveJobStatus(status: BackupJobItem['status']): boolean {
  return status === 'pending' || status === 'running'
}

function fetchErrorStatus(error: unknown): number {
  if (typeof error !== 'object' || error === null) return 0
  if ('statusCode' in error) {
    return Number((error as { statusCode: number }).statusCode) || 0
  }
  if ('status' in error) {
    return Number((error as { status: number }).status) || 0
  }
  return 0
}

function isRestoreWatchActive(): boolean {
  if (watchJobId.value) return true
  const job = activeJobState.value
  return job?.type === 'full_restore' && (job.status === 'pending' || job.status === 'running')
}

export function useBackup() {
  const toast = useToast()
  const { t } = useI18n()

  function clearWatch() {
    watchJobId.value = null
    watchToken.value = null
    clearWatchSession()
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    polling.value = false
  }

  function setWatch(jobId: string, token: string) {
    watchJobId.value = jobId
    watchToken.value = token
    writeWatchSession(jobId, token)
  }

  function restoreWatchSession() {
    const saved = readWatchSession()
    if (!saved) return
    watchJobId.value = saved.jobId
    watchToken.value = saved.token
  }

  function upsertJobInList(job: BackupJobItem) {
    const index = jobs.value.findIndex(item => item.id === job.id)
    if (index >= 0) {
      jobs.value[index] = job
      return
    }
    if (jobsPage.value === 1) {
      jobs.value = [job, ...jobs.value].slice(0, jobsPageSize.value)
    }
  }

  function finishRestoreFlow(job: BackupJobItem) {
    activeJobState.value = job
    clearWatch()
    stopPolling()
    toast.add({ title: t('storage.backup.restoreRelogin'), color: 'warning' })
    if (import.meta.client) {
      window.setTimeout(() => {
        void navigateTo('/', { replace: true })
      }, 2000)
    }
  }

  function applyJobPollResult(job: BackupJobItem) {
    upsertJobInList(job)
    if (job.type === 'full_restore' && job.status === 'done') {
      finishRestoreFlow(job)
      return
    }
    if (job.type === 'full_restore' && job.status === 'failed') {
      activeJobState.value = job
      clearWatch()
      stopPolling()
      toast.add({
        title: job.error || job.message || t('storage.backup.restoreFailed'),
        color: 'error'
      })
      return
    }
    activeJobState.value = isActiveJobStatus(job.status) ? job : null
    if (!isActiveJobStatus(job.status)) {
      clearWatch()
      stopPolling()
      void loadEstimate().catch(() => {})
    }
  }

  async function pollRestoreJobPublic(): Promise<boolean> {
    const jobId = watchJobId.value
    if (!jobId) return false
    try {
      const data = await $fetch<{ job: BackupJobItem }>(`/api/setup/restore/${jobId}`)
      applyJobPollResult(data.job)
      return true
    } catch {
      return false
    }
  }

  async function pollWatchedJob(): Promise<boolean> {
    const jobId = watchJobId.value
    const token = watchToken.value
    if (!jobId || !token) return false

    try {
      const data = await $fetch<{
        job: BackupJobItem
        activeJob: BackupJobItem | null
      }>(`/api/admin/backup/jobs/${jobId}/watch`, {
        query: { token }
      })
      applyJobPollResult(data.job)
      if (data.activeJob) {
        activeJobState.value = data.activeJob
      }
      return true
    } catch (error: unknown) {
      const status = fetchErrorStatus(error)
      if (status === 403 || status === 404 || status === 401) {
        const ok = await pollRestoreJobPublic()
        if (ok) return true
      }
      if (status === 403 || status === 404) {
        return false
      }
      throw error
    }
  }

  function hasActiveJob(): boolean {
    return activeJobState.value !== null
  }

  function getActiveJob(): BackupJobItem | null {
    return activeJobState.value
  }

  async function cancelJob(jobId: string) {
    try {
      await $fetch(`/api/admin/backup/jobs/${jobId}/cancel`, {
        method: 'POST',
        credentials: 'include'
      })
      await loadJobs()
      toast.add({ title: t('storage.backup.cancelDone'), color: 'success' })
    } catch (error: unknown) {
      handleError(error, t('storage.backup.cancelFailed'))
    }
  }

  async function loadJobs(options?: { page?: number, pageSize?: number, silent?: boolean }) {
    if (options?.page !== undefined) jobsPage.value = options.page
    if (options?.pageSize !== undefined) jobsPageSize.value = options.pageSize
    const silent = options?.silent === true
    if (!silent) jobsLoading.value = true
    try {
      const data = await $fetch<{
        jobs: BackupJobItem[]
        total: number
        page: number
        pageSize: number
        totalPages: number
        activeJob: BackupJobItem | null
      }>('/api/admin/backup/jobs', {
        credentials: 'include',
        query: {
          pageNum: jobsPage.value,
          pageSize: jobsPageSize.value
        }
      })
      jobs.value = data.jobs
      jobsTotal.value = data.total
      jobsPage.value = data.page
      jobsPageSize.value = data.pageSize
      jobsTotalPages.value = data.totalPages
      if (data.activeJob) {
        activeJobState.value = data.activeJob
      } else if (!watchJobId.value) {
        activeJobState.value = null
      }
      if (!data.activeJob && !watchJobId.value) {
        stopPolling()
        void loadEstimate().catch(() => {})
      } else if (!data.activeJob && watchJobId.value) {
        await pollWatchedJob().catch(() => pollRestoreJobPublic())
      }
      return data.jobs
    } catch (error: unknown) {
      if (fetchErrorStatus(error) === 401) {
        if (await pollWatchedJob().catch(() => false)) {
          return jobs.value
        }
        if (watchJobId.value && await pollRestoreJobPublic()) {
          return jobs.value
        }
        if (watchJobId.value) {
          return jobs.value
        }
      }
      throw error
    } finally {
      if (!silent) jobsLoading.value = false
    }
  }

  async function setJobsPage(page: number) {
    jobsPage.value = page
    return loadJobs()
  }

  async function setJobsPageSize(pageSize: number) {
    jobsPageSize.value = pageSize
    jobsPage.value = 1
    return loadJobs()
  }

  async function refreshJobsFirstPage() {
    jobsPage.value = 1
    return loadJobs()
  }

  async function loadEstimate() {
    loadingEstimate.value = true
    try {
      const data = await $fetch<{
        estimate: BackupEstimate
        packages: BackupPackageItem[]
        backupsDir: string
      }>('/api/admin/backup/estimate', { credentials: 'include' })
      estimate.value = data.estimate
      packages.value = data.packages
      return data
    } finally {
      loadingEstimate.value = false
    }
  }

  async function pollJobProgress() {
    if (watchJobId.value) {
      try {
        const ok = await pollWatchedJob()
        if (!ok) {
          await pollRestoreJobPublic()
        }
      } catch {
        await pollRestoreJobPublic()
      }
      return
    }
    if (isRestoreWatchActive()) {
      await pollRestoreJobPublic()
      return
    }
    await loadJobs({ silent: true })
  }

  function startPolling() {
    if (pollTimer) return
    polling.value = true
    const tick = () => {
      void pollJobProgress().catch(() => {
        if (!isRestoreWatchActive() && !watchJobId.value) {
          stopPolling()
        }
      })
    }
    void tick()
    pollTimer = setInterval(tick, 1500)
  }

  async function createExport() {
    try {
      const data = await $fetch<{ job: BackupJobItem, estimate: BackupEstimate }>(
        '/api/admin/backup/export',
        { method: 'POST', credentials: 'include' }
      )
      estimate.value = data.estimate
      await refreshJobsFirstPage()
      startPolling()
      toast.add({ title: t('storage.backup.exportStarted'), color: 'success' })
      return data.job
    } catch (error: unknown) {
      handleError(error, t('storage.backup.exportFailed'))
      throw error
    }
  }

  async function previewRestore(input: {
    file?: File
    archiveName?: string
  }): Promise<BackupRestorePreview> {
    if (input.file) {
      const form = new FormData()
      form.append('file', input.file)
      form.append('dryRun', 'true')
      const data = await $fetch<{ preview: BackupRestorePreview }>(
        '/api/admin/backup/restore',
        { method: 'POST', credentials: 'include', body: form }
      )
      return data.preview
    }

    const data = await $fetch<{ preview: BackupRestorePreview }>(
      '/api/admin/backup/restore',
      {
        method: 'POST',
        credentials: 'include',
        body: {
          archiveName: input.archiveName,
          dryRun: true
        }
      }
    )
    return data.preview
  }

  async function confirmRestore(input: {
    file?: File
    archiveName?: string
    conflictMode: 'skip' | 'overwrite'
  }) {
    try {
      if (input.file) {
        const form = new FormData()
        form.append('file', input.file)
        form.append('conflictMode', input.conflictMode)
        const data = await $fetch<{ job: BackupJobItem, watchToken?: string }>(
          '/api/admin/backup/restore',
          { method: 'POST', credentials: 'include', body: form }
        )
        if (data.watchToken) {
          setWatch(data.job.id, data.watchToken)
        }
        applyJobPollResult(data.job)
        startPolling()
        void refreshJobsFirstPage().catch(() => {})
        toast.add({ title: t('storage.backup.restoreStarted'), color: 'success' })
        return data.job
      }

      const data = await $fetch<{ job: BackupJobItem, watchToken?: string }>(
        '/api/admin/backup/restore',
        {
          method: 'POST',
          credentials: 'include',
          body: {
            archiveName: input.archiveName,
            conflictMode: input.conflictMode,
            dryRun: false
          }
        }
      )
      if (data.watchToken) {
        setWatch(data.job.id, data.watchToken)
      }
      applyJobPollResult(data.job)
      startPolling()
      void refreshJobsFirstPage().catch(() => {})
      toast.add({ title: t('storage.backup.restoreStarted'), color: 'success' })
      return data.job
    } catch (error: unknown) {
      handleError(error, t('storage.backup.restoreFailed'))
      throw error
    }
  }

  async function previewSync(body: {
    fromBackendId: string
    toBackendId: string
  }): Promise<BackendSyncPreview> {
    const data = await $fetch<{ preview: BackendSyncPreview }>(
      '/api/admin/storage/sync',
      {
        method: 'POST',
        credentials: 'include',
        body: { ...body, dryRun: true }
      }
    )
    return data.preview
  }

  async function startSync(body: {
    fromBackendId: string
    toBackendId: string
    deleteSource?: boolean
    setDefault?: boolean
  }) {
    try {
      const data = await $fetch<{ job: BackupJobItem }>(
        '/api/admin/storage/sync',
        {
          method: 'POST',
          credentials: 'include',
          body
        }
      )
      await refreshJobsFirstPage()
      startPolling()
      toast.add({ title: t('storage.backup.syncStarted'), color: 'success' })
      return data.job
    } catch (error: unknown) {
      handleError(error, t('storage.backup.syncFailed'))
      throw error
    }
  }

  async function retryJob(jobId: string) {
    try {
      await $fetch(`/api/admin/backup/jobs/${jobId}/retry`, {
        method: 'POST',
        credentials: 'include'
      })
      await refreshJobsFirstPage()
      startPolling()
      toast.add({ title: t('storage.backup.retryStarted'), color: 'success' })
    } catch (error: unknown) {
      handleError(error, t('storage.backup.retryFailed'))
    }
  }

  function downloadUrl(jobId: string): string {
    return `/api/admin/backup/jobs/${jobId}/download`
  }

  function handleError(error: unknown, fallback: string) {
    const status = typeof error === 'object' && error !== null && 'statusCode' in error
      ? (error as { statusCode: number }).statusCode
      : 0
    if (status === 409) {
      toast.add({ title: t('storage.backup.jobRunning'), color: 'warning' })
      return
    }
    toast.add({ title: fallback, color: 'error' })
  }

  onUnmounted(() => {
    stopPolling()
  })

  return {
    jobs,
    jobsPage,
    jobsPageSize,
    jobsTotal,
    jobsTotalPages,
    jobsLoading,
    estimate,
    packages,
    loadingEstimate,
    polling,
    hasActiveJob,
    getActiveJob,
    loadJobs,
    setJobsPage,
    setJobsPageSize,
    loadEstimate,
    startPolling,
    stopPolling,
    createExport,
    previewRestore,
    confirmRestore,
    previewSync,
    startSync,
    retryJob,
    cancelJob,
    downloadUrl,
    restoreWatchSession,
    pollWatchedJob,
    pollRestoreJobPublic
  }
}

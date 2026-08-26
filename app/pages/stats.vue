<script setup lang="ts">
interface StatsResponse {
  uploadToday: number
  uploadMonth: number
  deleteToday: number
  deleteMonth: number
  uploadTotal: number
  deleteTotal: number
  uploadBytesTotal: number
  storedCount: number
  userCount?: number
  bySource: {
    web: number
    api: number
    twikoo: number
  }
  byFolder: Array<{
    folder: string
    count: number
    bytes: number
  }>
  byFolderUploads: Array<{
    folder: string
    count: number
  }>
}

const {
  items,
  page: galleryPage,
  totalPages: galleryTotalPages,
  total: galleryTotal,
  loading: galleryLoading,
  searchQuery,
  activeSearch,
  listSummary,
  refreshList,
  fetchList,
  fetchSearch,
  fetchTotal,
  setActiveFolder,
  submitSearch,
  goToPage,
  removeItems
} = useImageList()

const { formatFileSize } = useFileSize()
const { isChecking, isAuthenticated, checkSession, handleAuthError, fetchStatus, isAdmin } = useAuth()
const toast = useToast()
const { t } = useI18n()

const stats = ref<StatsResponse | null>(null)
const statsLoading = ref(false)
const pageRefreshing = computed(() => statsLoading.value || galleryLoading.value)

const selectedKeys = ref<Set<string>>(new Set())
const deletingKeys = ref<Set<string>>(new Set())
const deleteModalOpen = ref(false)
const deleteTargetKeys = ref<string[]>([])
const batchDeleting = ref(false)
const showScrollTop = ref(false)
const currentFolder = ref('all')
const folderOptions = ref<string[]>(['images'])

const folderSelectItems = computed(() => [
  { label: t('stats.allFolders'), value: 'all' },
  ...folderOptions.value.map(folder => ({ label: folder, value: folder }))
])

const selectedCount = computed(() => selectedKeys.value.size)

const FOLDER_CHART_COLORS = [
  'var(--ui-primary)',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4'
]

const folderUploadItems = computed(() =>
  (stats.value?.byFolderUploads ?? []).map((item, index) => ({
    key: item.folder,
    label: item.folder,
    count: item.count,
    color: FOLDER_CHART_COLORS[index % FOLDER_CHART_COLORS.length]!
  }))
)

const donutSegments = computed(() =>
  folderUploadItems.value.map(item => ({
    label: item.label,
    value: item.count,
    color: item.color
  }))
)

const folderStats = computed(() => stats.value?.byFolder ?? [])

const folderMaxBytes = computed(() =>
  Math.max(...folderStats.value.map(item => item.bytes), 1)
)

const uploadChartTotal = computed(() =>
  folderUploadItems.value.reduce((sum, item) => sum + item.count, 0)
)

const statCards = computed(() => {
  const s = stats.value
  const base = [
    { label: t('stats.uploadToday'), value: s?.uploadToday ?? '—' },
    { label: t('stats.uploadMonth'), value: s?.uploadMonth ?? '—' },
    { label: t('stats.uploadTotal'), value: s?.uploadTotal ?? '—' },
    { label: t('stats.storedCount'), value: s?.storedCount ?? '—' },
    { label: t('stats.deleteToday'), value: s?.deleteToday ?? '—' },
    { label: t('stats.deleteMonth'), value: s?.deleteMonth ?? '—' },
    isAdmin.value
      ? { label: t('stats.userCount'), value: s?.userCount ?? '—' }
      : { label: t('stats.deleteTotal'), value: s?.deleteTotal ?? '—' },
    { label: t('stats.uploadBytes'), value: s ? formatFileSize(s.uploadBytesTotal) : '—' }
  ]
  return base
})

function onWindowScroll() {
  showScrollTop.value = window.scrollY > 400
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function folderPercent(bytes: number) {
  return Math.round((bytes / folderMaxBytes.value) * 100)
}

async function loadFolders() {
  const data = await $fetch<{ folders: string[] }>('/api/folders', {
    credentials: 'include'
  })
  folderOptions.value = [...data.folders]
}

async function fetchStats() {
  stats.value = await $fetch<StatsResponse>('/api/stats', {
    credentials: 'include'
  })
}

async function refreshStats() {
  statsLoading.value = true
  try {
    await fetchStats()
  } catch (error: unknown) {
    handleAuthError(error)
    if (isAuthenticated.value) {
      toast.add({ title: t('stats.loadFailed'), color: 'error' })
    }
  } finally {
    statsLoading.value = false
  }
}

async function refreshGallery() {
  if (!isAuthenticated.value) return
  selectedKeys.value = new Set()
  try {
    await Promise.all([refreshList(), loadFolders()])
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

async function reloadGallery() {
  if (activeSearch.value) {
    await fetchSearch(galleryPage.value)
  } else {
    await fetchList(galleryPage.value)
  }
  await fetchTotal()
}

async function refreshAll() {
  if (!isAuthenticated.value) return
  selectedKeys.value = new Set()
  statsLoading.value = true
  try {
    await Promise.all([
      fetchStats(),
      reloadGallery(),
      loadFolders()
    ])
  } catch (error: unknown) {
    handleAuthError(error)
    if (isAuthenticated.value) {
      toast.add({ title: t('stats.loadFailed'), color: 'error' })
    }
  } finally {
    statsLoading.value = false
  }
}

async function handleFolderChange(folder: string) {
  if (!isAuthenticated.value) return
  currentFolder.value = folder
  selectedKeys.value = new Set()
  try {
    await setActiveFolder(folder)
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

async function handleSearch() {
  if (!isAuthenticated.value) return
  selectedKeys.value = new Set()
  try {
    await submitSearch()
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

async function clearSearch() {
  searchQuery.value = ''
  if (!activeSearch.value) return
  await refreshGallery()
}

function requestDelete(key: string) {
  if (!isAuthenticated.value) return
  deleteTargetKeys.value = [key]
  deleteModalOpen.value = true
}

function requestBatchDelete() {
  if (!isAuthenticated.value) return
  if (!selectedCount.value) {
    toast.add({ title: t('stats.selectFirst'), color: 'warning' })
    return
  }
  deleteTargetKeys.value = Array.from(selectedKeys.value)
  deleteModalOpen.value = true
}

async function confirmDelete() {
  const keys = [...deleteTargetKeys.value]
  if (!keys.length || !isAuthenticated.value) return

  batchDeleting.value = true
  for (const key of keys) {
    deletingKeys.value.add(key)
  }

  const deleted: string[] = []
  const failed: string[] = []

  try {
    const response = await $fetch<{
      deleted: string[]
      failed: Array<{ key: string }>
    }>('/api/images/batch-delete', {
      method: 'POST',
      body: { keys }
    })
    deleted.push(...response.deleted)
    failed.push(...response.failed.map(item => item.key))

    if (deleted.length) {
      removeItems(deleted)
      for (const key of deleted) {
        selectedKeys.value.delete(key)
      }
      selectedKeys.value = new Set(selectedKeys.value)
      toast.add({
        title: t('stats.deleted', { n: deleted.length }),
        color: 'success'
      })
      await refreshStats()
    }

    if (failed.length) {
      toast.add({
        title: t('stats.deletePartialFail', { n: failed.length }),
        color: 'error'
      })
    }

    deleteModalOpen.value = false
    deleteTargetKeys.value = []
  } catch (error: unknown) {
    handleAuthError(error)
    if (isAuthenticated.value) {
      toast.add({ title: t('stats.deleteFailed'), color: 'error' })
    }
  } finally {
    batchDeleting.value = false
    deletingKeys.value = new Set()
  }
}

async function handleGalleryPageChange(targetPage: number) {
  selectedKeys.value = new Set()
  try {
    await goToPage(targetPage)
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

onMounted(async () => {
  window.addEventListener('scroll', onWindowScroll, { passive: true })
  const status = await fetchStatus()
  if (!status.initialized && !status.legacyMode) {
    await navigateTo('/setup')
    return
  }
  await checkSession()
  if (isAuthenticated.value) {
    await refreshAll()
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', onWindowScroll)
})

watch(isAuthenticated, async (authed, prev) => {
  if (authed && prev === false) {
    await nextTick()
    await refreshAll()
  } else if (!authed) {
    stats.value = null
    items.value = []
    selectedKeys.value = new Set()
  }
})
</script>

<template>
  <div class="min-h-screen">
    <div
      v-if="isChecking"
      class="flex min-h-screen items-center justify-center"
    >
      <div class="flex flex-col items-center gap-3 text-muted">
        <UIcon
          name="i-lucide-loader-circle"
          class="size-8 animate-spin"
        />
        <p class="text-sm">
          {{ t('common.loadingSession') }}
        </p>
      </div>
    </div>

    <AdminLoginGate v-else-if="!isAuthenticated" />

    <AppShell v-else>
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h1 class="text-2xl font-semibold tracking-tight">
            {{ t('stats.title') }}
          </h1>
          <p class="text-sm text-muted">
            {{ t('stats.subtitle') }}
          </p>
        </div>

        <UButton
          icon="i-lucide-refresh-cw"
          variant="ghost"
          color="neutral"
          size="sm"
          class="mt-0.5 shrink-0"
          :aria-label="t('common.refresh')"
          :loading="pageRefreshing"
          @click="refreshAll"
        />
      </div>

      <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div
          v-for="item in statCards"
          :key="item.label"
          class="rounded-xl border border-default bg-elevated p-4"
        >
          <p class="text-xs text-muted">
            {{ item.label }}
          </p>
          <p class="mt-1 text-2xl font-semibold tabular-nums">
            {{ item.value }}
          </p>
        </div>
      </section>

      <section class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-xl border border-default bg-elevated p-4">
          <h2 class="mb-3 text-sm font-medium text-muted">
            {{ t('stats.folderDistribution') }}
          </h2>
          <div
            v-if="!uploadChartTotal"
            class="py-6 text-center text-xs text-muted"
          >
            {{ t('stats.noData') }}
          </div>
          <StatsDonut
            v-else
            :segments="donutSegments"
            :size="88"
          />
        </div>

        <div class="rounded-xl border border-default bg-elevated p-4">
          <h2 class="mb-3 text-sm font-medium text-muted">
            {{ t('stats.folderUsage') }}
          </h2>
          <div
            v-if="!folderStats.length"
            class="py-6 text-center text-xs text-muted"
          >
            {{ t('stats.noData') }}
          </div>
          <ul
            v-else
            class="space-y-2.5"
          >
            <li
              v-for="item in folderStats"
              :key="item.folder"
            >
              <div class="mb-1 flex items-center justify-between gap-2 text-xs">
                <span class="font-medium">{{ item.folder }}</span>
                <span class="tabular-nums text-muted">
                  {{ t('stats.folderCount', { count: item.count, size: formatFileSize(item.bytes) }) }}
                </span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-muted/50">
                <div
                  class="h-full rounded-full bg-primary/70"
                  :style="{ width: `${Math.max(folderPercent(item.bytes), item.bytes ? 4 : 0)}%` }"
                />
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div class="min-w-0">
            <h2 class="text-lg font-medium">
              {{ t('stats.gallery') }}
            </h2>
            <p
              v-if="!galleryLoading"
              class="mt-0.5 text-sm text-muted"
            >
              {{ listSummary }}
            </p>
          </div>

          <form
            class="flex flex-wrap items-center justify-end gap-2"
            @submit.prevent="handleSearch"
          >
            <UBadge
              v-if="selectedCount"
              color="primary"
              variant="subtle"
              class="shrink-0"
            >
              {{ t('stats.selected', { n: selectedCount }) }}
            </UBadge>
            <USelect
              v-model="currentFolder"
              :items="folderSelectItems"
              class="w-[5.5rem] shrink-0 sm:w-32"
              size="sm"
              :aria-label="t('stats.folder')"
              @update:model-value="handleFolderChange"
            />
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              :placeholder="t('stats.searchPlaceholder')"
              class="w-36 shrink-0 sm:w-44"
              size="sm"
              :disabled="galleryLoading"
            />
            <UButton
              type="submit"
              icon="i-lucide-search"
              size="sm"
              class="shrink-0"
              :aria-label="t('common.search')"
              :loading="galleryLoading"
            >
              <span class="hidden sm:inline">{{ t('common.search') }}</span>
            </UButton>
            <UButton
              v-if="activeSearch"
              type="button"
              icon="i-lucide-x"
              size="sm"
              variant="ghost"
              color="neutral"
              class="shrink-0"
              :aria-label="t('stats.clear')"
              @click="clearSearch"
            >
              <span class="hidden sm:inline">{{ t('stats.clear') }}</span>
            </UButton>
            <UButton
              type="button"
              icon="i-lucide-trash-2"
              color="error"
              variant="soft"
              size="sm"
              class="shrink-0"
              :aria-label="t('stats.batchDelete')"
              :disabled="!selectedCount"
              @click="requestBatchDelete"
            >
              <span class="hidden sm:inline">{{ t('stats.batchDelete') }}</span>
            </UButton>
          </form>
        </div>

        <div
          v-if="galleryLoading"
          class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <USkeleton
            v-for="n in 12"
            :key="n"
            class="aspect-square rounded-lg"
          />
        </div>

        <ImageGrid
          v-else
          :show-key="false"
          :items="items"
          :selected-keys="selectedKeys"
          :deleting-keys="deletingKeys"
          @update:selected-keys="selectedKeys = $event"
          @delete="requestDelete"
        />

        <PaginationBar
          v-if="!galleryLoading && galleryTotal > 0"
          :page="galleryPage"
          :total-pages="galleryTotalPages"
          :total="galleryTotal"
          :unit="t('common.imagesUnit')"
          :loading="galleryLoading"
          @update:page="handleGalleryPageChange"
        />
      </section>

      <DeleteConfirmModal
        v-model:open="deleteModalOpen"
        :count="deleteTargetKeys.length"
        :loading="batchDeleting"
        @confirm="confirmDelete"
      />

      <UButton
        v-show="showScrollTop"
        icon="i-lucide-arrow-up"
        :aria-label="t('stats.scrollTop')"
        color="primary"
        class="fixed bottom-6 right-6 z-50 shadow-lg"
        size="lg"
        @click="scrollToTop"
      />
    </AppShell>
  </div>
</template>

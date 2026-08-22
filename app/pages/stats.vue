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
  initializeList,
  setActiveFolder,
  submitSearch,
  goToPage,
  removeItems
} = useImageList()

const { formatFileSize } = useFileSize()
const { isChecking, isAuthenticated, checkSession, handleAuthError, fetchStatus, isAdmin } = useAuth()
const toast = useToast()

const stats = ref<StatsResponse | null>(null)
const statsLoading = ref(false)

const selectedKeys = ref<Set<string>>(new Set())
const deletingKeys = ref<Set<string>>(new Set())
const deleteModalOpen = ref(false)
const deleteTargetKeys = ref<string[]>([])
const batchDeleting = ref(false)
const showScrollTop = ref(false)
const currentFolder = ref('all')
const folderOptions = ref<string[]>(['images'])

const folderSelectItems = computed(() => [
  { label: '全部', value: 'all' },
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
    { label: '今日上传', value: s?.uploadToday ?? '—' },
    { label: '本月上传', value: s?.uploadMonth ?? '—' },
    { label: '累计上传', value: s?.uploadTotal ?? '—' },
    { label: '当前库存', value: s?.storedCount ?? '—' },
    { label: '今日删除', value: s?.deleteToday ?? '—' },
    { label: '本月删除', value: s?.deleteMonth ?? '—' },
    isAdmin.value
      ? { label: '注册用户数量', value: s?.userCount ?? '—' }
      : { label: '累计删除', value: s?.deleteTotal ?? '—' },
    { label: '累计上传体积', value: s ? formatFileSize(s.uploadBytesTotal) : '—' }
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
      toast.add({ title: '加载统计失败', color: 'error' })
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

async function refreshAll() {
  if (!isAuthenticated.value) return
  currentFolder.value = 'all'
  await Promise.all([
    refreshStats(),
    initializeList('all').then(() => loadFolders())
  ])
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
    toast.add({ title: '请先选择图片', color: 'warning' })
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
        title: `已删除 ${deleted.length} 张图片`,
        color: 'success'
      })
      await refreshStats()
    }

    if (failed.length) {
      toast.add({
        title: `${failed.length} 张图片删除失败`,
        color: 'error'
      })
    }

    deleteModalOpen.value = false
    deleteTargetKeys.value = []
  } catch (error: unknown) {
    handleAuthError(error)
    if (isAuthenticated.value) {
      toast.add({ title: '删除失败', color: 'error' })
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
          正在验证登录状态…
        </p>
      </div>
    </div>

    <AdminLoginGate v-else-if="!isAuthenticated" />

    <AppShell v-else>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">
            统计
          </h1>
          <p class="text-sm text-muted">
            数据概览与图库记录
          </p>
        </div>

        <UButton
          icon="i-lucide-refresh-cw"
          label="刷新"
          variant="outline"
          :loading="statsLoading || galleryLoading"
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
            上传目录分布
          </h2>
          <div
            v-if="!uploadChartTotal"
            class="py-6 text-center text-xs text-muted"
          >
            暂无数据
          </div>
          <StatsDonut
            v-else
            :segments="donutSegments"
            :size="88"
          />
        </div>

        <div class="rounded-xl border border-default bg-elevated p-4">
          <h2 class="mb-3 text-sm font-medium text-muted">
            目录占用
          </h2>
          <div
            v-if="!folderStats.length"
            class="py-6 text-center text-xs text-muted"
          >
            暂无数据
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
                  {{ item.count }} 张 · {{ formatFileSize(item.bytes) }}
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
        <form
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          @submit.prevent="handleSearch"
        >
          <div class="min-w-0 shrink-0">
            <h2 class="text-lg font-medium">
              图库记录
            </h2>
            <p
              v-if="!galleryLoading"
              class="text-sm text-muted"
            >
              {{ listSummary }}
            </p>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-2">
            <div class="flex items-center gap-1.5">
              <span class="text-xs text-muted shrink-0">目录</span>
              <USelect
                v-model="currentFolder"
                :items="folderSelectItems"
                class="w-28"
                @update:model-value="handleFolderChange"
              />
            </div>

            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              placeholder="搜索文件名"
              class="w-40 sm:w-48"
              size="sm"
              :disabled="galleryLoading"
            />

            <UButton
              type="submit"
              label="搜索"
              size="sm"
              :loading="galleryLoading"
            />
            <UButton
              v-if="activeSearch"
              type="button"
              label="清除"
              size="sm"
              variant="ghost"
              color="neutral"
              @click="clearSearch"
            />

            <UButton
              type="button"
              icon="i-lucide-refresh-cw"
              label="刷新"
              variant="outline"
              size="sm"
              :loading="galleryLoading"
              @click="refreshGallery"
            />
            <UBadge
              v-if="selectedCount"
              color="primary"
              variant="subtle"
            >
              已选 {{ selectedCount }}
            </UBadge>
            <UButton
              type="button"
              icon="i-lucide-trash-2"
              label="批量删除"
              color="error"
              variant="soft"
              size="sm"
              :disabled="!selectedCount"
              @click="requestBatchDelete"
            />
          </div>
        </form>

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
          unit="张"
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
        aria-label="回到顶部"
        color="primary"
        class="fixed bottom-6 right-6 z-50 shadow-lg"
        size="lg"
        @click="scrollToTop"
      />
    </AppShell>
  </div>
</template>

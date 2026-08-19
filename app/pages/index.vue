<script setup lang="ts">
const {
  items,
  truncated,
  loading,
  loadingMore,
  searchQuery,
  activeSearch,
  listSummary,
  refreshList,
  submitSearch,
  loadMore,
  prependItems,
  removeItems
} = useImageList()

const {
  uploading,
  compressEnabled,
  progressItems,
  uploadFiles
} = useImageUpload()

const { isChecking, isAuthenticated, checkSession, logout, handleAuthError } = useAdminAuth()

const toast = useToast()
const selectedKeys = ref<Set<string>>(new Set())
const deletingKeys = ref<Set<string>>(new Set())
const deleteModalOpen = ref(false)
const deleteTargetKeys = ref<string[]>([])
const batchDeleting = ref(false)
const showScrollTop = ref(false)

const selectedCount = computed(() => selectedKeys.value.size)

function onWindowScroll() {
  showScrollTop.value = window.scrollY > 400
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function loadDashboard() {
  try {
    await refreshList()
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

onMounted(() => {
  checkSession()
  window.addEventListener('scroll', onWindowScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onWindowScroll)
})

watch(isAuthenticated, async (authed) => {
  if (authed) {
    await nextTick()
    await loadDashboard()
  } else {
    items.value = []
    selectedKeys.value = new Set()
  }
})

async function handleLogout() {
  await logout()
}

async function handleUpload(files: File[]) {
  if (!isAuthenticated.value) {
    toast.add({ title: '请先登录', color: 'warning' })
    return
  }

  try {
    const result = await uploadFiles(files)
    if (result?.items.length) {
      prependItems(result.items)
    }
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

async function refresh() {
  if (!isAuthenticated.value) return
  selectedKeys.value = new Set()
  try {
    await refreshList()
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
  await refresh()
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

async function handleLoadMore() {
  try {
    await loadMore()
  } catch (error: unknown) {
    handleAuthError(error)
  }
}
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

    <AdminLoginGate
      v-else-if="!isAuthenticated"
    />

    <div
      v-else
      class="mx-auto max-w-7xl space-y-6 p-4 sm:p-6"
    >
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">
            PicHost
          </h1>
          <p class="text-sm text-muted">
            个人轻量图床
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UBadge
            color="success"
            variant="subtle"
            icon="i-lucide-shield-check"
          >
            已登录
          </UBadge>
          <UCheckbox
            v-model="compressEnabled"
            label="上传前压缩为 WebP"
          />
          <UButton
            icon="i-lucide-refresh-cw"
            label="刷新"
            variant="outline"
            :loading="loading"
            @click="refresh"
          />
          <UBadge
            v-if="selectedCount"
            color="primary"
            variant="subtle"
          >
            已选 {{ selectedCount }}
          </UBadge>
          <UButton
            icon="i-lucide-trash-2"
            label="批量删除"
            color="error"
            variant="soft"
            :disabled="!selectedCount"
            @click="requestBatchDelete"
          />
          <UButton
            icon="i-lucide-log-out"
            label="退出"
            variant="ghost"
            color="neutral"
            @click="handleLogout"
          />
        </div>
      </header>

      <ImageUploader
        :disabled="uploading"
        @upload="handleUpload"
      />

      <UploadResult :items="progressItems" />

      <section class="space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 class="text-lg font-medium">
              图片列表
            </h2>
            <p
              v-if="!loading"
              class="text-sm text-muted"
            >
              {{ listSummary }}
            </p>
          </div>

          <form
            class="flex w-full max-w-md gap-2"
            @submit.prevent="handleSearch"
          >
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              placeholder="按文件名或路径搜索"
              class="flex-1"
              :disabled="loading"
            />
            <UButton
              type="submit"
              label="搜索"
              :loading="loading"
            />
            <UButton
              v-if="activeSearch"
              label="清除"
              variant="ghost"
              color="neutral"
              @click="clearSearch"
            />
          </form>
        </div>

        <div
          v-if="loading"
          class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <USkeleton
            v-for="n in 8"
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

        <div
          v-if="truncated"
          class="flex justify-center pt-2"
        >
          <UButton
            label="加载更多"
            variant="outline"
            :loading="loadingMore"
            @click="handleLoadMore"
          />
        </div>
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
    </div>
  </div>
</template>

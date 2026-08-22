<script setup lang="ts">
import type { ImageItem } from '~/types/image'

const { uploading, progressItems, uploadFiles } = useImageUpload()

const {
  defaultFolder,
  autoCopyMarkdown,
  copyFormat,
  loadPreferences
} = useUploadPreferences()

const { isChecking, isAuthenticated, checkSession, handleAuthError, fetchStatus, isAdmin }
  = useAuth()
const toast = useToast()
const folderOptions = ref<string[]>(['images'])
const sessionItems = ref<ImageItem[]>([])
const deletingKeys = ref<Set<string>>(new Set())
const emptySelection = ref(new Set<string>())

const showProgress = computed(
  () =>
    uploading.value
    || progressItems.value.some(
      item =>
        item.status === 'pending'
        || item.status === 'uploading'
        || item.status === 'error'
    )
)

async function loadFolders() {
  const data = await $fetch<{ folders: string[] }>('/api/folders', {
    credentials: 'include'
  })
  folderOptions.value = [...data.folders]
  if (!folderOptions.value.includes(defaultFolder.value)) {
    defaultFolder.value = folderOptions.value[0] ?? 'images'
  }
}

async function loadPage() {
  try {
    loadPreferences()
    if (isAdmin.value) {
      await loadFolders()
    }
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

onMounted(async () => {
  const status = await fetchStatus()
  if (!status.initialized && !status.legacyMode) {
    await navigateTo('/setup')
    return
  }
  if (!isAuthenticated.value) {
    await checkSession()
  }
  if (isAuthenticated.value) {
    await loadPage()
  }
})

watch(isAuthenticated, async (authed, prev) => {
  if (authed && prev === false) {
    await nextTick()
    await loadPage()
  } else if (!authed) {
    sessionItems.value = []
  }
})

function copyFormatLabel() {
  switch (copyFormat.value) {
    case 'url':
      return '直链'
    case 'html':
      return 'HTML'
    default:
      return 'Markdown'
  }
}

async function copyUploadLink(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    toast.add({ title: `已复制 ${copyFormatLabel()}`, color: 'success' })
  } catch {
    toast.add({ title: '复制失败', color: 'error' })
  }
}

async function handleUpload(files: File[]) {
  if (!isAuthenticated.value) {
    toast.add({ title: '请先登录', color: 'warning' })
    return
  }

  try {
    const uploadTarget = isAdmin.value
      ? (defaultFolder.value.trim() || 'images')
      : 'images'
    const result = await uploadFiles(files, uploadTarget, {
      includeFolder: isAdmin.value
    })
    if (result?.items.length) {
      sessionItems.value = [...result.items, ...sessionItems.value]
      if (isAdmin.value) {
        const folder = uploadTarget
        if (!folderOptions.value.includes(folder)) {
          folderOptions.value = [...folderOptions.value, folder]
        }
      }
      if (autoCopyMarkdown.value && result.items[0]) {
        const first = result.items[0]
        const text
          = copyFormat.value === 'url'
            ? first.url
            : copyFormat.value === 'html'
              ? first.html
              : first.markdown
        if (text) await copyUploadLink(text)
      }
    }
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

async function handleDelete(key: string) {
  deletingKeys.value.add(key)
  try {
    await $fetch('/api/images', {
      method: 'DELETE',
      query: { key }
    })
    sessionItems.value = sessionItems.value.filter(item => item.key !== key)
    toast.add({ title: '已删除', color: 'success' })
  } catch (error: unknown) {
    handleAuthError(error)
    toast.add({ title: '删除失败', color: 'error' })
  } finally {
    deletingKeys.value.delete(key)
    deletingKeys.value = new Set(deletingKeys.value)
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

    <AdminLoginGate v-else-if="!isAuthenticated" />

    <AppShell v-else>
      <UploadFlipCard
        :disabled="uploading"
        @upload="handleUpload"
      />

      <UploadResult
        v-if="showProgress"
        :items="progressItems"
      />

      <section
        v-if="sessionItems.length"
        class="space-y-4"
      >
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-lg font-medium">
            本次上传
            <span class="ml-1 text-sm font-normal text-muted">({{ sessionItems.length }})</span>
          </h2>
        </div>

        <ImageGrid
          :items="sessionItems"
          :selected-keys="emptySelection"
          :deleting-keys="deletingKeys"
          :selectable="false"
          :show-key="false"
          empty-text="暂无本次上传"
          @update:selected-keys="() => {}"
          @delete="handleDelete"
        />
      </section>
    </AppShell>
  </div>
</template>

<script setup lang="ts">
import type { ActivityLogListResponse, ActivityLogStorage, LogAction, LogSource } from '~/types/logs'

const { isChecking, isAuthenticated, checkSession, handleAuthError, fetchStatus, isAdmin } = useAuth()
const toast = useToast()
const { t, locale } = useI18n()
const { formatFileSize } = useFileSize()

const loading = ref(true)
const page = ref(1)
const actionFilter = ref<'all' | LogAction>('all')
const sourceFilter = ref<'all' | LogSource>('all')
const userFilter = ref<'all' | number>('all')
const searchQuery = ref('')
const activeSearch = ref('')
const listData = ref<ActivityLogListResponse | null>(null)
const imageLinkBase = ref('')
const hideFolderInUrl = ref(false)

const pageSize = 10

const summaryLabel = computed(() => {
  const summary = listData.value?.summary
  if (!summary) return ''
  return t('logs.summaryAll', {
    total: summary.total,
    upload: summary.upload,
    delete: summary.delete
  })
})

const actionItems = computed(() => [
  { label: t('logs.filterActionAll'), value: 'all' as const },
  { label: t('logs.actionUpload'), value: 'upload' as const },
  { label: t('logs.actionDelete'), value: 'delete' as const }
])

const sourceItems = computed(() => [
  { label: t('logs.filterSourceAll'), value: 'all' as const },
  { label: t('logs.sourceWeb'), value: 'web' as const },
  { label: t('logs.sourceApi'), value: 'api' as const },
  { label: t('logs.sourceTwikoo'), value: 'twikoo' as const }
])

const userItems = computed(() => {
  const items: Array<{ label: string, value: 'all' | number }> = [
    { label: t('logs.filterUserAll'), value: 'all' }
  ]
  for (const user of listData.value?.users ?? []) {
    items.push({ label: user.username, value: user.id })
  }
  return items
})

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleString(locale.value, { hour12: false })
  } catch {
    return value
  }
}

function formatTimeShort(value: string) {
  try {
    return new Date(value).toLocaleString(locale.value, {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  } catch {
    return value
  }
}

function folderFromKey(key: string) {
  const slash = key.indexOf('/')
  return slash > 0 ? key.slice(0, slash) : '(root)'
}

function actionColor(action: LogAction) {
  return action === 'upload' ? 'success' : 'error'
}

function actionIcon(action: LogAction) {
  return action === 'upload' ? 'i-lucide-upload' : 'i-lucide-trash-2'
}

function sourceLabel(source: LogSource) {
  switch (source) {
    case 'web':
      return t('logs.sourceWeb')
    case 'api':
      return t('logs.sourceApi')
    case 'twikoo':
      return t('logs.sourceTwikoo')
  }
}

function storageIcon(storage: ActivityLogStorage | null) {
  return storage?.type === 'local' ? 'i-lucide-hard-drive' : 'i-lucide-cloud'
}

function publicPathFromKey(key: string) {
  if (!hideFolderInUrl.value) return key
  const slash = key.lastIndexOf('/')
  return slash >= 0 ? key.slice(slash + 1) : key
}

function imageUrl(key: string) {
  const base = imageLinkBase.value.replace(/\/$/, '')
  const path = publicPathFromKey(key)
  if (!base) return `/${path}`
  return `${base}/${path}`
}

async function loadImageLinkBase() {
  try {
    if (isAdmin.value) {
      const data = await $fetch<{ imageBaseUrl: string, hideFolderInUrl: boolean }>('/api/settings', {
        credentials: 'include'
      })
      imageLinkBase.value = data.imageBaseUrl
      hideFolderInUrl.value = data.hideFolderInUrl
      return
    }
    const data = await $fetch<{ env: { imageBaseUrl: string, hideFolderInUrl: boolean } }>('/api/user/api-token', {
      credentials: 'include'
    })
    imageLinkBase.value = data.env.imageBaseUrl
    hideFolderInUrl.value = data.env.hideFolderInUrl
  } catch {
    if (import.meta.client) {
      imageLinkBase.value = window.location.origin
    }
  }
}

async function loadLogs() {
  loading.value = true
  try {
    const query: Record<string, string | number> = {
      page: page.value,
      limit: pageSize
    }
    if (actionFilter.value !== 'all') {
      query.action = actionFilter.value
    }
    if (sourceFilter.value !== 'all') {
      query.source = sourceFilter.value
    }
    if (isAdmin.value && userFilter.value !== 'all') {
      query.userId = userFilter.value
    }
    if (activeSearch.value) {
      query.q = activeSearch.value
    }

    listData.value = await $fetch<ActivityLogListResponse>('/api/logs', {
      credentials: 'include',
      query
    })
    page.value = listData.value.page
  } catch (error: unknown) {
    handleAuthError(error)
    if (isAuthenticated.value) {
      toast.add({ title: t('logs.loadFailed'), color: 'error' })
    }
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 1
  void loadLogs()
}

function submitSearch() {
  activeSearch.value = searchQuery.value.trim()
  applyFilters()
}

function clearSearch() {
  searchQuery.value = ''
  activeSearch.value = ''
  applyFilters()
}

function handlePageChange(target: number) {
  page.value = target
  void loadLogs()
}

onMounted(async () => {
  const status = await fetchStatus()
  if (!status.initialized && !status.legacyMode) {
    await navigateTo('/setup')
    return
  }
  await checkSession()
  if (!isAuthenticated.value) {
    await navigateTo('/')
    return
  }
  await loadImageLinkBase()
  await loadLogs()
})

watch(isAuthenticated, async (authed, prev) => {
  if (authed && prev === false) {
    await loadImageLinkBase()
    await loadLogs()
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
      <section class="min-w-0 overflow-x-hidden rounded-2xl border border-default bg-elevated shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-3 border-b border-default px-4 py-4 sm:px-6">
          <div class="flex items-start gap-2">
            <UIcon
              name="i-lucide-scroll-text"
              class="mt-0.5 size-5 shrink-0 text-primary"
            />
            <div>
              <h1 class="text-base font-semibold">
                {{ t('logs.pageTitle') }}
              </h1>
              <p class="mt-0.5 text-xs text-muted">
                {{ isAdmin ? t('logs.pageSubtitleAdmin') : t('logs.pageSubtitle') }}
              </p>
            </div>
          </div>
          <UButton
            icon="i-lucide-refresh-cw"
            variant="ghost"
            color="neutral"
            size="sm"
            :aria-label="t('common.refresh')"
            :loading="loading"
            @click="loadLogs"
          />
        </div>

        <form
          class="border-b border-default px-4 py-3 sm:px-6"
          @submit.prevent="submitSearch"
        >
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p
              v-if="summaryLabel"
              class="text-xs text-muted"
            >
              {{ summaryLabel }}
            </p>
            <p
              v-else
              class="text-xs text-muted"
            >
              {{ t('stats.counting') }}
            </p>

            <div class="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
              <USelect
                v-if="isAdmin"
                v-model="userFilter"
                :items="userItems"
                value-key="value"
                class="min-w-0 w-full sm:w-36"
                size="sm"
                @update:model-value="applyFilters"
              />
              <USelect
                v-model="actionFilter"
                :items="actionItems"
                value-key="value"
                class="min-w-0 w-[calc(50%-0.25rem)] sm:w-32"
                size="sm"
                @update:model-value="applyFilters"
              />
              <USelect
                v-model="sourceFilter"
                :items="sourceItems"
                value-key="value"
                class="min-w-0 w-[calc(50%-0.25rem)] sm:w-36"
                size="sm"
                @update:model-value="applyFilters"
              />
              <div class="flex min-w-0 w-full items-center gap-2 sm:w-auto">
                <UInput
                  v-model="searchQuery"
                  icon="i-lucide-search"
                  :placeholder="t('logs.searchPlaceholder')"
                  class="min-w-0 flex-1 sm:w-40 sm:flex-none"
                  size="sm"
                  :disabled="loading"
                />
                <UButton
                  type="submit"
                  icon="i-lucide-search"
                  size="sm"
                  class="shrink-0"
                  :aria-label="t('common.search')"
                  :loading="loading"
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
              </div>
            </div>
          </div>
        </form>

        <div
          v-if="loading"
          class="p-4 sm:p-6"
        >
          <div class="space-y-3 sm:hidden">
            <USkeleton
              v-for="n in 6"
              :key="`mobile-${n}`"
              class="h-24 rounded-lg"
            />
          </div>
          <div class="hidden space-y-2 sm:block">
            <USkeleton
              v-for="n in 8"
              :key="`desktop-${n}`"
              class="h-12 rounded-lg"
            />
          </div>
        </div>

        <template v-else-if="listData && listData.items.length">
          <div class="min-w-0 sm:hidden">
            <div class="divide-y divide-default">
              <article
                v-for="row in listData.items"
                :key="row.id"
                class="min-w-0 px-4 py-3.5"
              >
                <div class="flex items-start justify-between gap-3">
                  <time class="text-xs text-muted">
                    {{ formatTimeShort(row.createdAt) }}
                  </time>
                  <span class="shrink-0 text-xs tabular-nums text-muted">
                    {{ formatFileSize(row.size) }}
                  </span>
                </div>

                <div class="mt-2 flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
                  <UBadge
                    :color="actionColor(row.action)"
                    variant="subtle"
                    size="xs"
                  >
                    <UIcon
                      :name="actionIcon(row.action)"
                      class="mr-1 size-3"
                    />
                    {{ row.action === 'upload' ? t('logs.actionUpload') : t('logs.actionDelete') }}
                  </UBadge>
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    size="xs"
                  >
                    {{ sourceLabel(row.source) }}
                  </UBadge>
                  <span
                    v-if="isAdmin"
                    class="text-xs text-muted"
                  >
                    {{ row.username ?? '—' }}
                  </span>
                  <UBadge
                    v-if="row.storage"
                    color="neutral"
                    variant="subtle"
                    size="xs"
                    class="max-w-full truncate"
                  >
                    <UIcon
                      :name="storageIcon(row.storage)"
                      class="mr-1 size-3"
                    />
                    {{ row.storage.name }}
                  </UBadge>
                </div>

                <p
                  class="mt-2 truncate text-sm"
                  :title="row.originalName"
                >
                  {{ row.originalName }}
                </p>

                <div class="mt-2 flex min-w-0 items-center gap-1">
                  <a
                    v-if="row.action === 'upload'"
                    :href="imageUrl(row.key)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="min-w-0 flex-1 truncate font-mono text-xs text-primary hover:underline"
                    :title="row.key"
                  >
                    {{ row.key }}
                  </a>
                  <span
                    v-else
                    class="min-w-0 flex-1 truncate font-mono text-xs text-dimmed"
                    :title="row.key"
                  >
                    {{ row.key }}
                  </span>
                  <CopyButton
                    icon="i-lucide-copy"
                    icon-only
                    class="shrink-0"
                    :label="t('common.copy')"
                    :value="row.key"
                    :success-title="t('copy.copiedUrl')"
                  />
                </div>
              </article>
            </div>
          </div>

          <div class="hidden overflow-x-auto sm:block">
            <table class="min-w-full text-left text-sm">
              <thead class="border-b border-default bg-muted/30 text-xs text-muted">
                <tr>
                  <th class="px-4 py-3 font-medium sm:px-6">
                    {{ t('logs.colTime') }}
                  </th>
                  <th
                    v-if="isAdmin"
                    class="px-4 py-3 font-medium"
                  >
                    {{ t('logs.colUser') }}
                  </th>
                  <th class="px-4 py-3 font-medium">
                    {{ t('logs.colAction') }}
                  </th>
                  <th class="px-4 py-3 font-medium">
                    {{ t('logs.colSource') }}
                  </th>
                  <th class="px-4 py-3 font-medium">
                    {{ t('logs.colStorage') }}
                  </th>
                  <th class="hidden px-4 py-3 font-medium md:table-cell">
                    {{ t('logs.colFile') }}
                  </th>
                  <th class="hidden px-4 py-3 font-medium lg:table-cell">
                    {{ t('logs.colFolder') }}
                  </th>
                  <th class="px-4 py-3 font-medium">
                    {{ t('logs.colSize') }}
                  </th>
                  <th class="hidden px-4 py-3 font-medium xl:table-cell">
                    {{ t('logs.colKey') }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr
                  v-for="row in listData.items"
                  :key="row.id"
                  class="hover:bg-muted/20"
                >
                  <td class="whitespace-nowrap px-4 py-3 text-xs text-muted sm:px-6">
                    {{ formatTime(row.createdAt) }}
                  </td>
                  <td
                    v-if="isAdmin"
                    class="px-4 py-3 text-xs"
                  >
                    {{ row.username ?? '—' }}
                  </td>
                  <td class="px-4 py-3">
                    <UBadge
                      :color="actionColor(row.action)"
                      variant="subtle"
                      size="xs"
                    >
                      <UIcon
                        :name="actionIcon(row.action)"
                        class="mr-1 size-3"
                      />
                      {{ row.action === 'upload' ? t('logs.actionUpload') : t('logs.actionDelete') }}
                    </UBadge>
                  </td>
                  <td class="px-4 py-3">
                    <UBadge
                      color="neutral"
                      variant="subtle"
                      size="xs"
                    >
                      {{ sourceLabel(row.source) }}
                    </UBadge>
                  </td>
                  <td class="px-4 py-3 text-xs">
                    <span
                      v-if="row.storage"
                      class="inline-flex max-w-[8rem] items-center gap-1 truncate"
                      :title="row.storage.name"
                    >
                      <UIcon
                        :name="storageIcon(row.storage)"
                        class="size-3.5 shrink-0 opacity-70"
                      />
                      <span class="truncate">{{ row.storage.name }}</span>
                    </span>
                    <span
                      v-else
                      class="text-muted"
                    >—</span>
                  </td>
                  <td
                    class="hidden max-w-[12rem] truncate px-4 py-3 md:table-cell"
                    :title="row.originalName"
                  >
                    {{ row.originalName }}
                  </td>
                  <td class="hidden px-4 py-3 font-mono text-xs text-muted lg:table-cell">
                    {{ folderFromKey(row.key) }}
                  </td>
                  <td class="whitespace-nowrap px-4 py-3 tabular-nums text-muted">
                    {{ formatFileSize(row.size) }}
                  </td>
                  <td class="hidden px-4 py-3 xl:table-cell">
                    <div class="flex max-w-[16rem] items-center gap-1">
                      <a
                        v-if="row.action === 'upload'"
                        :href="imageUrl(row.key)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="truncate font-mono text-xs text-primary hover:underline"
                        :title="row.key"
                      >
                        {{ row.key }}
                      </a>
                      <span
                        v-else
                        class="truncate font-mono text-xs text-dimmed"
                        :title="row.key"
                      >
                        {{ row.key }}
                      </span>
                      <CopyButton
                        icon="i-lucide-copy"
                        icon-only
                        :label="t('common.copy')"
                        :value="row.key"
                        :success-title="t('copy.copiedUrl')"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <div
          v-else
          class="px-4 py-16 text-center text-sm text-muted sm:px-6"
        >
          {{ t('logs.empty') }}
        </div>

        <div
          v-if="listData && listData.total > 0"
          class="border-t border-default px-4 py-4 sm:px-6"
        >
          <PaginationBar
            :page="listData.page"
            :total-pages="listData.totalPages"
            :total="listData.total"
            :unit="t('logs.entriesUnit')"
            :loading="loading"
            @update:page="handlePageChange"
          />
        </div>
      </section>
    </AppShell>
  </div>
</template>

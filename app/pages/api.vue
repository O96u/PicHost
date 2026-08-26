<script setup lang="ts">
interface SettingsResponse {
  apiUploadToken: string
  tokenSource: 'env' | 'db' | 'none'
  envTokenOverride: boolean
  env: {
    webpQuality: number
    refererConfigured: boolean
    imageBaseUrl: string
    appVersion: string
  }
}

interface ApiDocItem {
  index: number
  method: 'GET' | 'POST' | 'DELETE'
  path: string
  title: string
  description: string
  curl: string
}

const { isChecking, isAuthenticated, checkSession, handleAuthError, fetchStatus, isAdmin } = useAuth()
const toast = useToast()
const { t } = useI18n()

const settings = ref<SettingsResponse | null>(null)
const loading = ref(false)
const regenerating = ref(false)
const confirmRegenerateOpen = ref(false)
const regenerateResultOpen = ref(false)
const newToken = ref('')

const baseUrl = computed(() => {
  if (import.meta.client) {
    return window.location.origin
  }
  return settings.value?.env.imageBaseUrl ?? ''
})

const tokenDisplay = computed(() => settings.value?.apiUploadToken ?? '')
const hasToken = computed(() => tokenDisplay.value.length > 0)
const canRegenerate = computed(() => !settings.value?.envTokenOverride && !loading.value)

const authHeader = computed(() =>
  hasToken.value ? tokenDisplay.value : 'YOUR-TOKEN'
)

const authHeaderFlag = computed(() => `-H 'Auth-Token: ${authHeader.value}'`)

const apiDocs = computed<ApiDocItem[]>(() => {
  const uploadDescription = isAdmin.value
    ? t('api.docs.upload.descAdmin')
    : t('api.docs.upload.descUser')
  const uploadCurl = isAdmin.value
    ? `curl -X POST "${baseUrl.value}/api/images/upload" \\
  ${authHeaderFlag.value} \\
  -F "image=@./demo.png"

# 上传到自定义目录 blog/
curl -X POST "${baseUrl.value}/api/images/upload" \\
  ${authHeaderFlag.value} \\
  -F "folder=blog" \\
  -F "image=@./demo.png"`
    : `curl -X POST "${baseUrl.value}/api/images/upload" \\
  ${authHeaderFlag.value} \\
  -F "image=@./demo.png"`

  const listDescription = isAdmin.value
    ? t('api.docs.list.descAdmin')
    : t('api.docs.list.descUser')
  const listCurl = isAdmin.value
    ? `curl "${baseUrl.value}/api/images?limit=20&page=1" \\
  ${authHeaderFlag.value}

# 按目录筛选
curl "${baseUrl.value}/api/images?folder=blog&limit=20&page=1" \\
  ${authHeaderFlag.value}`
    : `curl "${baseUrl.value}/api/images?limit=20&page=1" \\
  ${authHeaderFlag.value}`

  return [
    {
      index: 1,
      method: 'POST',
      path: '/api/images/upload',
      title: t('api.docs.upload.title'),
      description: uploadDescription,
      curl: uploadCurl
    },
    {
      index: 2,
      method: 'GET',
      path: '/api/images',
      title: t('api.docs.list.title'),
      description: listDescription,
      curl: listCurl
    },
    {
      index: 3,
      method: 'GET',
      path: '/api/images/search',
      title: t('api.docs.search.title'),
      description: t('api.docs.search.desc'),
      curl: `curl "${baseUrl.value}/api/images/search?q=demo&limit=20&page=1" \\
  ${authHeaderFlag.value}`
    },
    {
      index: 4,
      method: 'DELETE',
      path: '/api/images',
      title: t('api.docs.delete.title'),
      description: t('api.docs.delete.desc'),
      curl: `curl -X DELETE "${baseUrl.value}/api/images?key=images/2026/08/xxxx.webp" \\
  ${authHeaderFlag.value}`
    },
    {
      index: 5,
      method: 'POST',
      path: '/api/images/batch-delete',
      title: t('api.docs.batchDelete.title'),
      description: t('api.docs.batchDelete.desc'),
      curl: `curl -X POST "${baseUrl.value}/api/images/batch-delete" \\
  ${authHeaderFlag.value} \\
  -H "Content-Type: application/json" \\
  -d '{"keys":["images/2026/08/a.webp","images/2026/08/b.webp"]}'`
    }
  ]
})

const twikooDoc = computed(() => ({
  method: 'POST' as const,
  path: '/api/index.php',
  title: t('api.docs.twikoo.title'),
  description: t('api.docs.twikoo.desc'),
  curl: `curl -X POST "${baseUrl.value}/api/index.php" \\
  -F "token=${authHeader.value}" \\
  -F "image=@./demo.png"`
}))

function tokenSourceLabel(source: SettingsResponse['tokenSource']) {
  switch (source) {
    case 'env':
      return t('api.tokenSourceEnv')
    case 'db':
      return t('api.tokenSourceDb')
    default:
      return t('api.tokenSourceNone')
  }
}

function methodBadgeColor(method: ApiDocItem['method']) {
  switch (method) {
    case 'GET':
      return 'info' as const
    case 'DELETE':
      return 'error' as const
    default:
      return 'primary' as const
  }
}

async function loadSettings() {
  loading.value = true
  try {
    const endpoint = isAdmin.value ? '/api/settings' : '/api/user/api-token'
    settings.value = await $fetch<SettingsResponse>(endpoint, {
      credentials: 'include'
    })
  } catch (error: unknown) {
    handleAuthError(error)
    if (isAuthenticated.value) {
      toast.add({ title: t('api.loadFailed'), color: 'error' })
    }
  } finally {
    loading.value = false
  }
}

function requestRegenerate() {
  if (!canRegenerate.value) return
  confirmRegenerateOpen.value = true
}

async function confirmRegenerate() {
  confirmRegenerateOpen.value = false
  regenerating.value = true
  try {
    const endpoint = isAdmin.value
      ? '/api/settings/api-token/regenerate'
      : '/api/user/api-token/regenerate'
    const response = await $fetch<{ apiUploadToken: string }>(
      endpoint,
      { method: 'POST', credentials: 'include' }
    )
    newToken.value = response.apiUploadToken
    regenerateResultOpen.value = true
    await loadSettings()
  } catch (error: unknown) {
    handleAuthError(error)
    if (isAuthenticated.value) {
      const status = typeof error === 'object' && error !== null && 'statusCode' in error
        ? (error as { statusCode: number }).statusCode
        : 0
      if (status === 409) {
        toast.add({
          title: t('api.regenerateEnvBlocked'),
          color: 'warning'
        })
      } else {
        toast.add({ title: t('api.regenerateFailed'), color: 'error' })
      }
    }
  } finally {
    regenerating.value = false
  }
}

async function copyCurl(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: t('copy.curl'), color: 'success' })
  } catch {
    toast.add({ title: t('copy.failed'), color: 'error' })
  }
}

function closeConfirmRegenerate() {
  confirmRegenerateOpen.value = false
}

function closeRegenerateResult() {
  regenerateResultOpen.value = false
}

onMounted(async () => {
  const status = await fetchStatus()
  if (!status.initialized && !status.legacyMode) {
    await navigateTo('/setup')
    return
  }
  await checkSession()
  if (isAuthenticated.value) {
    await loadSettings()
  }
})

watch(isAuthenticated, async (authed, prev) => {
  if (authed && prev === false) {
    await nextTick()
    await loadSettings()
  } else {
    settings.value = null
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
      <section class="overflow-hidden rounded-2xl border border-default bg-elevated shadow-sm">
        <div class="flex items-center gap-2 border-b border-default px-5 py-4 sm:px-6">
          <UIcon
            name="i-lucide-key-round"
            class="size-5 text-primary"
          />
          <h2 class="text-base font-semibold">
            {{ t('api.tokenTitle') }}
          </h2>
        </div>

        <div class="space-y-4 p-5 sm:p-6">
          <UAlert
            v-if="settings?.envTokenOverride"
            color="warning"
            variant="subtle"
            icon="i-lucide-triangle-alert"
            :title="t('api.envOverrideTitle')"
            :description="t('api.envOverrideDesc')"
          />

          <UAlert
            v-else-if="!isAdmin"
            color="info"
            variant="subtle"
            icon="i-lucide-info"
            :title="t('api.personalTitle')"
            :description="t('api.personalDesc')"
          />

          <UAlert
            v-else-if="settings && !hasToken"
            color="info"
            variant="subtle"
            icon="i-lucide-info"
            :title="t('api.notConfiguredTitle')"
            :description="t('api.notConfiguredDesc')"
          />

          <div class="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <UInput
              :model-value="hasToken ? tokenDisplay : t('common.notConfigured')"
              readonly
              class="min-w-0 flex-1 font-mono text-xs sm:text-sm"
              :loading="loading"
            />
            <div class="flex gap-2">
              <CopyButton
                :label="t('common.copy')"
                :value="tokenDisplay"
              />
              <UButton
                icon="i-lucide-refresh-cw"
                :label="t('api.regenerate')"
                color="warning"
                variant="soft"
                :loading="regenerating"
                :disabled="!canRegenerate"
                @click="requestRegenerate"
              />
            </div>
          </div>

          <p
            v-if="settings"
            class="text-xs text-muted"
          >
            {{ tokenSourceLabel(settings.tokenSource) }}
            · {{ t('api.tokenHeader') }}
            <code class="font-mono">Auth-Token: &lt;token&gt;</code>
            <template v-if="hasToken && !settings.envTokenOverride">
              · {{ t('api.tokenInvalidate') }}
            </template>
          </p>
        </div>
      </section>

      <section class="overflow-hidden rounded-2xl border border-default bg-elevated shadow-sm">
        <div class="flex items-center gap-2 border-b border-default px-5 py-4 sm:px-6">
          <UIcon
            name="i-lucide-book-open"
            class="size-5 text-primary"
          />
          <h2 class="text-base font-semibold">
            {{ t('api.docsTitle') }}
          </h2>
        </div>

        <div class="divide-y divide-default">
          <article
            v-for="doc in apiDocs"
            :key="doc.index"
            class="space-y-4 p-5 sm:p-6"
          >
            <div class="flex gap-3">
              <span
                class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
              >
                {{ doc.index }}
              </span>
              <div class="min-w-0 space-y-2">
                <div class="flex flex-wrap items-center gap-2">
                  <UBadge
                    :color="methodBadgeColor(doc.method)"
                    variant="subtle"
                    size="sm"
                  >
                    {{ doc.method }}
                  </UBadge>
                  <code class="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-sm font-medium text-primary">
                    {{ doc.path }}
                  </code>
                  <span class="text-sm font-medium">
                    {{ doc.title }}
                  </span>
                </div>
                <p class="text-sm leading-relaxed text-muted">
                  {{ doc.description }}
                </p>
              </div>
            </div>

            <div>
              <p class="mb-2 text-xs font-medium text-muted">
                {{ t('api.curlExample') }}
              </p>
              <div class="relative overflow-hidden rounded-xl bg-neutral-950">
                <UButton
                  icon="i-lucide-copy"
                  :label="t('common.copy')"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  class="absolute top-2 right-2 z-10 text-neutral-300 hover:text-white"
                  @click="copyCurl(doc.curl)"
                />
                <pre class="max-h-80 overflow-auto p-4 pt-10 text-xs leading-relaxed text-neutral-100"><code class="font-mono">{{ doc.curl }}</code></pre>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="overflow-hidden rounded-2xl border border-dashed border-default bg-muted/20">
        <div class="space-y-4 p-5 sm:p-6">
          <div class="flex gap-3">
            <UIcon
              name="i-lucide-message-square"
              class="mt-0.5 size-5 shrink-0 text-muted"
            />
            <div class="min-w-0 space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge
                  color="neutral"
                  variant="subtle"
                  size="sm"
                >
                  {{ twikooDoc.method }}
                </UBadge>
                <code class="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-sm font-medium text-primary">
                  {{ twikooDoc.path }}
                </code>
                <span class="text-sm font-medium">
                  {{ twikooDoc.title }}
                </span>
              </div>
              <p class="text-sm leading-relaxed text-muted">
                {{ twikooDoc.description }}
              </p>
            </div>
          </div>

          <div>
            <p class="mb-2 text-xs font-medium text-muted">
              {{ t('api.curlExample') }}
            </p>
            <div class="relative overflow-hidden rounded-xl bg-neutral-950">
              <UButton
                icon="i-lucide-copy"
                :label="t('common.copy')"
                size="xs"
                variant="ghost"
                color="neutral"
                class="absolute top-2 right-2 z-10 text-neutral-300 hover:text-white"
                @click="copyCurl(twikooDoc.curl)"
              />
              <pre class="overflow-auto p-4 pt-10 text-xs leading-relaxed text-neutral-100"><code class="font-mono">{{ twikooDoc.curl }}</code></pre>
            </div>
          </div>
        </div>
      </section>
    </AppShell>

    <UModal
      :open="confirmRegenerateOpen"
      :title="t('api.confirmRegenerateTitle')"
      :description="t('api.confirmRegenerateDesc')"
      @update:open="confirmRegenerateOpen = $event"
    >
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="outline"
            @click="closeConfirmRegenerate"
          />
          <UButton
            :label="t('api.confirmRegenerate')"
            color="warning"
            :loading="regenerating"
            @click="confirmRegenerate"
          />
        </div>
      </template>
    </UModal>

    <UModal
      :open="regenerateResultOpen"
      :title="t('api.newTokenTitle')"
      :description="t('api.newTokenDesc')"
      @update:open="regenerateResultOpen = $event"
    >
      <template #body>
        <UInput
          :model-value="newToken"
          readonly
          class="w-full font-mono text-sm"
        />
      </template>
      <template #footer>
        <div class="flex w-full flex-wrap justify-end gap-2">
          <CopyButton
            :label="t('api.copyToken')"
            :value="newToken"
          />
          <UButton
            :label="t('api.saved')"
            @click="closeRegenerateResult"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

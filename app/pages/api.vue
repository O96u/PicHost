<script setup lang="ts">
interface SettingsResponse {
  apiUploadToken: string
  tokenSource: 'env' | 'db' | 'none'
  envTokenOverride: boolean
  env: {
    webpQuality: number
    refererConfigured: boolean
    siteBaseUrl: string
    imageBaseUrl: string
    appVersion: string
  }
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
const activeEndpointId = ref('upload')

const baseUrl = computed(() => {
  const configured = settings.value?.env.siteBaseUrl
  if (configured) return configured
  if (import.meta.client) {
    return window.location.origin
  }
  return settings.value?.env.imageBaseUrl ?? ''
})

const tokenDisplay = computed(() => settings.value?.apiUploadToken ?? '')
const hasToken = computed(() => tokenDisplay.value.length > 0)
const canRegenerate = computed(() =>
  !settings.value?.envTokenOverride && !loading.value
)

const authHeader = computed(() =>
  hasToken.value ? tokenDisplay.value : 'YOUR-TOKEN'
)

const apiDocs = computed(() =>
  buildApiDocs({
    baseUrl: baseUrl.value,
    authHeader: authHeader.value
  })
)

const activeEndpoint = computed(() =>
  apiDocs.value.find(endpoint => endpoint.id === activeEndpointId.value) ?? apiDocs.value[0]
)

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
        <div class="flex flex-col lg:flex-row lg:items-stretch">
          <ApiSidebar
            :endpoints="apiDocs"
            :active-id="activeEndpointId"
            @select="activeEndpointId = $event"
          />

          <div class="flex min-w-0 flex-1 flex-col bg-default lg:border-r lg:border-default">
            <ApiTokenCard
              :token="tokenDisplay"
              :loading="loading"
              :regenerating="regenerating"
              :can-regenerate="canRegenerate"
              :token-source="settings?.tokenSource"
              :env-token-override="settings?.envTokenOverride"
              :is-admin="isAdmin"
              @regenerate="requestRegenerate"
            />

            <ApiDocView
              v-if="activeEndpoint"
              :endpoint="activeEndpoint"
            />
          </div>

          <ApiDebugger
            v-if="activeEndpoint"
            :endpoint="activeEndpoint"
            :token="tokenDisplay"
          />
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

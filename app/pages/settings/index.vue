<script setup lang="ts">
type SettingSource = 'env' | 'db' | 'none'
type WebpQualitySource = 'env' | 'db' | 'default'

interface SettingsResponse {
  apiUploadToken: string
  tokenSource: SettingSource
  envTokenOverride: boolean
  webpQuality: number
  webpQualitySource: WebpQualitySource
  allowedRefererHosts: string
  refererSource: SettingSource
  refererEnvFallback: string
  imageBaseUrl: string
  imageBaseUrlConfigured: string
  imageBaseUrlSource: SettingSource
  allowRegistration: boolean
  appVersion: string
}

const { isChecking, isAuthenticated, checkSession, handleAuthError, fetchStatus, isAdmin } = useAuth()
const { defaultFolder, loadPreferences } = useUploadPreferences()
const toast = useToast()
const { t } = useI18n()

const settings = ref<SettingsResponse | null>(null)
const folderOptions = ref<string[]>(['images'])
const savingServer = ref(false)

const refererDraft = ref('')
const imageBaseUrlDraft = ref('')
const allowRegistrationDraft = ref(false)

const folderSelectItems = computed(() =>
  folderOptions.value.map(folder => ({ label: folder, value: folder }))
)

const hasServerChanges = computed(() => {
  if (!settings.value) return false
  return refererDraft.value !== settings.value.allowedRefererHosts
    || imageBaseUrlDraft.value !== settings.value.imageBaseUrlConfigured
    || allowRegistrationDraft.value !== settings.value.allowRegistration
})

function sourceBadge(source: SettingSource | WebpQualitySource) {
  switch (source) {
    case 'env':
      return { label: t('settings.badgeEnv'), color: 'warning' as const }
    case 'db':
      return { label: t('settings.badgeSaved'), color: 'success' as const }
    case 'default':
      return { label: t('settings.badgeDefault'), color: 'neutral' as const }
    default:
      return { label: t('settings.badgeUnset'), color: 'neutral' as const }
  }
}

function tokenSourceText(source: SettingSource) {
  switch (source) {
    case 'env':
      return t('settings.tokenEnv')
    case 'db':
      return t('settings.tokenDb')
    default:
      return t('settings.tokenNone')
  }
}

function errorStatus(error: unknown): number {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    return (error as { statusCode: number }).statusCode
  }
  return 0
}

function applySettings(data: SettingsResponse) {
  settings.value = data
  refererDraft.value = data.allowedRefererHosts
  imageBaseUrlDraft.value = data.imageBaseUrlConfigured
  allowRegistrationDraft.value = data.allowRegistration
}

async function patchSettings(body: Record<string, unknown>) {
  const data = await $fetch<SettingsResponse>('/api/settings', {
    method: 'PATCH',
    credentials: 'include',
    body
  })
  applySettings(data)
  return data
}

function handlePatchError(error: unknown, fallback: string) {
  handleAuthError(error)
  if (!isAuthenticated.value) return
  if (errorStatus(error) === 409) {
    toast.add({ title: t('settings.envOverride'), color: 'warning' })
    void loadSettings()
    return
  }
  toast.add({ title: fallback, color: 'error' })
}

async function saveServerSettings() {
  if (!isAuthenticated.value || !hasServerChanges.value) return

  savingServer.value = true
  try {
    await patchSettings({
      allowedRefererHosts: refererDraft.value,
      imageBaseUrl: imageBaseUrlDraft.value,
      allowRegistration: allowRegistrationDraft.value
    })
    toast.add({ title: t('settings.saved'), color: 'success' })
  } catch (error: unknown) {
    handlePatchError(error, t('settings.saveFailed'))
  } finally {
    savingServer.value = false
  }
}

async function loadFolders() {
  const data = await $fetch<{ folders: string[] }>('/api/folders', {
    credentials: 'include'
  })
  folderOptions.value = [...data.folders]
  if (!folderOptions.value.includes(defaultFolder.value)) {
    defaultFolder.value = folderOptions.value[0] ?? 'images'
  }
}

async function loadSettings() {
  try {
    const data = await $fetch<SettingsResponse>('/api/settings', {
      credentials: 'include'
    })
    applySettings(data)
  } catch (error: unknown) {
    handleAuthError(error)
    if (isAuthenticated.value) {
      toast.add({ title: t('settings.loadFailed'), color: 'error' })
    }
  }
}

async function loadPage() {
  if (!isAdmin.value) {
    await navigateTo('/')
    return
  }
  loadPreferences()
  await Promise.all([loadSettings(), loadFolders()])
}

onMounted(async () => {
  const status = await fetchStatus()
  if (!status.initialized && !status.legacyMode) {
    await navigateTo('/setup')
    return
  }
  await checkSession()
  if (isAuthenticated.value && !isAdmin.value) {
    await navigateTo('/')
  }
})

watch(isAuthenticated, async (authed) => {
  if (authed) {
    if (!isAdmin.value) {
      await navigateTo('/')
      return
    }
    await nextTick()
    await loadPage()
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

    <AppShell v-else-if="isAdmin">
      <section class="overflow-hidden rounded-2xl border border-default bg-elevated shadow-sm">
        <UploadPreferencesPanel embedded />
      </section>

      <section class="overflow-hidden rounded-2xl border border-default bg-elevated shadow-sm">
        <div class="flex items-start gap-2 border-b border-default px-5 py-4 sm:px-6">
          <UIcon
            name="i-lucide-server"
            class="mt-0.5 size-5 shrink-0 text-primary"
          />
          <div class="min-w-0">
            <h1 class="text-base font-semibold">
              {{ t('settings.title') }}
            </h1>
            <p class="mt-0.5 text-xs text-muted">
              {{ t('settings.subtitle') }}
            </p>
          </div>
        </div>

        <div
          v-if="settings"
          class="p-5 sm:p-6"
        >
          <div class="grid gap-5 sm:grid-cols-3 sm:gap-6">
            <div class="space-y-4">
              <h3 class="text-sm font-semibold">
                {{ t('settings.uploadAccount') }}
              </h3>

              <div class="space-y-2">
                <label class="text-sm">{{ t('settings.defaultFolder') }}</label>
                <p class="text-xs leading-relaxed text-muted">
                  {{ t('settings.defaultFolderHint') }}
                </p>
                <USelect
                  v-model="defaultFolder"
                  :items="folderSelectItems"
                  class="w-full"
                />
              </div>

              <label class="flex cursor-pointer items-start gap-2.5">
                <UCheckbox
                  v-model="allowRegistrationDraft"
                  class="mt-0.5"
                />
                <span>
                  <span class="block text-sm">{{ t('settings.allowRegistration') }}</span>
                  <span class="mt-1 block text-xs leading-relaxed text-muted">
                    {{ t('settings.allowRegistrationHint') }}
                  </span>
                </span>
              </label>
            </div>

            <div class="space-y-4">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-sm font-semibold">
                  {{ t('settings.accessControl') }}
                </h3>
                <UBadge
                  :color="sourceBadge(settings.refererSource).color"
                  variant="subtle"
                  size="xs"
                >
                  {{ sourceBadge(settings.refererSource).label }}
                </UBadge>
              </div>
              <p class="text-xs leading-relaxed text-muted">
                {{ t('settings.refererHint') }}
              </p>
              <UTextarea
                v-model="refererDraft"
                :placeholder="t('settings.refererPlaceholder')"
                :rows="4"
                class="w-full font-mono text-sm"
              />
            </div>

            <div class="space-y-4">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-sm font-semibold">
                  {{ t('settings.linkGeneration') }}
                </h3>
                <UBadge
                  :color="sourceBadge(settings.imageBaseUrlSource).color"
                  variant="subtle"
                  size="xs"
                >
                  {{ sourceBadge(settings.imageBaseUrlSource).label }}
                </UBadge>
              </div>
              <p class="text-xs leading-relaxed text-muted">
                {{ t('settings.imageBaseUrlHint') }}
              </p>
              <UInput
                v-model="imageBaseUrlDraft"
                :placeholder="t('settings.imageBaseUrlPlaceholder')"
                class="w-full font-mono text-sm"
              />
              <p
                v-if="settings.imageBaseUrl"
                class="text-xs text-muted"
              >
                {{ t('settings.imageBaseUrlActive', { url: settings.imageBaseUrl }) }}
              </p>
            </div>
          </div>
        </div>

        <div
          v-else
          class="flex justify-center py-12"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin text-muted"
          />
        </div>

        <div
          v-if="settings"
          class="flex flex-wrap items-center justify-between gap-3 border-t border-default px-5 py-4 sm:px-6"
        >
          <div class="flex min-w-0 items-center gap-2 text-xs text-muted">
            <UIcon
              name="i-lucide-key-round"
              class="size-3.5 shrink-0"
            />
            <span>
              {{ t('settings.apiTokenLine', { source: tokenSourceText(settings.tokenSource), version: settings.appVersion }) }}
              <template v-if="hasServerChanges">
                · <span class="text-warning">{{ t('settings.unsavedChanges') }}</span>
              </template>
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UButton
              :label="t('settings.manageToken')"
              icon="i-lucide-external-link"
              variant="outline"
              color="neutral"
              size="sm"
              to="/api"
            />
            <UButton
              :label="t('common.save')"
              icon="i-lucide-save"
              size="sm"
              :loading="savingServer"
              :disabled="!hasServerChanges"
              @click="saveServerSettings"
            />
          </div>
        </div>
      </section>
    </AppShell>
  </div>
</template>

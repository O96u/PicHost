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
  siteBaseUrl: string
  siteBaseUrlConfigured: string
  siteBaseUrlSource: SettingSource
  domainSeparation: boolean
  hideFolderInUrl: boolean
  hideFolderInUrlSource: SettingSource
  storageUseDatePath: boolean
  storageUseDatePathSource: SettingSource
  allowRegistration: boolean
  appVersion: string
}

const { isChecking, isAuthenticated, checkSession, handleAuthError, fetchStatus, isAdmin } = useAuth()
const toast = useToast()
const { t, locale } = useI18n()

const domainSeparationDocUrl = computed(() =>
  locale.value === 'en'
    ? 'https://o96u.github.io/PicHost/en/guide/domain-separation'
    : 'https://o96u.github.io/PicHost/guide/domain-separation'
)

const settings = ref<SettingsResponse | null>(null)
const savingServer = ref(false)

const refererDraft = ref('')
const siteBaseUrlDraft = ref('')
const imageBaseUrlDraft = ref('')
const hideFolderInUrlDraft = ref(false)
const storageUseDatePathDraft = ref(true)
const allowRegistrationDraft = ref(false)
const domainSeparationDraft = ref(false)

interface ReleaseCheckResponse {
  currentVersion: string
  latestVersion: string | null
  updateAvailable: boolean
  releaseUrl: string | null
}

const releaseCheck = ref<ReleaseCheckResponse | null>(null)

const hasServerChanges = computed(() => {
  if (!settings.value) return false
  return refererDraft.value !== settings.value.allowedRefererHosts
    || domainSeparationDraft.value !== settings.value.domainSeparation
    || siteBaseUrlDraft.value !== (settings.value.domainSeparation ? settings.value.siteBaseUrlConfigured : '')
    || imageBaseUrlDraft.value !== settings.value.imageBaseUrlConfigured
    || hideFolderInUrlDraft.value !== settings.value.hideFolderInUrl
    || storageUseDatePathDraft.value !== settings.value.storageUseDatePath
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
  siteBaseUrlDraft.value = data.domainSeparation ? data.siteBaseUrlConfigured : ''
  imageBaseUrlDraft.value = data.imageBaseUrlConfigured
  hideFolderInUrlDraft.value = data.hideFolderInUrl
  storageUseDatePathDraft.value = data.storageUseDatePath
  allowRegistrationDraft.value = data.allowRegistration
  domainSeparationDraft.value = data.domainSeparation
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

function onDomainSeparationDraftChange(next: boolean | 'indeterminate') {
  const enabled = next === true
  domainSeparationDraft.value = enabled
  if (!enabled) {
    siteBaseUrlDraft.value = ''
    return
  }
  if (!siteBaseUrlDraft.value && import.meta.client) {
    siteBaseUrlDraft.value = window.location.origin
  }
}

async function saveServerSettings() {
  if (!isAuthenticated.value || !hasServerChanges.value) return

  savingServer.value = true
  try {
    await patchSettings({
      allowedRefererHosts: refererDraft.value,
      siteBaseUrl: domainSeparationDraft.value ? siteBaseUrlDraft.value : '',
      imageBaseUrl: imageBaseUrlDraft.value,
      hideFolderInUrl: hideFolderInUrlDraft.value,
      storageUseDatePath: storageUseDatePathDraft.value,
      allowRegistration: allowRegistrationDraft.value
    })
    toast.add({ title: t('settings.saved'), color: 'success' })
  } catch (error: unknown) {
    handlePatchError(error, t('settings.saveFailed'))
  } finally {
    savingServer.value = false
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

async function checkLatestRelease() {
  try {
    releaseCheck.value = await $fetch<ReleaseCheckResponse>('/api/version/latest', {
      credentials: 'include'
    })
  } catch {
    releaseCheck.value = null
  }
}

async function loadPage() {
  if (!isAdmin.value) {
    await navigateTo('/')
    return
  }
  await Promise.all([loadSettings(), checkLatestRelease()])
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
    return
  }
  if (isAuthenticated.value && isAdmin.value) {
    await loadPage()
  }
})

watch(isAuthenticated, async (authed, prev) => {
  if (authed && prev === false) {
    if (!isAdmin.value) {
      await navigateTo('/')
      return
    }
    await nextTick()
    await loadPage()
  } else {
    settings.value = null
    releaseCheck.value = null
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
          <div class="space-y-5">
            <div class="grid min-w-0 gap-5 lg:grid-cols-2 lg:items-stretch">
              <div class="flex h-full min-w-0 flex-col space-y-3 rounded-xl border border-default/60 bg-muted/10 p-4 sm:p-5">
                <h3 class="text-sm font-semibold">
                  {{ t('settings.featureToggles') }}
                </h3>

                <label class="flex cursor-pointer items-start gap-2.5 rounded-lg border border-default/50 bg-default/40 p-3">
                  <UCheckbox
                    v-model="allowRegistrationDraft"
                    class="mt-0.5 shrink-0"
                  />
                  <span class="min-w-0">
                    <span class="block text-sm font-medium">{{ t('settings.allowRegistration') }}</span>
                    <span class="mt-1 block text-xs leading-relaxed text-muted">
                      {{ t('settings.allowRegistrationHint') }}
                    </span>
                  </span>
                </label>

                <label class="flex cursor-pointer items-start gap-2.5 rounded-lg border border-default/50 bg-default/40 p-3">
                  <UCheckbox
                    :model-value="storageUseDatePathDraft"
                    class="mt-0.5 shrink-0"
                    :disabled="settings.storageUseDatePathSource === 'env'"
                    @update:model-value="(v) => storageUseDatePathDraft = v === true"
                  />
                  <span class="min-w-0">
                    <span class="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {{ t('settings.storageUseDatePath') }}
                      <UBadge
                        v-if="settings.storageUseDatePathSource === 'env'"
                        :color="sourceBadge(settings.storageUseDatePathSource).color"
                        variant="subtle"
                        size="xs"
                      >
                        {{ sourceBadge(settings.storageUseDatePathSource).label }}
                      </UBadge>
                    </span>
                    <span class="mt-1 block text-xs leading-relaxed text-muted">
                      {{ t('settings.storageUseDatePathHint') }}
                    </span>
                  </span>
                </label>

                <label class="flex cursor-pointer items-start gap-2.5 rounded-lg border border-default/50 bg-default/40 p-3">
                  <UCheckbox
                    :model-value="hideFolderInUrlDraft"
                    class="mt-0.5 shrink-0"
                    :disabled="settings.hideFolderInUrlSource === 'env'"
                    @update:model-value="(v) => hideFolderInUrlDraft = v === true"
                  />
                  <span class="min-w-0">
                    <span class="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {{ t('settings.hideFolderInUrl') }}
                      <UBadge
                        v-if="settings.hideFolderInUrlSource === 'env'"
                        :color="sourceBadge(settings.hideFolderInUrlSource).color"
                        variant="subtle"
                        size="xs"
                      >
                        {{ sourceBadge(settings.hideFolderInUrlSource).label }}
                      </UBadge>
                    </span>
                    <span class="mt-1 block text-xs leading-relaxed text-muted">
                      {{ t('settings.hideFolderInUrlHint') }}
                    </span>
                  </span>
                </label>
              </div>

              <div class="flex h-full min-w-0 flex-col space-y-4 rounded-xl border border-default/60 bg-muted/10 p-4 sm:p-5">
                <h3 class="text-sm font-semibold">
                  {{ t('settings.domainSettings') }}
                </h3>

                <label class="flex cursor-pointer items-start gap-2.5 rounded-lg border border-default/50 bg-default/40 p-3">
                  <UCheckbox
                    :model-value="domainSeparationDraft"
                    class="mt-0.5 shrink-0"
                    @update:model-value="onDomainSeparationDraftChange"
                  />
                  <span class="min-w-0">
                    <span class="block text-sm font-medium">{{ t('setup.domainSeparation') }}</span>
                    <span class="mt-1 block text-xs leading-relaxed text-muted">
                      {{ t('setup.domainSeparationHint') }}
                    </span>
                  </span>
                </label>

                <p
                  v-if="domainSeparationDraft"
                  class="rounded-lg border border-warning/25 bg-warning/5 px-3 py-2.5 text-xs leading-relaxed text-warning"
                >
                  {{ t('setup.domainSeparationProxyHint') }}
                  <a
                    :href="domainSeparationDocUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary hover:underline"
                  >
                    {{ t('setup.domainSeparationProxyExample') }}
                  </a>
                </p>

                <div
                  v-if="domainSeparationDraft"
                  class="grid gap-4 sm:grid-cols-2"
                >
                  <div class="space-y-1.5">
                    <div class="flex flex-wrap items-center gap-2">
                      <label class="text-sm font-medium">{{ t('settings.siteBaseUrl') }}</label>
                      <UBadge
                        :color="sourceBadge(settings.siteBaseUrlSource).color"
                        variant="subtle"
                        size="xs"
                      >
                        {{ sourceBadge(settings.siteBaseUrlSource).label }}
                      </UBadge>
                    </div>
                    <p class="text-xs leading-relaxed text-muted">
                      {{ t('settings.siteBaseUrlHint') }}
                    </p>
                    <UInput
                      v-model="siteBaseUrlDraft"
                      :placeholder="t('settings.siteBaseUrlPlaceholder')"
                      class="w-full font-mono text-sm"
                    />
                    <p
                      v-if="settings.siteBaseUrl"
                      class="truncate text-xs text-muted"
                      :title="settings.siteBaseUrl"
                    >
                      {{ t('settings.siteBaseUrlActive', { url: settings.siteBaseUrl }) }}
                    </p>
                  </div>

                  <div class="space-y-1.5">
                    <div class="flex flex-wrap items-center gap-2">
                      <label class="text-sm font-medium">{{ t('settings.imageBaseUrl') }}</label>
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
                      class="truncate text-xs text-muted"
                      :title="settings.imageBaseUrl"
                    >
                      {{ t('settings.imageBaseUrlActive', { url: settings.imageBaseUrl }) }}
                    </p>
                  </div>
                </div>

                <div
                  v-else
                  class="space-y-1.5"
                >
                  <div class="flex flex-wrap items-center gap-2">
                    <label class="text-sm font-medium">{{ t('settings.imageBaseUrl') }}</label>
                    <UBadge
                      :color="sourceBadge(settings.imageBaseUrlSource).color"
                      variant="subtle"
                      size="xs"
                    >
                      {{ sourceBadge(settings.imageBaseUrlSource).label }}
                    </UBadge>
                  </div>
                  <p class="text-xs leading-relaxed text-muted">
                    {{ t('settings.imageBaseUrlSingleHint') }}
                  </p>
                  <UInput
                    v-model="imageBaseUrlDraft"
                    :placeholder="t('settings.imageBaseUrlPlaceholder')"
                    class="w-full font-mono text-sm"
                  />
                  <p
                    v-if="settings.imageBaseUrl"
                    class="truncate text-xs text-muted"
                    :title="settings.imageBaseUrl"
                  >
                    {{ t('settings.imageBaseUrlActive', { url: settings.imageBaseUrl }) }}
                  </p>
                </div>
              </div>
            </div>

            <div class="settings-referer-section space-y-1.5 rounded-xl border border-default/60 bg-muted/10 p-4 sm:p-5">
              <div class="flex flex-wrap items-center gap-2">
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
                :autoresize="false"
                class="settings-referer-field w-full font-mono text-sm"
              />
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
          class="flex flex-col gap-3 border-t border-default px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <div class="flex min-w-0 items-center gap-2 text-xs text-muted">
            <UIcon
              name="i-lucide-key-round"
              class="size-3.5 shrink-0"
            />
            <span class="min-w-0">
              {{ t('settings.apiTokenLine', { source: tokenSourceText(settings.tokenSource) }) }}
              <a
                :href="releaseCheck?.updateAvailable && releaseCheck.releaseUrl
                  ? releaseCheck.releaseUrl
                  : 'https://github.com/O96u/PicHost/releases'"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-0.5 underline-offset-2 hover:underline"
                :class="releaseCheck?.updateAvailable ? 'text-warning' : 'text-primary'"
                :title="t('settings.viewReleases')"
              >
                v{{ settings.appVersion }}
                <UIcon
                  name="i-lucide-external-link"
                  class="size-3 opacity-70"
                />
              </a>
              <template v-if="releaseCheck?.updateAvailable && releaseCheck.latestVersion">
                ·
                <a
                  :href="releaseCheck.releaseUrl || 'https://github.com/O96u/PicHost/releases'"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-warning hover:underline"
                >
                  {{ t('settings.updateAvailable', { version: `v${releaseCheck.latestVersion}` }) }}
                </a>
              </template>
              <template v-if="hasServerChanges">
                · <span class="text-warning">{{ t('settings.unsavedChanges') }}</span>
              </template>
            </span>
          </div>
          <div class="flex flex-wrap items-center justify-end gap-2">
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

<style scoped>
.settings-referer-section {
  min-width: 0;
}

.settings-referer-field :deep(textarea),
.settings-referer-field :deep(> div) {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
}

.settings-referer-field :deep(textarea) {
  min-height: 5.5rem;
  resize: none;
}
</style>

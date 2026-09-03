<script setup lang="ts">
import type { SettingsTab } from '~/types/settings'
import { ADMIN_SETTINGS_TABS, USER_SETTINGS_TABS } from '~/types/settings'

type SettingSource = 'env' | 'db' | 'none'
type WebpQualitySource = 'env' | 'db' | 'default'
type LoginVerificationMethod = 'slider' | 'turnstile' | 'cap'

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
  effectiveImageBaseUrl: string
  siteBaseUrl: string
  siteBaseUrlConfigured: string
  siteBaseUrlSource: SettingSource
  effectiveSiteBaseUrl: string
  domainSeparation: boolean
  runtime: {
    currentOrigin: string
    currentHost: string
    hostRole: 'site' | 'image' | 'unknown' | 'single'
  }
  hideFolderInUrl: boolean
  hideFolderInUrlSource: SettingSource
  storageUseDatePath: boolean
  storageUseDatePathSource: SettingSource
  allowRegistration: boolean
  loginVerificationMethod: LoginVerificationMethod
  turnstileSiteKey: string
  turnstileSecretKey: string
  capApiEndpoint: string
  capSecret: string
  appVersion: string
}

const { isChecking, isAuthenticated, checkSession, handleAuthError, fetchStatus, isAdmin } = useAuth()
const toast = useToast()
const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const allowedTabs = computed(() => (isAdmin.value ? ADMIN_SETTINGS_TABS : USER_SETTINGS_TABS))

const defaultTab = computed<SettingsTab>(() => (isAdmin.value ? 'basic' : 'logs'))

function parseTab(value: unknown): SettingsTab | null {
  if (typeof value !== 'string') return null
  return allowedTabs.value.includes(value as SettingsTab) ? value as SettingsTab : null
}

const activeTab = computed<SettingsTab>({
  get() {
    return parseTab(route.query.tab) ?? defaultTab.value
  },
  set(tab) {
    void router.replace({ query: { tab } })
  }
})

const sidebarItems = computed(() => {
  const labels: Record<SettingsTab, { label: string, icon: string }> = {
    basic: { label: t('settings.navBasic'), icon: 'i-lucide-sliders-horizontal' },
    domains: { label: t('settings.navDomains'), icon: 'i-lucide-globe' },
    access: { label: t('settings.navAccess'), icon: 'i-lucide-shield' },
    logs: { label: t('settings.navLogs'), icon: 'i-lucide-scroll-text' }
  }
  return allowedTabs.value.map(id => ({ id, ...labels[id] }))
})

const showSaveBar = computed(() =>
  isAdmin.value && ['basic', 'domains', 'access'].includes(activeTab.value)
)

const pageSubtitle = computed(() => {
  if (activeTab.value === 'basic') {
    return t('settings.pageSubtitleBasic')
  }
  return t('settings.pageSubtitle')
})

const checkingRelease = ref(false)

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
const loginVerificationMethodDraft = ref<LoginVerificationMethod>('slider')
const turnstileSiteKeyDraft = ref('')
const turnstileSecretKeyDraft = ref('')
const capApiEndpointDraft = ref('')
const capSecretDraft = ref('')
const domainSeparationDraft = ref(false)
const disableDomainSeparationOpen = ref(false)
const pendingDomainSeparationDisable = ref(false)

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
    || siteBaseUrlDraft.value !== (settings.value.domainSeparation ? settings.value.siteBaseUrl : '')
    || imageBaseUrlDraft.value !== settings.value.imageBaseUrl
    || hideFolderInUrlDraft.value !== settings.value.hideFolderInUrl
    || storageUseDatePathDraft.value !== settings.value.storageUseDatePath
    || allowRegistrationDraft.value !== settings.value.allowRegistration
    || loginVerificationMethodDraft.value !== settings.value.loginVerificationMethod
    || turnstileSiteKeyDraft.value !== settings.value.turnstileSiteKey
    || turnstileSecretKeyDraft.value !== settings.value.turnstileSecretKey
    || capApiEndpointDraft.value !== settings.value.capApiEndpoint
    || capSecretDraft.value !== settings.value.capSecret
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

function errorStatus(error: unknown): number {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    return (error as { statusCode: number }).statusCode
  }
  return 0
}

function applySettings(data: SettingsResponse) {
  settings.value = data
  refererDraft.value = data.allowedRefererHosts
  siteBaseUrlDraft.value = data.domainSeparation ? data.siteBaseUrl : ''
  imageBaseUrlDraft.value = data.imageBaseUrl
  hideFolderInUrlDraft.value = data.hideFolderInUrl
  storageUseDatePathDraft.value = data.storageUseDatePath
  allowRegistrationDraft.value = data.allowRegistration
  loginVerificationMethodDraft.value = data.loginVerificationMethod
  turnstileSiteKeyDraft.value = data.turnstileSiteKey
  turnstileSecretKeyDraft.value = data.turnstileSecretKey
  capApiEndpointDraft.value = data.capApiEndpoint
  capSecretDraft.value = data.capSecret
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

function fillDetectedSiteOrigin() {
  if (settings.value?.runtime.currentOrigin) {
    siteBaseUrlDraft.value = settings.value.runtime.currentOrigin
  }
}

function onDomainSeparationDraftChange(next: boolean | 'indeterminate') {
  const enabled = next === true
  if (!enabled && domainSeparationDraft.value) {
    pendingDomainSeparationDisable.value = true
    disableDomainSeparationOpen.value = true
    return
  }
  domainSeparationDraft.value = enabled
}

function confirmDisableDomainSeparation() {
  domainSeparationDraft.value = false
  siteBaseUrlDraft.value = ''
  disableDomainSeparationOpen.value = false
  pendingDomainSeparationDisable.value = false
}

function cancelDisableDomainSeparation() {
  disableDomainSeparationOpen.value = false
  pendingDomainSeparationDisable.value = false
}

async function saveServerSettings() {
  if (!isAuthenticated.value || !hasServerChanges.value) return

  if (domainSeparationDraft.value) {
    if (!siteBaseUrlDraft.value.trim() || !imageBaseUrlDraft.value.trim()) {
      toast.add({ title: t('settings.domainSeparationRequired'), color: 'error' })
      return
    }
  }

  savingServer.value = true
  try {
    await patchSettings({
      allowedRefererHosts: refererDraft.value,
      domainSeparation: domainSeparationDraft.value,
      siteBaseUrl: domainSeparationDraft.value ? siteBaseUrlDraft.value : '',
      imageBaseUrl: imageBaseUrlDraft.value,
      hideFolderInUrl: hideFolderInUrlDraft.value,
      storageUseDatePath: storageUseDatePathDraft.value,
      allowRegistration: allowRegistrationDraft.value,
      loginVerificationMethod: loginVerificationMethodDraft.value,
      turnstileSiteKey: turnstileSiteKeyDraft.value,
      turnstileSecretKey: turnstileSecretKeyDraft.value,
      capApiEndpoint: capApiEndpointDraft.value,
      capSecret: capSecretDraft.value
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

async function checkLatestRelease(options: { notify?: boolean, refresh?: boolean } = {}) {
  const { notify = false, refresh = false } = options
  checkingRelease.value = true
  try {
    releaseCheck.value = await $fetch<ReleaseCheckResponse>('/api/version/latest', {
      credentials: 'include',
      query: refresh ? { refresh: '1' } : undefined
    })

    if (!notify) return

    const result = releaseCheck.value
    if (!result?.latestVersion) {
      toast.add({ title: t('settings.checkUpdateFailed'), color: 'error' })
      return
    }
    if (result.updateAvailable) {
      toast.add({
        title: t('settings.updateAvailable', { version: `v${result.latestVersion}` }),
        color: 'warning'
      })
      return
    }
    toast.add({ title: t('settings.upToDate'), color: 'success' })
  } catch {
    releaseCheck.value = null
    if (notify) {
      toast.add({ title: t('settings.checkUpdateFailed'), color: 'error' })
    }
  } finally {
    checkingRelease.value = false
  }
}

const loginVerificationOptions = computed(() => [
  { value: 'slider' as const, label: t('settings.loginVerificationSlider') },
  { value: 'turnstile' as const, label: t('settings.loginVerificationTurnstile') },
  { value: 'cap' as const, label: t('settings.loginVerificationCap') }
])

const loginVerificationHint = computed(() => {
  switch (loginVerificationMethodDraft.value) {
    case 'turnstile':
      return t('settings.loginVerificationTurnstileHint')
    case 'cap':
      return t('settings.loginVerificationCapHint')
    default:
      return t('settings.loginVerificationSliderHint')
  }
})

async function loadPage() {
  if (isAdmin.value) {
    await loadSettings()
    await checkLatestRelease()
  }
}

function ensureValidTab() {
  if (route.query.tab && !parseTab(route.query.tab)) {
    void router.replace({ query: { tab: defaultTab.value } })
  }
}

onMounted(async () => {
  const status = await fetchStatus()
  if (!status.initialized && !status.legacyMode) {
    await navigateTo('/setup')
    return
  }
  await checkSession()
  if (!isAuthenticated.value) {
    return
  }
  ensureValidTab()
  await loadPage()
})

watch(isAuthenticated, async (authed, prev) => {
  if (authed && prev === false) {
    ensureValidTab()
    await nextTick()
    await loadPage()
  } else if (!authed) {
    settings.value = null
    releaseCheck.value = null
  }
})

watch(() => route.query.tab, () => {
  ensureValidTab()
})

watch(isAdmin, () => {
  ensureValidTab()
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
        <div class="flex min-h-[36rem] flex-col lg:flex-row lg:items-stretch">
          <SettingsSidebar
            v-model="activeTab"
            :items="sidebarItems"
            :title="t('settings.pageTitle')"
            :subtitle="pageSubtitle"
          />

          <div class="flex min-w-0 flex-1 flex-col bg-default">
            <div
              class="flex-1"
              :class="activeTab === 'logs' ? '' : 'p-4 sm:p-5'"
            >
              <div
                v-if="activeTab === 'basic' && isAdmin"
              >
                <SettingsPanel v-if="settings">
                  <SettingsSection
                    :title="t('settings.featureToggles')"
                    :hint="t('settings.featureTogglesHint')"
                  >
                    <SettingsGroup>
                      <SettingsToggleRow
                        v-model="allowRegistrationDraft"
                        :title="t('settings.allowRegistration')"
                        :hint="t('settings.allowRegistrationHint')"
                      />
                    </SettingsGroup>
                  </SettingsSection>

                  <SettingsUserPreferencesFields />

                  <SettingsSection
                    :title="t('settings.systemInfo')"
                    :hint="t('settings.systemInfoHint')"
                  >
                    <template
                      v-if="isAdmin"
                      #action
                    >
                      <UButton
                        :label="t('settings.checkUpdate')"
                        icon="i-lucide-refresh-cw"
                        variant="outline"
                        color="neutral"
                        size="sm"
                        class="shrink-0"
                        :loading="checkingRelease"
                        @click="checkLatestRelease({ notify: true, refresh: true })"
                      />
                    </template>
                    <SettingsSystemInfo
                      :app-version="settings.appVersion"
                      :update-available="!!releaseCheck?.updateAvailable"
                      :latest-version="releaseCheck?.latestVersion ?? null"
                      :release-url="releaseCheck?.releaseUrl ?? null"
                    />
                  </SettingsSection>
                </SettingsPanel>
                <div
                  v-else
                  class="flex justify-center py-16"
                >
                  <UIcon
                    name="i-lucide-loader-circle"
                    class="size-6 animate-spin text-muted"
                  />
                </div>
              </div>

              <div
                v-else-if="activeTab === 'domains' && isAdmin"
              >
                <SettingsPanel v-if="settings">
                  <SettingsSection :title="t('settings.domainSettings')">
                    <p
                      v-if="settings.runtime.currentOrigin"
                      class="mb-3 pl-3 text-xs text-primary"
                    >
                      {{ t('settings.runtimeDetected', { url: settings.runtime.currentOrigin }) }}
                    </p>
                    <SettingsGroup>
                      <SettingsToggleRow
                        :model-value="domainSeparationDraft"
                        :title="t('setup.domainSeparation')"
                        :hint="t('setup.domainSeparationHint')"
                        @update:model-value="onDomainSeparationDraftChange"
                      />
                    </SettingsGroup>
                  </SettingsSection>

                  <p
                    v-if="domainSeparationDraft"
                    class="rounded-xl border border-warning/25 bg-warning/5 px-4 py-3 text-xs leading-relaxed text-warning"
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

                  <p
                    v-if="domainSeparationDraft && settings.runtime.hostRole === 'unknown'"
                    class="rounded-xl border border-error/25 bg-error/5 px-4 py-3 text-xs leading-relaxed text-error"
                  >
                    {{ t('settings.hostRoleUnknown') }}
                  </p>

                  <SettingsSection
                    :title="t('settings.pathAndLink')"
                    :hint="t('settings.pathAndLinkHint')"
                  >
                    <SettingsGroup>
                      <SettingsToggleRow
                        :model-value="hideFolderInUrlDraft"
                        :disabled="settings.hideFolderInUrlSource === 'env'"
                        @update:model-value="(v) => hideFolderInUrlDraft = v"
                      >
                        <template #title>
                          <span class="inline-flex flex-wrap items-center gap-2">
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
                        </template>
                        <template #hint>
                          {{ t('settings.hideFolderInUrlHint') }}
                        </template>
                      </SettingsToggleRow>
                      <SettingsToggleRow
                        :model-value="storageUseDatePathDraft"
                        :disabled="settings.storageUseDatePathSource === 'env'"
                        @update:model-value="(v) => storageUseDatePathDraft = v"
                      >
                        <template #title>
                          <span class="inline-flex flex-wrap items-center gap-2">
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
                        </template>
                        <template #hint>
                          {{ t('settings.storageUseDatePathHint') }}
                        </template>
                      </SettingsToggleRow>
                    </SettingsGroup>
                  </SettingsSection>

                  <SettingsSection :title="t('settings.imageBaseUrl')">
                    <div
                      v-if="domainSeparationDraft"
                      class="grid gap-4 sm:grid-cols-2"
                    >
                      <SettingsGroup>
                        <div class="space-y-3 px-4 py-4 sm:px-5">
                          <div class="flex flex-wrap items-center gap-2">
                            <p class="text-sm font-medium text-highlighted">
                              {{ t('settings.siteBaseUrl') }}
                            </p>
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
                          <div class="flex gap-2">
                            <UInput
                              v-model="siteBaseUrlDraft"
                              :placeholder="t('settings.siteBaseUrlPlaceholder')"
                              class="min-w-0 flex-1 font-mono text-sm"
                            />
                            <UButton
                              v-if="settings.runtime.currentOrigin"
                              :label="t('settings.fillDetectedOrigin')"
                              color="neutral"
                              variant="outline"
                              size="sm"
                              class="shrink-0"
                              @click="fillDetectedSiteOrigin"
                            />
                          </div>
                          <p
                            v-if="settings.effectiveSiteBaseUrl"
                            class="truncate text-xs text-muted"
                            :title="settings.effectiveSiteBaseUrl"
                          >
                            {{ t('settings.siteBaseUrlActive', { url: settings.effectiveSiteBaseUrl }) }}
                          </p>
                        </div>
                      </SettingsGroup>

                      <SettingsGroup>
                        <div class="space-y-3 px-4 py-4 sm:px-5">
                          <div class="flex flex-wrap items-center gap-2">
                            <p class="text-sm font-medium text-highlighted">
                              {{ t('settings.imageBaseUrl') }}
                            </p>
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
                            v-if="settings.effectiveImageBaseUrl"
                            class="truncate text-xs text-muted"
                            :title="settings.effectiveImageBaseUrl"
                          >
                            {{ t('settings.imageBaseUrlActive', { url: settings.effectiveImageBaseUrl }) }}
                          </p>
                        </div>
                      </SettingsGroup>
                    </div>

                    <SettingsGroup v-else>
                      <div class="space-y-3 px-4 py-4 sm:px-5">
                        <div class="flex flex-wrap items-center gap-2">
                          <p class="text-sm font-medium text-highlighted">
                            {{ t('settings.imageBaseUrl') }}
                          </p>
                          <UBadge
                            color="success"
                            variant="subtle"
                            size="xs"
                          >
                            {{ t('settings.badgeOptional') }}
                          </UBadge>
                          <UBadge
                            v-if="settings.imageBaseUrlSource === 'env'"
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
                          v-if="settings.effectiveImageBaseUrl"
                          class="truncate text-xs text-muted"
                          :title="settings.effectiveImageBaseUrl"
                        >
                          {{ t('settings.imageBaseUrlActive', { url: settings.effectiveImageBaseUrl }) }}
                        </p>
                      </div>
                    </SettingsGroup>
                  </SettingsSection>
                </SettingsPanel>
                <div
                  v-else
                  class="flex justify-center py-16"
                >
                  <UIcon
                    name="i-lucide-loader-circle"
                    class="size-6 animate-spin text-muted"
                  />
                </div>
              </div>

              <div
                v-else-if="activeTab === 'access' && isAdmin"
                class="settings-referer-section"
              >
                <SettingsPanel v-if="settings">
                  <div class="flex items-start gap-3">
                    <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <UIcon
                        name="i-lucide-shield"
                        class="size-4 text-primary"
                      />
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <h2 class="text-sm font-semibold text-highlighted">
                          {{ t('settings.accessControl') }}
                        </h2>
                        <UBadge
                          :color="refererDraft.trim() ? 'success' : 'neutral'"
                          variant="subtle"
                          size="xs"
                        >
                          {{ refererDraft.trim() ? t('settings.refererEnabled') : t('settings.refererUnrestricted') }}
                        </UBadge>
                      </div>
                      <p class="mt-1 text-xs leading-relaxed text-muted">
                        {{ t('settings.refererHint') }}
                      </p>
                    </div>
                  </div>

                  <div class="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_12rem] xl:grid-cols-[minmax(0,1fr)_14rem]">
                    <div class="min-w-0 space-y-2">
                      <label class="text-sm font-medium text-highlighted">
                        {{ t('settings.refererDomainsLabel') }}
                      </label>
                      <UTextarea
                        v-model="refererDraft"
                        :placeholder="t('settings.refererPlaceholder')"
                        :rows="7"
                        :autoresize="false"
                        class="settings-referer-field w-full font-mono text-sm"
                      />
                      <div class="flex gap-2 rounded-lg border border-info/20 bg-info/5 px-3 py-2.5 text-xs leading-relaxed text-muted">
                        <UIcon
                          name="i-lucide-info"
                          class="mt-0.5 size-3.5 shrink-0 text-info"
                        />
                        <span>{{ t('settings.refererTip') }}</span>
                      </div>
                    </div>

                    <div class="space-y-3 border-l border-default pl-4">
                      <div>
                        <p class="text-xs font-medium text-highlighted">
                          {{ t('settings.refererExamplesTitle') }}
                        </p>
                        <p class="mt-2 font-mono text-xs text-muted">
                          {{ t('settings.refererExamplesSample') }}
                        </p>
                      </div>
                      <div>
                        <p class="text-xs font-medium text-highlighted">
                          {{ t('settings.refererScenarioTitle') }}
                        </p>
                        <p class="mt-1 text-xs leading-relaxed text-muted">
                          {{ t('settings.refererScenarioDesc') }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <SettingsSection
                    :title="t('settings.loginVerification')"
                    :hint="t('settings.loginVerificationHint')"
                  >
                    <SettingsGroup>
                      <div class="space-y-4 px-4 py-4 sm:px-5">
                        <URadioGroup
                          v-model="loginVerificationMethodDraft"
                          :items="loginVerificationOptions"
                        />
                        <p class="text-xs leading-relaxed text-muted">
                          {{ loginVerificationHint }}
                        </p>
                        <div
                          v-if="loginVerificationMethodDraft === 'turnstile'"
                          class="space-y-3 rounded-xl border border-default bg-muted/20 p-4"
                        >
                          <div class="space-y-2">
                            <label class="text-sm font-medium text-highlighted">
                              {{ t('settings.turnstileSiteKey') }}
                            </label>
                            <UInput
                              v-model="turnstileSiteKeyDraft"
                              :placeholder="t('settings.turnstileSiteKeyPlaceholder')"
                              class="w-full font-mono text-sm"
                            />
                          </div>
                          <div class="space-y-2">
                            <label class="text-sm font-medium text-highlighted">
                              {{ t('settings.turnstileSecretKey') }}
                            </label>
                            <UInput
                              v-model="turnstileSecretKeyDraft"
                              type="password"
                              :placeholder="t('settings.turnstileSecretKeyPlaceholder')"
                              class="w-full font-mono text-sm"
                            />
                          </div>
                        </div>
                        <div
                          v-else-if="loginVerificationMethodDraft === 'cap'"
                          class="space-y-3 rounded-xl border border-default bg-muted/20 p-4"
                        >
                          <div class="space-y-2">
                            <label class="text-sm font-medium text-highlighted">
                              {{ t('settings.capApiEndpoint') }}
                            </label>
                            <UInput
                              v-model="capApiEndpointDraft"
                              :placeholder="t('settings.capApiEndpointPlaceholder')"
                              class="w-full font-mono text-sm"
                            />
                          </div>
                          <div class="space-y-2">
                            <label class="text-sm font-medium text-highlighted">
                              {{ t('settings.capSecretKey') }}
                            </label>
                            <UInput
                              v-model="capSecretDraft"
                              type="password"
                              :placeholder="t('settings.capSecretKeyPlaceholder')"
                              class="w-full font-mono text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </SettingsGroup>
                  </SettingsSection>
                </SettingsPanel>
                <div
                  v-else
                  class="flex justify-center py-16"
                >
                  <UIcon
                    name="i-lucide-loader-circle"
                    class="size-6 animate-spin text-muted"
                  />
                </div>
              </div>

              <SettingsLogsPanel v-else-if="activeTab === 'logs'" />
            </div>

            <SettingsServerFooter
              v-if="showSaveBar && settings"
              :has-changes="hasServerChanges"
              :saving="savingServer"
              @save="saveServerSettings"
            />
          </div>
        </div>
      </section>
    </AppShell>

    <UModal
      :open="disableDomainSeparationOpen"
      :title="t('settings.disableDomainSeparationTitle')"
      :description="t('settings.disableDomainSeparationDesc')"
      @update:open="(v) => { if (!v) cancelDisableDomainSeparation() }"
    >
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="outline"
            @click="cancelDisableDomainSeparation"
          />
          <UButton
            :label="t('settings.disableDomainSeparationConfirm')"
            color="warning"
            @click="confirmDisableDomainSeparation"
          />
        </div>
      </template>
    </UModal>
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

export interface AuthConfigResponse {
  turnstileEnabled: boolean
  siteKey?: string
}

export function useAuthConfig() {
  const config = ref<AuthConfigResponse | null>(null)
  const loading = ref(true)

  async function fetchConfig() {
    loading.value = true
    try {
      config.value = await $fetch<AuthConfigResponse>('/api/auth/config')
    } catch {
      config.value = { turnstileEnabled: false }
    } finally {
      loading.value = false
    }
  }

  const turnstileEnabled = computed(() => config.value?.turnstileEnabled ?? false)
  const turnstileSiteKey = computed(() => config.value?.siteKey ?? '')

  return {
    config,
    loading,
    turnstileEnabled,
    turnstileSiteKey,
    fetchConfig
  }
}

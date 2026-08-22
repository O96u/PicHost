export function useUserAutoDeleteSettings() {
  const { isAuthenticated, handleAuthError } = useAuth()
  const toast = useToast()

  const userSettings = ref<{ autoDeleteDays: number } | null>(null)
  const enabled = ref(false)
  const daysDraft = ref(30)
  const hydrated = ref(false)
  const saving = ref(false)

  let daysSaveTimer: ReturnType<typeof setTimeout> | null = null

  function apply(data: { autoDeleteDays: number }) {
    hydrated.value = false
    userSettings.value = data
    enabled.value = data.autoDeleteDays > 0
    daysDraft.value = data.autoDeleteDays > 0 ? data.autoDeleteDays : 30
    nextTick(() => {
      hydrated.value = true
    })
  }

  async function load() {
    try {
      const data = await $fetch<{ autoDeleteDays: number }>('/api/user/settings', {
        credentials: 'include'
      })
      apply(data)
    } catch (error: unknown) {
      handleAuthError(error)
      if (isAuthenticated.value) {
        toast.add({ title: '加载设置失败', color: 'error' })
      }
    }
  }

  async function save() {
    if (!isAuthenticated.value || !userSettings.value) return

    const days = enabled.value ? daysDraft.value : 0
    if (enabled.value && (days < 1 || days > 3650)) return

    saving.value = true
    try {
      const data = await $fetch<{ autoDeleteDays: number }>('/api/user/settings', {
        method: 'PATCH',
        credentials: 'include',
        body: { autoDeleteDays: days }
      })
      apply(data)
    } catch (error: unknown) {
      handleAuthError(error)
      if (isAuthenticated.value) {
        toast.add({ title: '保存设置失败', color: 'error' })
      }
    } finally {
      saving.value = false
    }
  }

  watch(enabled, () => {
    if (!hydrated.value) return
    void save()
  })

  watch(daysDraft, () => {
    if (!hydrated.value || !enabled.value) return
    if (daysSaveTimer) clearTimeout(daysSaveTimer)
    daysSaveTimer = setTimeout(() => {
      void save()
    }, 500)
  })

  return {
    userSettings,
    enabled,
    daysDraft,
    saving,
    load
  }
}

<script setup lang="ts">
import { isPasswordValid } from '~/utils/password-strength'

const router = useRouter()
const {
  isChecking,
  isAuthenticated,
  checkSession,
  fetchStatus,
  changePassword
} = useAuth()
const toast = useToast()
const { t } = useI18n()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)

const canSubmit = computed(() =>
  Boolean(currentPassword.value && newPassword.value && confirmPassword.value)
  && newPassword.value === confirmPassword.value
  && isPasswordValid(newPassword.value)
)

onMounted(async () => {
  const status = await fetchStatus()
  if (!status.initialized && !status.legacyMode) {
    await router.replace('/setup')
    return
  }
  if (!isAuthenticated.value) {
    await checkSession()
  }
})

async function submit() {
  if (!canSubmit.value || loading.value) return

  if (newPassword.value !== confirmPassword.value) {
    toast.add({ title: t('auth.passwordMismatch'), color: 'error' })
    return
  }

  loading.value = true
  try {
    const result = await changePassword(currentPassword.value, newPassword.value)
    if (result.ok) {
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
      toast.add({ title: t('password.changed'), color: 'success' })
      await router.replace('/')
    } else {
      toast.add({ title: result.error, color: 'error' })
    }
  } finally {
    loading.value = false
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
          {{ t('common.loadingSession') }}
        </p>
      </div>
    </div>

    <AdminLoginGate v-else-if="!isAuthenticated" />

    <AppShell v-else>
      <section class="mx-auto max-w-md overflow-hidden rounded-2xl border border-default bg-elevated shadow-sm">
        <div class="border-b border-default px-5 py-4 sm:px-6">
          <h1 class="text-lg font-semibold tracking-tight">
            {{ t('password.title') }}
          </h1>
          <p class="mt-1 text-sm text-muted">
            {{ t('password.subtitle') }}
          </p>
        </div>

        <form
          class="space-y-5 p-5 sm:p-6"
          @submit.prevent="submit"
        >
          <div class="space-y-2">
            <label
              for="current-password"
              class="block text-sm font-medium"
            >
              {{ t('password.current') }}
            </label>
            <PasswordInput
              id="current-password"
              v-model="currentPassword"
              autocomplete="current-password"
            />
          </div>

          <div class="space-y-2">
            <label
              for="new-password"
              class="block text-sm font-medium"
            >
              {{ t('password.new') }}
            </label>
            <PasswordInput
              id="new-password"
              v-model="newPassword"
              :placeholder="t('password.newPlaceholder')"
              autocomplete="new-password"
            />
            <PasswordStrength :password="newPassword" />
          </div>

          <div class="space-y-2">
            <label
              for="confirm-new-password"
              class="block text-sm font-medium"
            >
              {{ t('password.confirmNew') }}
            </label>
            <PasswordInput
              id="confirm-new-password"
              v-model="confirmPassword"
              autocomplete="new-password"
            />
          </div>

          <div class="flex gap-2 pt-1">
            <UButton
              type="submit"
              :label="t('common.save')"
              icon="i-lucide-save"
              :loading="loading"
              :disabled="!canSubmit"
            />
            <UButton
              :label="t('common.cancel')"
              variant="ghost"
              color="neutral"
              to="/"
            />
          </div>
        </form>
      </section>
    </AppShell>
  </div>
</template>

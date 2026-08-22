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
    toast.add({ title: '两次输入的新密码不一致', color: 'error' })
    return
  }

  loading.value = true
  try {
    const result = await changePassword(currentPassword.value, newPassword.value)
    if (result.ok) {
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
      toast.add({ title: '密码已修改', color: 'success' })
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
          正在验证登录状态…
        </p>
      </div>
    </div>

    <AdminLoginGate v-else-if="!isAuthenticated" />

    <AppShell v-else>
      <section class="mx-auto max-w-md overflow-hidden rounded-2xl border border-default bg-elevated shadow-sm">
        <div class="border-b border-default px-5 py-4 sm:px-6">
          <h1 class="text-lg font-semibold tracking-tight">
            修改密码
          </h1>
          <p class="mt-1 text-sm text-muted">
            修改您的登录密码
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
              当前密码
            </label>
            <UInput
              id="current-password"
              v-model="currentPassword"
              type="password"
              autocomplete="current-password"
              size="lg"
              class="w-full"
              :ui="{ root: 'w-full' }"
            />
          </div>

          <div class="space-y-2">
            <label
              for="new-password"
              class="block text-sm font-medium"
            >
              新密码
            </label>
            <UInput
              id="new-password"
              v-model="newPassword"
              type="password"
              placeholder="设置新密码"
              autocomplete="new-password"
              size="lg"
              class="w-full"
              :ui="{ root: 'w-full' }"
            />
            <PasswordStrength :password="newPassword" />
          </div>

          <div class="space-y-2">
            <label
              for="confirm-new-password"
              class="block text-sm font-medium"
            >
              确认新密码
            </label>
            <UInput
              id="confirm-new-password"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              size="lg"
              class="w-full"
              :ui="{ root: 'w-full' }"
            />
          </div>

          <div class="flex gap-2 pt-1">
            <UButton
              type="submit"
              label="保存"
              icon="i-lucide-save"
              :loading="loading"
              :disabled="!canSubmit"
            />
            <UButton
              label="取消"
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

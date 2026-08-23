<script setup lang="ts">
import logoLight from '~/assets/image/logo-light.png'
import logoDark from '~/assets/image/logo-dark.png'
import { isPasswordValid } from '~/utils/password-strength'

const router = useRouter()
const { register, fetchStatus } = useAuth()
const toast = useToast()
const { t } = useI18n()

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)

const canSubmit = computed(() =>
  Boolean(username.value && password.value && confirmPassword.value)
  && password.value === confirmPassword.value
  && isPasswordValid(password.value)
  && AUTH_USERNAME_PATTERN.test(username.value.trim())
)

onMounted(async () => {
  const status = await fetchStatus()
  if (!status.initialized) {
    await router.replace('/setup')
    return
  }
  if (!status.allowRegistration) {
    await router.replace('/')
  }
})

async function submit() {
  if (!canSubmit.value || loading.value) return

  if (password.value !== confirmPassword.value) {
    toast.add({ title: t('auth.passwordMismatch'), color: 'error' })
    return
  }

  loading.value = true
  try {
    const result = await register(username.value.trim(), password.value)
    if (result.ok) {
      toast.add({ title: t('auth.registerSuccess'), color: 'success' })
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
  <div class="relative flex min-h-screen items-center justify-center bg-muted/30 p-4 sm:p-6">
    <div class="absolute top-4 right-4">
      <AuthPagePreferences />
    </div>
    <div class="w-full max-w-sm rounded-2xl border border-default bg-elevated p-6 shadow-lg sm:p-8">
      <div class="mb-8 space-y-3 text-center">
        <div class="mx-auto inline-flex items-center justify-center">
          <img
            :src="logoLight"
            alt=""
            aria-hidden="true"
            class="h-14 w-auto shrink-0 object-contain dark:hidden sm:h-16"
            decoding="async"
            draggable="false"
          >
          <img
            :src="logoDark"
            alt=""
            aria-hidden="true"
            class="hidden h-14 w-auto shrink-0 object-contain dark:block sm:h-16"
            decoding="async"
            draggable="false"
          >
        </div>
        <div class="space-y-1">
          <h1 class="text-xl font-bold tracking-tight sm:text-2xl">
            {{ t('register.title') }}
          </h1>
          <p class="text-sm text-muted">
            {{ t('register.subtitle') }}
          </p>
        </div>
      </div>

      <form
        class="flex w-full flex-col gap-5"
        @submit.prevent="submit"
      >
        <div class="w-full space-y-2">
          <label
            for="register-username"
            class="block text-sm font-medium text-default"
          >
            {{ t('auth.username') }}
          </label>
          <UInput
            id="register-username"
            v-model="username"
            :placeholder="t('setup.usernamePlaceholder')"
            autocomplete="username"
            size="lg"
            class="w-full"
            :ui="{ root: 'w-full' }"
          />
        </div>

        <div class="w-full space-y-2">
          <label
            for="register-password"
            class="block text-sm font-medium text-default"
          >
            {{ t('auth.password') }}
          </label>
          <UInput
            id="register-password"
            v-model="password"
            type="password"
            :placeholder="t('setup.passwordPlaceholder')"
            autocomplete="new-password"
            size="lg"
            class="w-full"
            :ui="{ root: 'w-full' }"
          />
          <PasswordStrength :password="password" />
        </div>

        <div class="w-full space-y-2">
          <label
            for="register-confirm"
            class="block text-sm font-medium text-default"
          >
            {{ t('auth.confirmPassword') }}
          </label>
          <UInput
            id="register-confirm"
            v-model="confirmPassword"
            type="password"
            :placeholder="t('setup.confirmPlaceholder')"
            autocomplete="new-password"
            size="lg"
            class="w-full"
            :ui="{ root: 'w-full' }"
          />
        </div>

        <UButton
          type="submit"
          :label="t('auth.register')"
          icon="i-lucide-user-plus"
          size="lg"
          block
          class="w-full"
          :loading="loading"
          :disabled="!canSubmit"
        />

        <p class="text-center text-sm text-muted">
          {{ t('auth.hasAccount') }}
          <NuxtLink
            to="/"
            class="text-primary hover:underline"
          >
            {{ t('auth.backToLogin') }}
          </NuxtLink>
        </p>
      </form>
    </div>
  </div>
</template>

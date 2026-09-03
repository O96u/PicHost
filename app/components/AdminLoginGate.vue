<script setup lang="ts">
import logoLight from '~/assets/image/logo-light.png'
import logoDark from '~/assets/image/logo-dark.png'
import type { LoginVerificationPayload } from '~/types/auth'

const router = useRouter()
const { login, fetchStatus, authStatus } = useAuth()
const toast = useToast()
const { t } = useI18n()

const username = ref('')
const password = ref('')
const secret = ref('')
const loading = ref(false)
const verificationRef = ref<{ reset: () => Promise<void> } | null>(null)
const verificationPayload = ref<LoginVerificationPayload | null>(null)
const verificationMountKey = ref(0)

const legacyMode = computed(() => authStatus.value?.legacyMode ?? false)
const allowRegistration = computed(() => authStatus.value?.allowRegistration ?? false)
const loginVerification = computed(() =>
  authStatus.value?.loginVerification ?? { method: 'slider' as const }
)

const canSubmit = computed(() =>
  Boolean(verificationPayload.value)
  && (legacyMode.value ? Boolean(secret.value) : Boolean(username.value && password.value))
)

function onVerificationVerified(payload: LoginVerificationPayload) {
  verificationPayload.value = payload
}

function onVerificationCleared() {
  verificationPayload.value = null
}

async function resetVerification() {
  verificationPayload.value = null
  await verificationRef.value?.reset()
}

onMounted(async () => {
  verificationPayload.value = null
  verificationMountKey.value += 1
  const status = await fetchStatus()
  if (!status.initialized && !status.legacyMode) {
    await router.replace('/setup')
    return
  }
})

async function submit() {
  if (!canSubmit.value || loading.value || !verificationPayload.value) return
  loading.value = true

  try {
    const verification = verificationPayload.value
    const result = legacyMode.value
      ? await login({ secret: secret.value }, verification)
      : await login({ username: username.value.trim(), password: password.value }, verification)

    if (result.ok) {
      if (result.needsMigration) {
        await router.replace('/setup?migrate=1')
        return
      }
      username.value = ''
      password.value = ''
      secret.value = ''
      await resetVerification()
      toast.add({ title: t('auth.loginSuccess'), color: 'success' })
    } else {
      await resetVerification()
      toast.add({
        title: result.error ?? (legacyMode.value ? t('auth.loginFailedSecret') : t('auth.loginFailedCredentials')),
        color: 'error'
      })
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
            <span class="text-highlighted">Pic</span><span class="text-primary">Host</span>
          </h1>
          <p class="text-sm text-muted">
            {{ t('app.tagline') }}
          </p>
        </div>
      </div>

      <form
        class="flex w-full flex-col gap-5"
        @submit.prevent="submit"
      >
        <template v-if="legacyMode">
          <div class="w-full space-y-2">
            <label
              for="admin-secret"
              class="block text-sm font-medium text-default"
            >
              {{ t('auth.adminSecret') }}
            </label>
            <PasswordInput
              id="admin-secret"
              v-model="secret"
              :placeholder="t('auth.adminSecretPlaceholder')"
              autocomplete="current-password"
              @keyup.enter="submit"
            />
            <p class="text-xs leading-relaxed text-muted">
              {{ t('auth.legacyHint') }}
            </p>
          </div>
        </template>

        <template v-else>
          <div class="w-full space-y-2">
            <label
              for="login-username"
              class="block text-sm font-medium text-default"
            >
              {{ t('auth.username') }}
            </label>
            <UInput
              id="login-username"
              v-model="username"
              :placeholder="t('auth.username')"
              autocomplete="username"
              size="lg"
              class="w-full"
              :ui="{ root: 'w-full' }"
            />
          </div>

          <div class="w-full space-y-2">
            <label
              for="login-password"
              class="block text-sm font-medium text-default"
            >
              {{ t('auth.password') }}
            </label>
            <PasswordInput
              id="login-password"
              v-model="password"
              :placeholder="t('auth.password')"
              autocomplete="current-password"
              @keyup.enter="submit"
            />
          </div>
        </template>

        <LoginVerification
          :key="verificationMountKey"
          ref="verificationRef"
          :method="loginVerification.method"
          :turnstile-site-key="loginVerification.turnstileSiteKey"
          :cap-api-endpoint="loginVerification.capApiEndpoint"
          @verified="onVerificationVerified"
          @cleared="onVerificationCleared"
        />

        <UButton
          type="submit"
          :label="t('auth.login')"
          icon="i-lucide-log-in"
          size="lg"
          block
          class="w-full"
          :loading="loading"
          :disabled="!canSubmit"
        />

        <p
          v-if="allowRegistration"
          class="text-center text-sm text-muted"
        >
          {{ t('auth.noAccount') }}
          <NuxtLink
            to="/register"
            class="text-primary hover:underline"
          >
            {{ t('auth.register') }}
          </NuxtLink>
        </p>
      </form>

      <p class="mt-6 text-center text-xs leading-relaxed text-dimmed">
        {{ t('auth.loginFooter') }}
      </p>
    </div>
  </div>
</template>

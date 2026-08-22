<script setup lang="ts">
import logoLight from '~/assets/image/logo-light.png'
import logoDark from '~/assets/image/logo-dark.png'

const emit = defineEmits<{
  success: []
}>()

const router = useRouter()
const { login, fetchStatus, authStatus } = useAuth()
const toast = useToast()

const username = ref('')
const password = ref('')
const secret = ref('')
const loading = ref(false)

const legacyMode = computed(() => authStatus.value?.legacyMode ?? false)
const allowRegistration = computed(() => authStatus.value?.allowRegistration ?? false)

const canSubmit = computed(() =>
  legacyMode.value ? Boolean(secret.value) : Boolean(username.value && password.value)
)

onMounted(async () => {
  const status = await fetchStatus()
  if (!status.initialized && !status.legacyMode) {
    await router.replace('/setup')
  }
})

async function submit() {
  if (!canSubmit.value || loading.value) return
  loading.value = true

  try {
    const result = legacyMode.value
      ? await login({ secret: secret.value })
      : await login({ username: username.value.trim(), password: password.value })

    if (result.ok) {
      if (result.needsMigration) {
        await router.replace('/setup?migrate=1')
        return
      }
      username.value = ''
      password.value = ''
      secret.value = ''
      emit('success')
      toast.add({ title: '登录成功', color: 'success' })
    } else {
      toast.add({
        title: result.error ?? (legacyMode.value ? '登录失败，请检查密钥' : '用户名或密码错误'),
        color: 'error'
      })
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-muted/30 p-4 sm:p-6">
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
            个人轻量图床
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
              管理密钥
            </label>
            <UInput
              id="admin-secret"
              v-model="secret"
              type="password"
              placeholder="输入 ADMIN_SECRET"
              autocomplete="current-password"
              size="lg"
              class="w-full"
              :ui="{ root: 'w-full' }"
              @keyup.enter="submit"
            />
            <p class="text-xs leading-relaxed text-muted">
              遗留部署：使用密钥登录后将引导创建账号
            </p>
          </div>
        </template>

        <template v-else>
          <div class="w-full space-y-2">
            <label
              for="login-username"
              class="block text-sm font-medium text-default"
            >
              用户名
            </label>
            <UInput
              id="login-username"
              v-model="username"
              placeholder="用户名"
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
              密码
            </label>
            <UInput
              id="login-password"
              v-model="password"
              type="password"
              placeholder="密码"
              autocomplete="current-password"
              size="lg"
              class="w-full"
              :ui="{ root: 'w-full' }"
              @keyup.enter="submit"
            />
          </div>
        </template>

        <UButton
          type="submit"
          label="登录"
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
          没有账号？
          <NuxtLink
            to="/register"
            class="text-primary hover:underline"
          >
            注册
          </NuxtLink>
        </p>
      </form>

      <p class="mt-6 text-center text-xs leading-relaxed text-dimmed">
        未登录时无法访问上传和管理功能
      </p>
    </div>
  </div>
</template>

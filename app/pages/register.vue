<script setup lang="ts">
import logoLight from '~/assets/image/logo-light.png'
import logoDark from '~/assets/image/logo-dark.png'
import { isPasswordValid } from '~/utils/password-strength'

const router = useRouter()
const { register, fetchStatus } = useAuth()
const toast = useToast()

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
    toast.add({ title: '两次输入的密码不一致', color: 'error' })
    return
  }

  loading.value = true
  try {
    const result = await register(username.value.trim(), password.value)
    if (result.ok) {
      toast.add({ title: '注册成功', color: 'success' })
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
            注册账号
          </h1>
          <p class="text-sm text-muted">
            创建 PicHost 用户账号
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
            用户名
          </label>
          <UInput
            id="register-username"
            v-model="username"
            placeholder="3–32 位字母、数字或下划线"
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
            密码
          </label>
          <UInput
            id="register-password"
            v-model="password"
            type="password"
            placeholder="设置登录密码"
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
            确认密码
          </label>
          <UInput
            id="register-confirm"
            v-model="confirmPassword"
            type="password"
            placeholder="再次输入密码"
            autocomplete="new-password"
            size="lg"
            class="w-full"
            :ui="{ root: 'w-full' }"
          />
        </div>

        <UButton
          type="submit"
          label="注册"
          icon="i-lucide-user-plus"
          size="lg"
          block
          class="w-full"
          :loading="loading"
          :disabled="!canSubmit"
        />

        <p class="text-center text-sm text-muted">
          已有账号？
          <NuxtLink
            to="/"
            class="text-primary hover:underline"
          >
            返回登录
          </NuxtLink>
        </p>
      </form>
    </div>
  </div>
</template>

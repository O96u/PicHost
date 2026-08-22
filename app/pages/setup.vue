<script setup lang="ts">
import logoLight from '~/assets/image/logo-light.png'
import logoDark from '~/assets/image/logo-dark.png'
import { isPasswordValid } from '~/utils/password-strength'

const route = useRoute()
const router = useRouter()
const { setup, migrate, fetchStatus } = useAuth()
const toast = useToast()

const isMigrate = computed(() => route.query.migrate === '1')

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const allowRegistration = ref(false)
const loading = ref(false)

const canSubmit = computed(() =>
  Boolean(username.value && password.value && confirmPassword.value)
  && password.value === confirmPassword.value
  && isPasswordValid(password.value)
  && AUTH_USERNAME_PATTERN.test(username.value.trim())
)

onMounted(async () => {
  const status = await fetchStatus()
  if (status.initialized && !status.needsMigration) {
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
    const payload = {
      username: username.value.trim(),
      password: password.value,
      allowRegistration: allowRegistration.value
    }
    const result = isMigrate.value
      ? await migrate(payload)
      : await setup(payload)

    if (result.ok) {
      toast.add({
        title: isMigrate.value ? '账号迁移完成' : '初始化完成',
        color: 'success'
      })
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
            <span class="text-highlighted">Pic</span><span class="text-primary">Host</span>
          </h1>
          <p class="text-sm text-muted">
            {{ isMigrate ? '迁移到账号密码登录' : '首次使用，创建管理员账号' }}
          </p>
        </div>
      </div>

      <form
        class="flex w-full flex-col gap-5"
        @submit.prevent="submit"
      >
        <div class="w-full space-y-2">
          <label
            for="setup-username"
            class="block text-sm font-medium text-default"
          >
            用户名
          </label>
          <UInput
            id="setup-username"
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
            for="setup-password"
            class="block text-sm font-medium text-default"
          >
            密码
          </label>
          <UInput
            id="setup-password"
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
            for="setup-confirm"
            class="block text-sm font-medium text-default"
          >
            确认密码
          </label>
          <UInput
            id="setup-confirm"
            v-model="confirmPassword"
            type="password"
            placeholder="再次输入密码"
            autocomplete="new-password"
            size="lg"
            class="w-full"
            :ui="{ root: 'w-full' }"
          />
        </div>

        <label class="flex cursor-pointer items-center gap-2 text-sm text-default">
          <UCheckbox v-model="allowRegistration" />
          允许其他用户注册
        </label>

        <UButton
          type="submit"
          :label="isMigrate ? '完成迁移' : '创建并进入'"
          icon="i-lucide-user-plus"
          size="lg"
          block
          class="w-full"
          :loading="loading"
          :disabled="!canSubmit"
        />
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  success: []
}>()

const { login } = useAdminAuth()
const { loading: configLoading, turnstileEnabled, turnstileSiteKey, fetchConfig } = useAuthConfig()
const toast = useToast()
const secret = ref('')
const turnstileToken = ref<string | null>(null)
const turnstileRef = ref<{ resetWidget: () => void } | null>(null)
const loading = ref(false)

const canSubmit = computed(() => {
  if (!secret.value) return false
  if (turnstileEnabled.value && !turnstileToken.value) return false
  return true
})

onMounted(() => {
  fetchConfig()
})

async function submit() {
  if (!canSubmit.value || loading.value) return
  loading.value = true

  try {
    const ok = await login(secret.value, turnstileToken.value)
    if (ok) {
      secret.value = ''
      turnstileToken.value = null
      emit('success')
      toast.add({ title: '登录成功', color: 'success' })
    } else {
      toast.add({ title: '登录失败，请检查密钥或人机验证', color: 'error' })
      turnstileRef.value?.resetWidget()
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
        <div class="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 sm:size-14">
          <UIcon
            name="i-lucide-lock-keyhole"
            class="size-6 text-primary sm:size-7"
          />
        </div>
        <div class="space-y-1">
          <h1 class="text-xl font-semibold tracking-tight sm:text-2xl">
            PicHost
          </h1>
          <p class="text-sm text-muted">
            个人轻量图床
          </p>
        </div>
      </div>

      <div
        v-if="configLoading"
        class="flex justify-center py-8"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin text-muted"
        />
      </div>

      <form
        v-else
        class="flex w-full flex-col gap-5"
        @submit.prevent="submit"
      >
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
            密钥仅用于验证身份，不会存储在浏览器中
          </p>
        </div>

        <div
          v-if="turnstileEnabled"
          class="w-full"
        >
          <TurnstileWidget
            ref="turnstileRef"
            v-model="turnstileToken"
            :site-key="turnstileSiteKey"
          />
        </div>

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
      </form>

      <p class="mt-6 text-center text-xs leading-relaxed text-dimmed">
        未登录时无法访问上传和管理功能
      </p>
    </div>
  </div>
</template>

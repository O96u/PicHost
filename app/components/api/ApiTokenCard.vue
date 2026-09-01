<script setup lang="ts">
const props = defineProps<{
  token: string
  loading: boolean
  regenerating: boolean
  canRegenerate: boolean
  tokenSource?: 'env' | 'db' | 'none'
  envTokenOverride?: boolean
  isAdmin?: boolean
}>()

const emit = defineEmits<{
  regenerate: []
}>()

const { t } = useI18n()
const toast = useToast()
const tokenVisible = ref(false)
const copying = ref(false)

function toggleTokenVisible() {
  tokenVisible.value = !tokenVisible.value
}

const displayValue = computed(() => {
  if (!props.token) return t('common.notConfigured')
  if (tokenVisible.value) return props.token
  return '•'.repeat(Math.min(props.token.length, 40))
})

function tokenSourceLabel(source: 'env' | 'db' | 'none' | undefined) {
  switch (source) {
    case 'env':
      return t('api.tokenSourceEnv')
    case 'db':
      return t('api.tokenSourceDb')
    default:
      return t('api.tokenSourceNone')
  }
}

async function copyToken() {
  if (!props.token || copying.value) return
  copying.value = true
  try {
    await navigator.clipboard.writeText(props.token)
    toast.add({ title: t('copy.copied'), color: 'success' })
  } catch {
    toast.add({ title: t('copy.failed'), color: 'error' })
  } finally {
    copying.value = false
  }
}
</script>

<template>
  <section class="border-b border-default">
    <div class="flex items-center gap-2 border-b border-default px-5 py-4 sm:px-6">
      <UIcon
        name="i-lucide-key-round"
        class="size-5 shrink-0 text-primary"
      />
      <h2 class="text-base font-semibold">
        {{ t('api.tokenTitle') }}
      </h2>
    </div>

    <div class="space-y-4 p-5 sm:p-6">
      <UAlert
        v-if="envTokenOverride"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :title="t('api.envOverrideTitle')"
        :description="t('api.envOverrideDesc')"
      />

      <UAlert
        v-else-if="!isAdmin"
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        :title="t('api.personalTitle')"
        :description="t('api.personalDesc')"
      />

      <UAlert
        v-else-if="!token && !loading"
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        :title="t('api.notConfiguredTitle')"
        :description="t('api.notConfiguredDesc')"
      />

      <div class="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <UInput
          :model-value="displayValue"
          readonly
          class="min-w-0 flex-1 font-mono text-xs sm:text-sm"
          :loading="loading"
        />
        <div class="flex gap-2">
          <UButton
            size="sm"
            variant="outline"
            color="neutral"
            :label="tokenVisible ? t('api.hideToken') : t('api.showToken')"
            @click="toggleTokenVisible"
          />
          <UButton
            size="sm"
            variant="outline"
            color="neutral"
            :label="t('common.copy')"
            :loading="copying"
            :disabled="!token"
            @click="copyToken"
          />
          <UButton
            icon="i-lucide-refresh-cw"
            :label="t('api.regenerate')"
            color="primary"
            variant="soft"
            size="sm"
            :loading="regenerating"
            :disabled="!canRegenerate"
            @click="emit('regenerate')"
          />
        </div>
      </div>

      <p
        v-if="tokenSource"
        class="text-xs text-muted"
      >
        {{ tokenSourceLabel(tokenSource) }}
        · {{ t('api.tokenHeader') }}
        <code class="font-mono">Auth-Token: &lt;token&gt;</code>
        <template v-if="token && !envTokenOverride">
          · {{ t('api.tokenInvalidate') }}
        </template>
      </p>
    </div>
  </section>
</template>

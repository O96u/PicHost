<script setup lang="ts">
const props = defineProps<{
  apiEndpoint: string
}>()

const emit = defineEmits<{
  verified: [payload: { capToken: string }]
  cleared: []
}>()

const { t } = useI18n()

const widgetRef = ref<HTMLElement | null>(null)
const ready = ref(false)

onMounted(async () => {
  const capWindow = window as Window & {
    CAP_CUSTOM_WASM_URL?: string
    CAP_CUSTOM_HASHWX_URL?: string
  }
  // SHA-256 与 hashwx 的求解器都放在本站 /cap，避免组件去 jsDelivr 拉 wasm。
  capWindow.CAP_CUSTOM_WASM_URL = '/cap/cap_wasm_bg.wasm'
  capWindow.CAP_CUSTOM_HASHWX_URL = '/cap/hashwx.wasm'
  await import('cap-widget')
  ready.value = true
})

function onSolve(event: Event) {
  const token = (event as CustomEvent<{ token: string }>).detail?.token
  if (token) {
    emit('verified', { capToken: token })
  }
}

function onError() {
  emit('cleared')
}

function reset() {
  const widget = widgetRef.value as (HTMLElement & { reset?: () => void }) | null
  widget?.reset?.()
  emit('cleared')
}

defineExpose({ reset })
</script>

<template>
  <ClientOnly>
    <cap-widget
      v-if="ready"
      ref="widgetRef"
      :data-cap-api-endpoint="props.apiEndpoint"
      :data-cap-i18n-initial-state="t('auth.capInitialState')"
      :data-cap-i18n-verifying-label="t('auth.capVerifying')"
      :data-cap-i18n-solved-label="t('auth.capSolved')"
      :data-cap-i18n-error-label="t('auth.capError')"
      @solve="onSolve"
      @error="onError"
    />
  </ClientOnly>
</template>

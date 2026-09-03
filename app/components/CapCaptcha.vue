<script setup lang="ts">
import 'cap-widget'

const props = defineProps<{
  apiEndpoint: string
}>()

const emit = defineEmits<{
  verified: [payload: { capToken: string }]
  cleared: []
}>()

const { t } = useI18n()

const widgetRef = ref<HTMLElement | null>(null)

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

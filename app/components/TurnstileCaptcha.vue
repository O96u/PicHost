<script setup lang="ts">
const props = defineProps<{
  siteKey: string
}>()

const emit = defineEmits<{
  verified: [payload: { turnstileToken: string }]
  cleared: []
}>()

interface TurnstileRenderOptions {
  'sitekey': string
  'action'?: string
  'callback'?: (token: string) => void
  'expired-callback'?: () => void
  'error-callback'?: () => void
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string
  reset: (widgetId?: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
    onTurnstileLoad?: () => void
  }
}

const containerRef = ref<HTMLElement | null>(null)
const widgetId = ref<string | null>(null)
const scriptLoaded = ref(false)

function onVerified(token: string) {
  if (token) {
    emit('verified', { turnstileToken: token })
  }
}

function onCleared() {
  emit('cleared')
}

function renderWidget() {
  if (!containerRef.value || !window.turnstile || !props.siteKey) return
  if (widgetId.value) {
    window.turnstile.remove(widgetId.value)
    widgetId.value = null
  }
  widgetId.value = window.turnstile.render(containerRef.value, {
    'sitekey': props.siteKey,
    'action': 'login',
    'callback': onVerified,
    'expired-callback': onCleared,
    'error-callback': onCleared
  })
}

function tryRenderWidget() {
  if (scriptLoaded.value) {
    renderWidget()
  }
}

function loadScript() {
  if (window.turnstile) {
    scriptLoaded.value = true
    tryRenderWidget()
    return
  }
  window.onTurnstileLoad = () => {
    scriptLoaded.value = true
    tryRenderWidget()
  }
  const existing = document.querySelector('script[data-turnstile]')
  if (existing) {
    if (window.turnstile) {
      scriptLoaded.value = true
      tryRenderWidget()
    }
    return
  }
  const script = document.createElement('script')
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad'
  script.async = true
  script.defer = true
  script.dataset.turnstile = 'true'
  document.head.appendChild(script)
}

function reset() {
  if (window.turnstile && widgetId.value) {
    window.turnstile.reset(widgetId.value)
  }
  onCleared()
}

onMounted(async () => {
  loadScript()
  await nextTick()
  tryRenderWidget()
})

watch([containerRef, () => props.siteKey, scriptLoaded], () => {
  tryRenderWidget()
}, { flush: 'post' })

defineExpose({ reset })
</script>

<template>
  <ClientOnly>
    <div
      ref="containerRef"
      class="flex min-h-16 items-center justify-center"
    />
  </ClientOnly>
</template>

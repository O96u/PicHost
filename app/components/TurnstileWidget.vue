<script setup lang="ts">
const token = defineModel<string | null>({ default: null })

const props = defineProps<{
  siteKey: string
}>()

const container = ref<HTMLDivElement | null>(null)
const widgetId = ref<string | null>(null)
const scriptLoaded = ref(false)

useHead({
  script: [{
    src: 'https://challenges.cloudflare.com/turnstile/v0/api.js',
    async: true,
    defer: true,
    onload: () => {
      scriptLoaded.value = true
    }
  }]
})

function resetWidget() {
  token.value = null
  if (widgetId.value && window.turnstile) {
    window.turnstile.reset(widgetId.value)
  }
}

function renderWidget() {
  if (!props.siteKey || !container.value || !window.turnstile) return

  if (widgetId.value) {
    window.turnstile.remove(widgetId.value)
    widgetId.value = null
  }

  widgetId.value = window.turnstile.render(container.value, {
    'sitekey': props.siteKey,
    'action': 'login',
    'theme': 'auto',
    'callback': (value: string) => {
      token.value = value
    },
    'expired-callback': () => {
      token.value = null
    },
    'error-callback': () => {
      token.value = null
    }
  })
}

let pollTimer: number | undefined

watch(
  () => [props.siteKey, scriptLoaded.value] as const,
  () => {
    if (!props.siteKey) return
    if (window.turnstile) {
      nextTick(renderWidget)
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (!props.siteKey) return

  if (window.turnstile) {
    renderWidget()
    return
  }

  pollTimer = window.setInterval(() => {
    if (window.turnstile) {
      window.clearInterval(pollTimer)
      pollTimer = undefined
      renderWidget()
    }
  }, 100)
})

onUnmounted(() => {
  if (pollTimer) {
    window.clearInterval(pollTimer)
  }
  if (widgetId.value && window.turnstile) {
    window.turnstile.remove(widgetId.value)
  }
})

defineExpose({ resetWidget })
</script>

<template>
  <div
    v-if="siteKey"
    ref="container"
    class="w-full [&>div]:mx-auto"
  />
</template>

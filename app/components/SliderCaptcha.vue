<script setup lang="ts">
const emit = defineEmits<{
  verified: [payload: { id: string, positionPercent: number }]
}>()

const { t } = useI18n()

const THUMB_SIZE = 40
const TRACK_INSET = 4

const trackRef = ref<HTMLElement | null>(null)
const challengeId = ref('')
const trackSvg = ref('')
const sliderPercent = ref(0)
const verified = ref(false)
const loading = ref(false)
const dragging = ref(false)
const shake = ref(false)
const confirming = ref(false)

const trackWidth = ref(0)

function updateTrackWidth() {
  trackWidth.value = trackRef.value?.clientWidth ?? 0
}

function percentToPx(percent: number) {
  const max = Math.max(trackWidth.value - THUMB_SIZE - TRACK_INSET * 2, 0)
  return TRACK_INSET + (percent / 100) * max
}

const thumbLeft = computed(() => percentToPx(sliderPercent.value))
const isActive = computed(() => dragging.value || sliderPercent.value > 0.5)
const fillWidth = computed(() => `${Math.max(thumbLeft.value + THUMB_SIZE - TRACK_INSET, 0)}px`)
const trackSvgUrl = computed(() =>
  trackSvg.value
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trackSvg.value)}`
    : ''
)
const hintOpacity = computed(() => {
  if (verified.value) return 0
  if (!isActive.value) return 1
  return Math.max(0, 1 - sliderPercent.value / 40)
})
const successLabelLeft = computed(() => `${thumbLeft.value + THUMB_SIZE + 8}px`)

async function loadChallenge() {
  loading.value = true
  verified.value = false
  dragging.value = false
  shake.value = false
  sliderPercent.value = 0
  trackSvg.value = ''
  try {
    const data = await $fetch<{ id: string, svg: string }>('/api/auth/captcha')
    challengeId.value = data.id
    trackSvg.value = data.svg
  } finally {
    loading.value = false
    await nextTick()
    updateTrackWidth()
  }
}

function setSliderFromClientX(clientX: number) {
  if (!trackRef.value || verified.value || loading.value || confirming.value) return
  const rect = trackRef.value.getBoundingClientRect()
  const max = Math.max(rect.width - THUMB_SIZE - TRACK_INSET * 2, 1)
  const x = Math.min(
    Math.max(clientX - rect.left - THUMB_SIZE / 2 - TRACK_INSET, 0),
    max
  )
  sliderPercent.value = (x / max) * 100
}

async function tryConfirm() {
  if (verified.value || !challengeId.value || confirming.value) return

  confirming.value = true
  try {
    const position = Math.round(sliderPercent.value)
    await $fetch('/api/auth/captcha/confirm', {
      method: 'POST',
      body: {
        id: challengeId.value,
        captchaPosition: position
      }
    })
    verified.value = true
    emit('verified', {
      id: challengeId.value,
      positionPercent: position
    })
  } catch {
    shake.value = true
    sliderPercent.value = 0
    window.setTimeout(() => {
      shake.value = false
    }, 450)
  } finally {
    confirming.value = false
  }
}

function onThumbPointerDown(event: PointerEvent) {
  if (verified.value || loading.value || confirming.value) return
  dragging.value = true
  updateTrackWidth()
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onThumbPointerMove(event: PointerEvent) {
  if (!dragging.value) return
  setSliderFromClientX(event.clientX)
}

function onThumbPointerUp() {
  if (!dragging.value) return
  dragging.value = false
  if (!verified.value) {
    void tryConfirm()
  }
}

onMounted(() => {
  void loadChallenge()
})

let resizeObserver: ResizeObserver | undefined

watch(trackRef, (el, _, onCleanup) => {
  resizeObserver?.disconnect()
  resizeObserver = undefined
  if (!el) return
  updateTrackWidth()
  if (typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(updateTrackWidth)
  resizeObserver.observe(el)
  onCleanup(() => {
    resizeObserver?.disconnect()
    resizeObserver = undefined
  })
})

defineExpose({ reset: loadChallenge })
</script>

<template>
  <div
    ref="trackRef"
    class="captcha-track relative h-12 select-none overflow-hidden rounded-lg border transition-[background-color,border-color] duration-300"
    :class="[
      verified
        ? 'border-primary/35 bg-primary/10'
        : 'border-default bg-muted/20',
      loading ? 'opacity-70' : '',
      shake ? 'captcha-shake' : ''
    ]"
  >
    <div
      v-if="loading"
      class="absolute inset-0 flex items-center justify-center"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-5 animate-spin text-muted"
      />
    </div>

    <template v-else>
      <img
        v-if="trackSvgUrl"
        :src="trackSvgUrl"
        alt=""
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 size-full object-fill transition-opacity duration-300"
        :class="verified ? 'opacity-0' : 'opacity-100'"
        draggable="false"
      >

      <div
        v-if="isActive && !verified"
        class="pointer-events-none absolute inset-y-1 left-1 rounded-md bg-primary/20 transition-[width] duration-75"
        :style="{ width: fillWidth }"
      />

      <p
        v-if="!verified"
        class="pointer-events-none absolute inset-0 flex items-center justify-center pl-12 text-sm text-muted transition-opacity duration-150"
        :style="{ opacity: hintOpacity }"
      >
        {{ t('auth.captchaHint') }}
      </p>

      <p
        v-if="verified"
        class="pointer-events-none absolute inset-y-0 flex items-center pr-3 text-sm font-medium text-primary"
        :style="{ left: successLabelLeft }"
      >
        {{ t('auth.captchaSuccess') }}
      </p>

      <div
        class="absolute top-1/2 -translate-y-1/2 touch-none rounded-md border transition-[left,background-color,border-color,color,box-shadow,transform] duration-150"
        :class="[
          verified
            ? 'z-20 border-primary bg-primary text-white shadow-sm shadow-primary/25'
            : isActive
              ? 'z-10 border-primary/45 bg-elevated text-primary shadow-md'
              : 'z-10 border-default/90 bg-elevated text-muted shadow-sm',
          dragging ? 'scale-[1.02] cursor-grabbing' : verified ? 'cursor-default' : 'cursor-grab'
        ]"
        :style="{
          left: `${thumbLeft}px`,
          width: `${THUMB_SIZE}px`,
          height: `${THUMB_SIZE}px`
        }"
        @pointerdown="onThumbPointerDown"
        @pointermove="onThumbPointerMove"
        @pointerup="onThumbPointerUp"
        @pointercancel="onThumbPointerUp"
      >
        <div class="flex size-full items-center justify-center">
          <UIcon
            v-if="confirming"
            name="i-lucide-loader-2"
            class="size-4 animate-spin"
            :class="verified ? 'text-white' : isActive ? 'text-primary' : 'text-muted'"
          />
          <UIcon
            v-else
            :name="verified ? 'i-lucide-check' : 'i-lucide-chevrons-right'"
            class="size-4"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.captcha-shake {
  animation: captcha-shake 0.4s ease;
}

@keyframes captcha-shake {
  0%,
  100% {
    transform: translateX(0);
  }

  25%,
  75% {
    transform: translateX(-4px);
  }

  50% {
    transform: translateX(4px);
  }
}
</style>

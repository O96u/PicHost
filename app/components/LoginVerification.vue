<script setup lang="ts">
import type {
  LoginVerificationMethod,
  LoginVerificationPayload
} from '~/types/auth'

const props = defineProps<{
  method: LoginVerificationMethod
  turnstileSiteKey?: string
  capApiEndpoint?: string
}>()

const emit = defineEmits<{
  verified: [payload: LoginVerificationPayload]
  cleared: []
}>()

const sliderRef = ref<{ reset: () => Promise<void> } | null>(null)
const turnstileRef = ref<{ reset: () => void } | null>(null)
const capRef = ref<{ reset: () => void } | null>(null)

function onSliderVerified(payload: { id: string, positionPercent: number }) {
  emit('verified', {
    method: 'slider',
    captchaId: payload.id,
    captchaPosition: payload.positionPercent
  })
}

function onTurnstileVerified(payload: { turnstileToken: string }) {
  emit('verified', {
    method: 'turnstile',
    turnstileToken: payload.turnstileToken
  })
}

function onCapVerified(payload: { capToken: string }) {
  emit('verified', {
    method: 'cap',
    capToken: payload.capToken
  })
}

function onCleared() {
  emit('cleared')
}

async function reset() {
  emit('cleared')
  if (props.method === 'slider') {
    await sliderRef.value?.reset()
    return
  }
  if (props.method === 'turnstile') {
    turnstileRef.value?.reset()
    return
  }
  capRef.value?.reset()
}

defineExpose({ reset })
</script>

<template>
  <SliderCaptcha
    v-if="method === 'slider'"
    ref="sliderRef"
    @verified="onSliderVerified"
  />
  <TurnstileCaptcha
    v-else-if="method === 'turnstile' && turnstileSiteKey"
    ref="turnstileRef"
    :site-key="turnstileSiteKey"
    @verified="onTurnstileVerified"
    @cleared="onCleared"
  />
  <CapCaptcha
    v-else-if="method === 'cap' && capApiEndpoint"
    ref="capRef"
    :api-endpoint="capApiEndpoint"
    @verified="onCapVerified"
    @cleared="onCleared"
  />
  <p
    v-else
    class="rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 text-xs text-warning"
  >
    {{ $t('auth.verificationMisconfigured') }}
  </p>
</template>

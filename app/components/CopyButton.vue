<script setup lang="ts">
const props = defineProps<{
  label?: string
  value: string
  iconOnly?: boolean
  icon?: string
  block?: boolean
  successTitle?: string
}>()

const emit = defineEmits<{
  copied: []
}>()

const toast = useToast()
const { t } = useI18n()
const copying = ref(false)

function copyWithFallback(text: string): boolean {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  textarea.setSelectionRange(0, text.length)

  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  } finally {
    document.body.removeChild(textarea)
  }
  return ok
}

function notifySuccess() {
  toast.add({
    title: props.successTitle ?? (props.label ? t('copy.copiedLabel', { label: props.label }) : t('copy.copied')),
    color: 'success'
  })
  emit('copied')
}

async function copy() {
  if (copying.value || !props.value) return
  copying.value = true

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(props.value)
        notifySuccess()
        return
      } catch {
        // 内网 http://IP 等非安全上下文会到这里，继续走回退
      }
    }

    if (copyWithFallback(props.value)) {
      notifySuccess()
    } else {
      toast.add({ title: t('copy.failedManual'), color: 'error' })
    }
  } finally {
    copying.value = false
  }
}
</script>

<template>
  <UButton
    size="xs"
    variant="soft"
    :loading="copying"
    :disabled="!value"
    :label="iconOnly ? undefined : label"
    :icon="icon"
    :class="block ? 'flex-1 justify-center' : undefined"
    :aria-label="iconOnly ? label : undefined"
    :title="iconOnly ? label : undefined"
    @click="copy"
  />
</template>

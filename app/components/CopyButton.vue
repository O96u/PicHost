<script setup lang="ts">
const props = defineProps<{
  label?: string
  value: string
}>()

const emit = defineEmits<{
  copied: []
}>()

const toast = useToast()
const copying = ref(false)

async function copy() {
  if (copying.value) return
  copying.value = true

  try {
    await navigator.clipboard.writeText(props.value)
    toast.add({ title: '已复制到剪贴板', color: 'success' })
    emit('copied')
  } catch {
    toast.add({ title: '复制失败', color: 'error' })
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
    :label="label"
    @click="copy"
  />
</template>

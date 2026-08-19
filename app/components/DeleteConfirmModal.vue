<script setup lang="ts">
defineProps<{
  open: boolean
  count: number
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
}>()

function close() {
  emit('update:open', false)
}

function confirm() {
  emit('confirm')
}
</script>

<template>
  <UModal
    :open="open"
    title="确认删除"
    :description="`确定要删除选中的 ${count} 张图片吗？此操作不可恢复。`"
    @update:open="emit('update:open', $event)"
  >
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="取消"
          color="neutral"
          variant="outline"
          @click="close"
        />
        <UButton
          label="确认删除"
          color="error"
          :loading="loading"
          @click="confirm"
        />
      </div>
    </template>
  </UModal>
</template>

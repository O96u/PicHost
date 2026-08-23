<script setup lang="ts">
const props = defineProps<{
  open: boolean
  count: number
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
}>()

const { t } = useI18n()

const description = computed(() => t('delete.confirmDesc', { count: props.count }))

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
    :title="t('delete.confirmTitle')"
    :description="description"
    @update:open="emit('update:open', $event)"
  >
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="outline"
          @click="close"
        />
        <UButton
          :label="t('delete.confirm')"
          color="error"
          :loading="loading"
          @click="confirm"
        />
      </div>
    </template>
  </UModal>
</template>

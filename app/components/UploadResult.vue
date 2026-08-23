<script setup lang="ts">
import type { UploadProgressItem } from '~/types/image'

defineProps<{
  items: UploadProgressItem[]
}>()

const { t } = useI18n()

function statusLabel(status: UploadProgressItem['status']) {
  switch (status) {
    case 'pending':
      return t('upload.statusPending')
    case 'uploading':
      return t('upload.statusUploading')
    case 'success':
      return t('upload.statusSuccess')
    default:
      return t('upload.statusError')
  }
}
</script>

<template>
  <div
    v-if="items.length"
    class="space-y-2 rounded-lg border border-default p-4"
  >
    <p class="text-sm font-medium text-muted">
      {{ t('upload.progress') }}
    </p>
    <div
      v-for="item in items"
      :key="item.name"
      class="space-y-1"
    >
      <div class="flex items-center justify-between gap-2 text-sm">
        <span class="truncate">{{ item.name }}</span>
        <UBadge
          :color="item.status === 'success' ? 'success' : item.status === 'error' ? 'error' : 'primary'"
          variant="subtle"
          size="xs"
        >
          {{ statusLabel(item.status) }}
        </UBadge>
      </div>
      <UProgress
        :model-value="item.progress"
        size="xs"
      />
      <p
        v-if="item.error"
        class="text-xs text-error"
      >
        {{ item.error }}
      </p>
    </div>
  </div>
</template>

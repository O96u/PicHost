<script setup lang="ts">
import type { UploadProgressItem } from '~/types/image'

defineProps<{
  items: UploadProgressItem[]
}>()
</script>

<template>
  <div
    v-if="items.length"
    class="space-y-2 rounded-lg border border-default p-4"
  >
    <p class="text-sm font-medium text-muted">
      上传进度
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
          {{ item.status === 'pending' ? '等待' : item.status === 'uploading' ? '上传中' : item.status === 'success' ? '成功' : '失败' }}
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

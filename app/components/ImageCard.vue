<script setup lang="ts">
import type { ImageItem } from '~/types/image'

const props = defineProps<{
  image: ImageItem
  selected: boolean
  deleting?: boolean
}>()

const emit = defineEmits<{
  'update:selected': [value: boolean]
  'delete': []
}>()

const { formatFileSize } = useFileSize()
const imageError = ref(false)

const uploadedLabel = computed(() => {
  try {
    return new Date(props.image.uploadedAt).toLocaleString('zh-CN')
  } catch {
    return props.image.uploadedAt
  }
})

function toggleSelected(value: boolean | 'indeterminate') {
  emit('update:selected', value === true)
}
</script>

<template>
  <div class="flex flex-col overflow-hidden rounded-lg border border-default bg-elevated">
    <div class="relative aspect-square bg-muted">
      <img
        v-if="!imageError"
        :src="image.url"
        :alt="image.originalName"
        loading="lazy"
        class="h-full w-full object-cover"
        @error="imageError = true"
      >
      <div
        v-else
        class="flex h-full items-center justify-center text-sm text-muted"
      >
        预览失败
      </div>
      <div class="absolute top-2 left-2">
        <UCheckbox
          :model-value="selected"
          @update:model-value="toggleSelected"
        />
      </div>
    </div>

    <div class="flex flex-1 flex-col gap-2 p-3">
      <p
        class="truncate text-sm font-medium"
        :title="image.originalName"
      >
        {{ image.originalName }}
      </p>
      <p class="text-xs text-muted">
        {{ uploadedLabel }} · {{ formatFileSize(image.size) }}
      </p>
      <p
        class="truncate text-xs text-dimmed"
        :title="image.key"
      >
        {{ image.key }}
      </p>

      <div class="mt-auto flex flex-wrap gap-1">
        <CopyButton
          label="直链"
          :value="image.url"
        />
        <CopyButton
          label="MD"
          :value="image.markdown"
        />
        <CopyButton
          label="HTML"
          :value="image.html"
        />
        <UButton
          size="xs"
          color="error"
          variant="soft"
          label="删除"
          :loading="deleting"
          @click="emit('delete')"
        />
      </div>
    </div>
  </div>
</template>

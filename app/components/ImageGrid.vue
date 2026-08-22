<script setup lang="ts">
import type { ImageItem } from '~/types/image'

const props = withDefaults(defineProps<{
  items: ImageItem[]
  selectedKeys: Set<string>
  deletingKeys: Set<string>
  selectable?: boolean
  showKey?: boolean
  emptyText?: string
}>(), {
  selectable: true,
  showKey: true,
  emptyText: '暂无图片'
})

const emit = defineEmits<{
  'update:selectedKeys': [value: Set<string>]
  'delete': [key: string]
}>()

function updateSelection(key: string, selected: boolean) {
  const next = new Set(props.selectedKeys)
  if (selected) next.add(key)
  else next.delete(key)
  emit('update:selectedKeys', next)
}
</script>

<template>
  <div
    v-if="items.length"
    class="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  >
    <ImageCard
      v-for="image in items"
      :key="image.key"
      :image="image"
      :selected="selectedKeys.has(image.key)"
      :deleting="deletingKeys.has(image.key)"
      :selectable="selectable"
      :show-key="showKey"
      @update:selected="updateSelection(image.key, $event)"
      @delete="emit('delete', image.key)"
    />
  </div>
  <div
    v-else
    class="rounded-xl border border-dashed border-default py-16 text-center text-sm text-muted"
  >
    {{ emptyText }}
  </div>
</template>

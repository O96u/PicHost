<script setup lang="ts">
import type { ImageItem } from '~/types/image'

const props = withDefaults(defineProps<{
  items: ImageItem[]
  selectedKeys: Set<string>
  deletingKeys: Set<string>
  selectable?: boolean
  showKey?: boolean
  showStorage?: boolean
  emptyText?: string
  dense?: boolean
  compact?: boolean
}>(), {
  selectable: true,
  showKey: true,
  showStorage: false,
  dense: false,
  compact: false
})

const emit = defineEmits<{
  'update:selectedKeys': [value: Set<string>]
  'delete': [key: string]
}>()

const { t } = useI18n()

const displayEmptyText = computed(() => props.emptyText ?? t('image.empty'))

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
    class="grid items-start sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    :class="dense ? 'grid-cols-2 gap-3' : 'grid-cols-1 gap-4'"
  >
    <ImageCard
      v-for="image in items"
      :key="image.key"
      :image="image"
      :selected="selectedKeys.has(image.key)"
      :deleting="deletingKeys.has(image.key)"
      :selectable="selectable"
      :show-key="showKey"
      :show-storage="showStorage"
      :compact="compact"
      @update:selected="updateSelection(image.key, $event)"
      @delete="emit('delete', image.key)"
    />
  </div>
  <div
    v-else
    class="rounded-xl border border-dashed border-default py-16 text-center text-sm text-muted"
  >
    {{ displayEmptyText }}
  </div>
</template>

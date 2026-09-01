<script setup lang="ts">
import type { ImageItem } from '~/types/image'

const props = defineProps<{
  items: ImageItem[]
  selectedKeys: Set<string>
}>()

const emit = defineEmits<{
  'update:selectedKeys': [value: Set<string>]
  'clear': []
}>()

const { t } = useI18n()

const allSelected = computed(() =>
  props.items.length > 0 && props.items.every(item => props.selectedKeys.has(item.key))
)

const someSelected = computed(() =>
  props.items.some(item => props.selectedKeys.has(item.key))
)

const indeterminate = computed(() => someSelected.value && !allSelected.value)

function toggleAll(value: boolean | 'indeterminate') {
  if (value === true) {
    emit('update:selectedKeys', new Set(props.items.map(item => item.key)))
    return
  }
  emit('update:selectedKeys', new Set())
}
</script>

<template>
  <div class="flex min-w-0 items-center gap-3">
    <UCheckbox
      :model-value="allSelected ? true : indeterminate ? 'indeterminate' : false"
      :disabled="!items.length"
      :aria-label="t('stats.selectAll')"
      @update:model-value="toggleAll"
    />
    <p class="text-sm text-muted">
      {{ t('stats.selectedItems', { n: selectedKeys.size }) }}
    </p>
    <button
      type="button"
      class="text-sm text-primary hover:underline disabled:pointer-events-none disabled:opacity-40"
      :disabled="selectedKeys.size === 0"
      @click="emit('clear')"
    >
      {{ t('stats.clear') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ImageItem } from '~/types/image'

const props = withDefaults(defineProps<{
  items: ImageItem[]
  selectedKeys: Set<string>
  selectable?: boolean
  showStorage?: boolean
  emptyText?: string
}>(), {
  selectable: false,
  showStorage: false
})

const emit = defineEmits<{
  'update:selectedKeys': [value: Set<string>]
  'preview': [image: ImageItem]
  'delete': [image: ImageItem]
}>()

const { t } = useI18n()
const { formatFileSize } = useFileSize()

const displayEmptyText = computed(() => props.emptyText ?? t('image.empty'))

const allSelected = computed(() =>
  props.items.length > 0 && props.items.every(item => props.selectedKeys.has(item.key))
)

const someSelected = computed(() =>
  props.items.some(item => props.selectedKeys.has(item.key))
)

const headerIndeterminate = computed(() => someSelected.value && !allSelected.value)

function updateSelection(key: string, selected: boolean) {
  const next = new Set(props.selectedKeys)
  if (selected) next.add(key)
  else next.delete(key)
  emit('update:selectedKeys', next)
}

function toggleAll(value: boolean | 'indeterminate') {
  if (value === true) {
    emit('update:selectedKeys', new Set(props.items.map(item => item.key)))
    return
  }
  emit('update:selectedKeys', new Set())
}

function formatUploadedAt(value: string) {
  try {
    const date = new Date(value)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    const s = String(date.getSeconds()).padStart(2, '0')
    return `${y}/${m}/${d} ${h}:${min}:${s}`
  } catch {
    return value
  }
}

function sourceLabel(image: ImageItem) {
  switch (image.uploadSource) {
    case 'web':
      return t('stats.tagWeb')
    case 'api':
      return t('stats.tagApi')
    default:
      return null
  }
}

function typeLabel(image: ImageItem) {
  if (props.showStorage && image.storage) return image.storage.name
  return '—'
}
</script>

<template>
  <div
    v-if="items.length"
    class="overflow-hidden rounded-xl border border-default bg-default"
  >
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead class="border-b border-default text-xs text-muted">
          <tr>
            <th
              v-if="selectable"
              class="w-10 px-4 py-3 text-left font-medium"
            >
              <UCheckbox
                :model-value="allSelected ? true : headerIndeterminate ? 'indeterminate' : false"
                :aria-label="t('stats.selectAll')"
                @update:model-value="toggleAll"
              />
            </th>
            <th class="min-w-[16rem] px-4 py-3 text-left font-medium">
              {{ t('stats.colFilename') }}
            </th>
            <th class="hidden w-28 px-4 py-3 text-left font-medium sm:table-cell">
              {{ t('stats.colSource') }}
            </th>
            <th class="w-24 px-4 py-3 text-left font-medium">
              {{ t('stats.colSize') }}
            </th>
            <th class="hidden w-32 px-4 py-3 text-left font-medium md:table-cell">
              {{ t('stats.colType') }}
            </th>
            <th class="hidden w-44 px-4 py-3 text-left font-medium lg:table-cell">
              {{ t('stats.colUploadedAt') }}
            </th>
            <th class="w-28 px-4 py-3 text-right font-medium">
              {{ t('stats.colActions') }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr
            v-for="image in items"
            :key="image.key"
            class="transition-colors hover:bg-muted/20"
          >
            <td
              v-if="selectable"
              class="px-4 py-3"
            >
              <UCheckbox
                :model-value="selectedKeys.has(image.key)"
                @update:model-value="updateSelection(image.key, $event === true)"
              />
            </td>
            <td class="px-4 py-3">
              <div class="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  class="relative size-10 shrink-0 overflow-hidden rounded-md border border-default bg-muted"
                  :aria-label="t('image.openPreview')"
                  @click="emit('preview', image)"
                >
                  <img
                    :src="image.url"
                    :alt="image.originalName"
                    loading="lazy"
                    class="size-full object-cover"
                  >
                </button>
                <p
                  class="min-w-0 flex-1 truncate font-medium"
                  :title="image.originalName"
                >
                  {{ image.originalName }}
                </p>
              </div>
            </td>
            <td class="hidden px-4 py-3 sm:table-cell">
              <span
                v-if="sourceLabel(image)"
                class="inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
              >
                {{ sourceLabel(image) }}
              </span>
              <span
                v-else
                class="text-muted"
              >—</span>
            </td>
            <td class="px-4 py-3 text-muted">
              {{ formatFileSize(image.size) }}
            </td>
            <td class="hidden px-4 py-3 text-muted md:table-cell">
              <span class="truncate">{{ typeLabel(image) }}</span>
            </td>
            <td class="hidden px-4 py-3 text-muted lg:table-cell">
              {{ formatUploadedAt(image.uploadedAt) }}
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-0.5 text-muted">
                <CopyButton
                  icon="i-lucide-link"
                  icon-only
                  variant="ghost"
                  color="neutral"
                  :label="t('common.copy')"
                  :value="image.url"
                  :success-title="t('copy.copiedUrl')"
                />
                <UButton
                  icon="i-lucide-eye"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  :aria-label="t('image.openPreview')"
                  @click="emit('preview', image)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  :aria-label="t('common.delete')"
                  @click="emit('delete', image)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <div
    v-else
    class="rounded-xl border border-dashed border-default py-16 text-center text-sm text-muted"
  >
    {{ displayEmptyText }}
  </div>
</template>

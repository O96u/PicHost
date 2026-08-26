<script setup lang="ts">
import type { ImageItem } from '~/types/image'

type CopyFormat = 'url' | 'markdown' | 'html'

const props = withDefaults(defineProps<{
  image: ImageItem
  selected: boolean
  deleting?: boolean
  selectable?: boolean
  showKey?: boolean
  showStorage?: boolean
  compact?: boolean
}>(), {
  selectable: true,
  showKey: true,
  showStorage: false,
  compact: false
})

const emit = defineEmits<{
  'update:selected': [value: boolean]
  'delete': []
}>()

const { formatFileSize } = useFileSize()
const { t, locale } = useI18n()
const imageError = ref(false)
const copyFormat = ref<CopyFormat>('url')

const copyFormatItems = computed(() => [
  { label: t('copy.url'), value: 'url' as const },
  { label: t('copy.markdown'), value: 'markdown' as const },
  { label: t('copy.html'), value: 'html' as const }
])

const uploadedLabel = computed(() => {
  try {
    return new Date(props.image.uploadedAt).toLocaleString(locale.value, { hour12: false })
  } catch {
    return props.image.uploadedAt
  }
})

const previewValue = computed(() => {
  switch (copyFormat.value) {
    case 'markdown':
      return props.image.markdown
    case 'html':
      return props.image.html
    default:
      return props.image.url
  }
})

const copySuccessTitle = computed(() => {
  switch (copyFormat.value) {
    case 'markdown':
      return t('copy.copiedMarkdown')
    case 'html':
      return t('copy.copiedHtml')
    default:
      return t('copy.copiedUrl')
  }
})

const storageIcon = computed(() =>
  props.image.storage?.type === 'local' ? 'i-lucide-hard-drive' : 'i-lucide-cloud'
)

function toggleSelected(value: boolean | 'indeterminate') {
  emit('update:selected', value === true)
}
</script>

<template>
  <div class="flex flex-col overflow-hidden rounded-xl border border-default bg-elevated shadow-sm">
    <div class="relative aspect-square shrink-0 overflow-hidden bg-muted">
      <img
        v-if="!imageError"
        :src="image.url"
        :alt="image.originalName"
        loading="lazy"
        class="absolute inset-0 size-full object-cover object-center"
        @error="imageError = true"
      >
      <div
        v-else
        class="flex h-full items-center justify-center text-sm text-muted"
      >
        {{ t('image.previewFailed') }}
      </div>
      <div
        v-if="selectable"
        class="absolute top-2 left-2"
      >
        <UCheckbox
          :model-value="selected"
          @update:model-value="toggleSelected"
        />
      </div>
      <div class="absolute top-2 right-2">
        <UButton
          size="xs"
          color="error"
          variant="solid"
          icon="i-lucide-trash-2"
          :aria-label="t('common.delete')"
          :loading="deleting"
          @click="emit('delete')"
        />
      </div>
      <div
        v-if="image.owner"
        class="absolute bottom-2 left-2 max-w-[calc(50%-0.5rem)]"
      >
        <span
          class="inline-flex max-w-full items-center gap-1 rounded-md bg-black/65 px-2 py-0.5 text-xs font-medium text-white shadow-sm backdrop-blur-sm"
          :title="t('image.uploader', { name: image.owner.username })"
        >
          <UIcon
            name="i-lucide-user"
            class="size-3 shrink-0"
          />
          <span class="truncate">{{ image.owner.username }}</span>
        </span>
      </div>
      <div
        v-if="showStorage && image.storage"
        class="absolute bottom-2 max-w-[calc(50%-0.5rem)]"
        :class="image.owner ? 'right-2' : 'left-2'"
      >
        <span
          class="inline-flex max-w-full items-center gap-1 rounded-md bg-black/65 px-2 py-0.5 text-xs font-medium text-white shadow-sm backdrop-blur-sm"
          :title="t('image.storageBackend', { name: image.storage.name })"
        >
          <UIcon
            :name="storageIcon"
            class="size-3 shrink-0"
          />
          <span class="truncate">{{ image.storage.name }}</span>
        </span>
      </div>
    </div>

    <div
      v-if="compact"
      class="flex items-center gap-1.5 p-2 sm:hidden"
    >
      <div class="min-w-0 flex-1">
        <p
          class="truncate text-xs font-medium"
          :title="image.originalName"
        >
          {{ image.originalName }}
        </p>
        <p class="text-[11px] text-muted">
          {{ formatFileSize(image.size) }}
        </p>
      </div>
      <CopyButton
        icon="i-lucide-copy"
        icon-only
        :label="t('common.copy')"
        :value="image.url"
        :success-title="t('copy.copiedUrl')"
      />
    </div>

    <div
      class="flex flex-1 flex-col gap-2 p-3"
      :class="{ 'hidden sm:flex': compact }"
    >
      <p
        class="truncate text-sm font-medium"
        :title="image.originalName"
      >
        {{ image.originalName }}
      </p>
      <p class="text-xs text-muted">
        {{ uploadedLabel }} · {{ formatFileSize(image.size) }}
      </p>

      <div class="flex gap-1 rounded-lg border border-default p-0.5">
        <UButton
          v-for="item in copyFormatItems"
          :key="item.value"
          size="xs"
          class="flex-1 justify-center"
          :variant="copyFormat === item.value ? 'solid' : 'ghost'"
          :color="copyFormat === item.value ? 'primary' : 'neutral'"
          :label="item.label"
          @click="() => { copyFormat = item.value }"
        />
      </div>

      <div class="flex items-center gap-1">
        <UInput
          :model-value="previewValue"
          readonly
          size="xs"
          class="min-w-0 flex-1 font-mono text-xs"
        />
        <CopyButton
          icon="i-lucide-copy"
          :label="t('common.copy')"
          :value="previewValue"
          :success-title="copySuccessTitle"
        />
      </div>

      <p
        v-if="showKey"
        class="truncate text-xs text-dimmed"
        :title="image.key"
      >
        {{ image.key }}
      </p>
    </div>
  </div>
</template>

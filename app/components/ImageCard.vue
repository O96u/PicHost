<script setup lang="ts">
import type { ImageItem } from '~/types/image'
import type { CopyFormat } from '~/composables/useUploadPreferences'

const props = withDefaults(defineProps<{
  image: ImageItem
  selected: boolean
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
  'preview': []
}>()

const { formatFileSize } = useFileSize()
const { t, locale } = useI18n()
const { copyFormat } = useUploadPreferences()
const imageError = ref(false)
const retryCount = ref(0)

function selectCopyFormat(value: CopyFormat) {
  copyFormat.value = value
}

const MAX_PREVIEW_RETRIES = 3
const PREVIEW_RETRY_DELAYS_MS = [1000, 2000, 4000]

const previewSrc = computed(() => {
  if (retryCount.value === 0) return props.image.url
  const separator = props.image.url.includes('?') ? '&' : '?'
  return `${props.image.url}${separator}retry=${retryCount.value}`
})

watch(() => props.image.key, () => {
  imageError.value = false
  retryCount.value = 0
})

let retryTimer: ReturnType<typeof setTimeout> | undefined

function clearRetryTimer() {
  if (retryTimer !== undefined) {
    clearTimeout(retryTimer)
    retryTimer = undefined
  }
}

function onPreviewError() {
  if (retryCount.value >= MAX_PREVIEW_RETRIES) {
    imageError.value = true
    return
  }

  const delay = PREVIEW_RETRY_DELAYS_MS[retryCount.value] ?? PREVIEW_RETRY_DELAYS_MS.at(-1)!
  clearRetryTimer()
  retryTimer = setTimeout(() => {
    retryCount.value += 1
    retryTimer = undefined
  }, delay)
}

onUnmounted(clearRetryTimer)

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
    <div
      class="relative aspect-square shrink-0 overflow-hidden bg-muted"
      role="button"
      tabindex="0"
      :aria-label="t('image.openPreview')"
      @click="emit('preview')"
      @keydown.enter="emit('preview')"
      @keydown.space.prevent="emit('preview')"
    >
      <img
        v-if="!imageError"
        :key="`${image.key}-${retryCount}`"
        :src="previewSrc"
        :alt="image.originalName"
        loading="lazy"
        class="absolute inset-0 size-full cursor-zoom-in object-cover object-center"
        @error="onPreviewError"
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
        @click.stop
      >
        <UCheckbox
          :model-value="selected"
          @update:model-value="toggleSelected"
        />
      </div>
      <div
        v-if="image.owner"
        class="absolute bottom-2 left-2 max-w-[calc(50%-0.5rem)]"
        @click.stop
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
        @click.stop
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
          @click="selectCopyFormat(item.value)"
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

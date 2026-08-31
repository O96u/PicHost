<script setup lang="ts">
import type { ImageItem } from '~/types/image'
import type { CopyFormat } from '~/composables/useUploadPreferences'
import { formatImageDimensions, getFileExtension } from '~/utils/image-display'

const props = withDefaults(defineProps<{
  open: boolean
  image: ImageItem | null
  showStorage?: boolean
  deleting?: boolean
}>(), {
  showStorage: false
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'delete': []
}>()

const { formatFileSize } = useFileSize()
const { t, locale } = useI18n()
const { copyFormat } = useUploadPreferences()

const naturalWidth = ref<number | null>(null)
const naturalHeight = ref<number | null>(null)
const dimensionsLoaded = ref(false)

const copyFormatItems = computed(() => [
  { label: t('copy.url'), value: 'url' as const },
  { label: t('copy.markdown'), value: 'markdown' as const },
  { label: t('copy.html'), value: 'html' as const }
])

const uploadedLabel = computed(() => {
  if (!props.image) return '—'
  try {
    return new Date(props.image.uploadedAt).toLocaleString(locale.value, { hour12: false })
  } catch {
    return props.image.uploadedAt
  }
})

const previewValue = computed(() => {
  if (!props.image) return ''
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
  props.image?.storage?.type === 'local' ? 'i-lucide-hard-drive' : 'i-lucide-cloud'
)

const uploadSourceLabel = computed(() => {
  if (!props.image?.uploadSource) return t('image.uploadSourceUnknown')
  return props.image.uploadSource === 'api'
    ? t('stats.sourceApi')
    : t('stats.sourceWeb')
})

const dimensionsLabel = computed(() => {
  const formatted = formatImageDimensions(naturalWidth.value, naturalHeight.value)
  if (formatted) return formatted
  return dimensionsLoaded.value ? '—' : t('image.previewDimensionsUnknown')
})

const detailRows = computed(() => {
  if (!props.image) return []

  const image = props.image
  const rows: Array<{ label: string, value: string, mono?: boolean, storage?: boolean }> = [
    { label: t('image.previewOriginalName'), value: image.originalName },
    { label: t('image.previewExtension'), value: getFileExtension(image.originalName) },
    { label: t('image.previewUploadedAt'), value: uploadedLabel.value },
    { label: t('image.previewSize'), value: formatFileSize(image.size) },
    { label: t('image.previewContentType'), value: image.contentType },
    { label: t('image.previewDimensions'), value: dimensionsLabel.value },
    { label: t('image.previewUploadSource'), value: uploadSourceLabel.value }
  ]

  if (image.owner) {
    rows.push({ label: t('image.previewOwner'), value: image.owner.username })
  }

  if (props.showStorage && image.storage) {
    rows.push({ label: t('image.previewStorage'), value: image.storage.name, storage: true })
  }

  rows.push({ label: t('image.previewKey'), value: image.key, mono: true })

  return rows
})

watch(() => props.image?.key, () => {
  naturalWidth.value = null
  naturalHeight.value = null
  dimensionsLoaded.value = false
})

function close() {
  emit('update:open', false)
}

function selectCopyFormat(value: CopyFormat) {
  copyFormat.value = value
}

function openInNewTab() {
  if (!props.image?.url) return
  window.open(props.image.url, '_blank', 'noopener,noreferrer')
}

function requestDelete() {
  emit('delete')
}

function onImageLoad(event: Event) {
  const img = event.target as HTMLImageElement
  naturalWidth.value = img.naturalWidth
  naturalHeight.value = img.naturalHeight
  dimensionsLoaded.value = true
}
</script>

<template>
  <UModal
    :open="open && !!image"
    :title="t('image.previewTitle')"
    :ui="{ content: 'max-w-5xl' }"
    @update:open="emit('update:open', $event)"
  >
    <template
      v-if="image"
      #body
    >
      <div class="grid gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-stretch">
        <div class="flex min-h-[14rem] items-center justify-center overflow-hidden rounded-xl border border-default bg-muted/15 p-3 md:min-h-[22rem]">
          <img
            :src="image.url"
            :alt="image.originalName"
            class="max-h-[min(70vh,32rem)] w-full object-contain"
            @load="onImageLoad"
          >
        </div>

        <div class="flex min-h-0 flex-col gap-4">
          <dl class="grid gap-2.5 sm:grid-cols-2">
            <div
              v-for="row in detailRows"
              :key="row.label"
              class="min-w-0 rounded-lg border border-default/60 bg-muted/10 px-3 py-2"
              :class="row.mono ? 'sm:col-span-2' : ''"
            >
              <dt class="text-xs text-muted">
                {{ row.label }}
              </dt>
              <dd
                class="mt-0.5 break-all text-sm"
                :class="row.mono ? 'font-mono text-xs text-dimmed' : 'font-medium'"
              >
                <span
                  v-if="row.storage && image.storage"
                  class="inline-flex items-center gap-1.5"
                >
                  <UIcon
                    :name="storageIcon"
                    class="size-3.5 shrink-0"
                  />
                  {{ row.value }}
                </span>
                <template v-else>
                  {{ row.value }}
                </template>
              </dd>
            </div>
          </dl>

          <div class="mt-auto space-y-2 rounded-xl border border-default/70 bg-muted/10 p-3">
            <p class="text-xs font-medium text-muted">
              {{ t('image.previewLinks') }}
            </p>
            <div class="flex gap-1 rounded-lg border border-default bg-default p-0.5">
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
            <div class="flex items-center gap-1.5">
              <UInput
                :model-value="previewValue"
                readonly
                size="sm"
                class="min-w-0 flex-1 font-mono text-xs"
              />
              <CopyButton
                icon="i-lucide-copy"
                :label="t('common.copy')"
                :value="previewValue"
                :success-title="copySuccessTitle"
              />
            </div>
          </div>

          <div class="flex flex-wrap justify-end gap-2 border-t border-default pt-3">
            <UButton
              :label="t('image.previewOpen')"
              icon="i-lucide-external-link"
              color="neutral"
              variant="outline"
              size="sm"
              @click="openInNewTab"
            />
            <UButton
              :label="t('common.delete')"
              icon="i-lucide-trash-2"
              color="error"
              variant="outline"
              size="sm"
              :loading="deleting"
              @click="requestDelete"
            />
            <UButton
              :label="t('image.previewClose')"
              color="neutral"
              variant="outline"
              size="sm"
              @click="close"
            />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

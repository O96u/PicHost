<script setup lang="ts">
import uploadCardBg from '~/assets/image/upload-card-bg.webp'
import uploadCardHero from '~/assets/image/upload-card-hero.webp'

const props = defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  'upload': [files: File[]]
  'open-settings': []
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

const { t } = useI18n()
const { bindPaste } = useClipboardImage(ref(null))

bindPaste((files) => {
  if (!props.disabled) emit('upload', files)
})

function openFilePicker() {
  if (props.disabled) return
  fileInput.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (files.length) emit('upload', files)
  input.value = ''
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  dragging.value = false
  if (props.disabled) return

  const files = Array.from(event.dataTransfer?.files ?? [])
    .filter(file => file.type.startsWith('image/'))
  if (files.length) emit('upload', files)
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (!props.disabled) dragging.value = true
}

function onDragLeave() {
  dragging.value = false
}

function openSettings(event: Event) {
  event.stopPropagation()
  if (props.disabled) return
  emit('open-settings')
}

function onKeydown(event: KeyboardEvent) {
  if (props.disabled) return
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    openFilePicker()
  }
}
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="upload-card-surface group/upload relative cursor-pointer overflow-hidden text-center outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    :class="{ 'upload-card-surface--active': dragging }"
    :aria-disabled="disabled"
    @click="openFilePicker"
    @keydown="onKeydown"
    @drop="onDrop"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
  >
    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/x-icon,.svg,.ico"
      multiple
      class="hidden"
      :disabled="disabled"
      @change="onFileChange"
    >

    <img
      :src="uploadCardBg"
      alt=""
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 size-full object-cover opacity-100 dark:opacity-[0.12]"
      decoding="async"
      draggable="false"
    >

    <div class="absolute top-3 right-3 z-20">
      <button
        type="button"
        class="upload-settings-btn inline-flex size-8 items-center justify-center rounded-md bg-default/70 text-muted backdrop-blur-sm transition-colors hover:bg-elevated hover:text-highlighted disabled:pointer-events-none disabled:opacity-40"
        :aria-label="t('upload.settings')"
        :disabled="disabled"
        @click="openSettings"
      >
        <UIcon
          name="i-lucide-settings"
          class="upload-settings-icon size-4"
        />
      </button>
    </div>

    <div class="relative z-10 mx-auto flex max-w-lg flex-col items-center">
      <div class="flex flex-col items-center">
        <img
          :src="uploadCardHero"
          alt=""
          aria-hidden="true"
          class="h-24 w-auto -mb-3 select-none transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] sm:-mb-4 sm:h-28 md:h-32"
          :class="dragging ? 'scale-105' : 'group-hover/upload:scale-[1.02]'"
          decoding="async"
          draggable="false"
        >

        <div class="space-y-2">
          <p class="text-xl font-semibold tracking-tight text-highlighted sm:text-2xl">
            {{ t('upload.title') }}
          </p>
          <p class="text-sm text-muted sm:text-base">
            {{ t('upload.hint', { ctrl: 'Ctrl', v: 'V' }) }}
          </p>
        </div>
      </div>

      <p class="mt-4 max-w-md text-xs leading-relaxed text-dimmed sm:text-sm">
        {{ t('upload.formats') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  'upload': [files: File[]]
  'open-settings': []
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const hovering = ref(false)

const { bindPaste } = useClipboardImage(ref(null))

const isActive = computed(() => dragging.value || hovering.value)

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

function onMouseEnter() {
  if (!props.disabled) hovering.value = true
}

function onMouseLeave() {
  hovering.value = false
}

function openSettings() {
  if (props.disabled) return
  emit('open-settings')
}
</script>

<template>
  <div
    class="upload-card-surface group/upload relative text-center transition-all duration-300 ease-out"
    :class="isActive
      ? 'scale-[1.01] border-primary bg-primary/5 shadow-md shadow-primary/10'
      : 'hover:border-primary/50 hover:bg-primary/[0.04] hover:shadow-sm'"
    @drop="onDrop"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
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

    <div class="absolute top-3 right-3 z-10">
      <button
        type="button"
        class="upload-settings-btn inline-flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-elevated hover:text-highlighted disabled:pointer-events-none disabled:opacity-40"
        aria-label="上传设置"
        :disabled="disabled"
        @click="openSettings"
      >
        <UIcon
          name="i-lucide-settings"
          class="upload-settings-icon size-4"
        />
      </button>
    </div>

    <div class="mx-auto max-w-lg space-y-4">
      <div
        class="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 transition-transform duration-300 ease-out"
        :class="isActive ? 'scale-110' : 'group-hover/upload:scale-105'"
      >
        <UIcon
          name="i-lucide-cloud-upload"
          class="size-8 text-primary transition-transform duration-300"
          :class="isActive ? '-translate-y-0.5' : ''"
        />
      </div>
      <div class="space-y-2">
        <p class="text-xl font-semibold tracking-tight">
          拖拽图片到此处上传
        </p>
        <p class="text-sm text-muted">
          或点击选择文件，按
          <kbd class="mx-1 rounded border border-default bg-muted/50 px-1.5 py-0.5 font-mono text-xs">Ctrl</kbd>
          +
          <kbd class="mx-1 rounded border border-default bg-muted/50 px-1.5 py-0.5 font-mono text-xs">V</kbd>
          粘贴图片
        </p>
      </div>
      <p class="text-xs text-dimmed">
        支持 JPEG / PNG / WebP / GIF / SVG / ICO，单张最大 10 MB，每次最多 10 张
      </p>
      <UButton
        label="选择图片"
        icon="i-lucide-upload"
        size="lg"
        :disabled="disabled"
        @click="openFilePicker"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  upload: [files: File[]]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

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
</script>

<template>
  <div
    class="rounded-xl border-2 border-dashed p-8 text-center transition-colors"
    :class="dragging ? 'border-primary bg-primary/5' : 'border-default bg-elevated/50'"
    @drop="onDrop"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
  >
    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      multiple
      class="hidden"
      :disabled="disabled"
      @change="onFileChange"
    >

    <div class="mx-auto max-w-md space-y-3">
      <UIcon
        name="i-lucide-image-plus"
        class="mx-auto size-10 text-muted"
      />
      <p class="text-lg font-medium">
        拖拽图片到此处
      </p>
      <p class="text-sm text-muted">
        或点击选择、Ctrl+V 粘贴图片
      </p>
      <p class="text-xs text-dimmed">
        支持 JPEG / PNG / WebP / GIF，单张最大 10 MB，每次最多 10 张
      </p>
      <UButton
        label="选择图片"
        icon="i-lucide-upload"
        :disabled="disabled"
        @click="openFilePicker"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  upload: [files: File[]]
}>()

const flipped = ref(false)

function onOpenSettings() {
  flipped.value = true
}

function onBack() {
  flipped.value = false
}
</script>

<template>
  <div
    class="upload-card-flip"
    :class="{ 'is-flipped': flipped }"
  >
    <div class="upload-card-flip-inner">
      <div class="upload-card-face upload-card-face--front">
        <ImageUploader
          :disabled="disabled"
          @upload="emit('upload', $event)"
          @open-settings="onOpenSettings"
        />
      </div>
      <div class="upload-card-face upload-card-face--back">
        <UploadPreferencesPanel @back="onBack" />
      </div>
    </div>
  </div>
</template>

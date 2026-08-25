<script setup lang="ts">
defineOptions({
  inheritAttrs: false
})

const model = defineModel<string>({ default: '' })

defineProps<{
  id?: string
  placeholder?: string
  autocomplete?: string
}>()

const show = ref(false)
const { t } = useI18n()
</script>

<template>
  <UInput
    :id="id"
    v-model="model"
    :type="show ? 'text' : 'password'"
    :placeholder="placeholder"
    :autocomplete="autocomplete"
    size="lg"
    class="w-full"
    :ui="{ root: 'w-full', trailing: 'pe-1' }"
    v-bind="$attrs"
  >
    <template #trailing>
      <UButton
        color="neutral"
        variant="link"
        size="sm"
        :icon="show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
        :aria-label="show ? t('auth.hidePassword') : t('auth.showPassword')"
        :aria-pressed="show"
        :aria-controls="id"
        type="button"
        @click="() => { show = !show }"
      />
    </template>
  </UInput>
</template>

<style scoped>
:deep(::-ms-reveal) {
  display: none;
}
</style>

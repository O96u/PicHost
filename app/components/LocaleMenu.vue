<script setup lang="ts">
const { localeMenuItems } = useAppearanceMenus()
const { t } = useI18n()
</script>

<template>
  <UDropdownMenu :items="localeMenuItems">
    <UButton
      icon="i-lucide-languages"
      variant="ghost"
      color="neutral"
      size="sm"
      :aria-label="t('locale.switch')"
    />
  </UDropdownMenu>
</template>

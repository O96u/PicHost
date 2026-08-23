<script setup lang="ts">
const { themeIcon, themeMenuItems } = useAppearanceMenus()
const { t } = useI18n()
</script>

<template>
  <UDropdownMenu :items="themeMenuItems">
    <UButton
      :icon="themeIcon"
      variant="ghost"
      color="neutral"
      size="sm"
      :aria-label="t('theme.switch')"
    />
  </UDropdownMenu>
</template>

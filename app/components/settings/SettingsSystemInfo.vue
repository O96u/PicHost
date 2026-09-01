<script setup lang="ts">
defineProps<{
  appVersion: string
  updateAvailable: boolean
  latestVersion: string | null
  releaseUrl: string | null
}>()

const { t } = useI18n()
</script>

<template>
  <div class="pl-3">
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-sm font-medium text-highlighted">
        {{ t('settings.systemVersion') }}
      </span>
      <UBadge
        color="neutral"
        variant="subtle"
        size="sm"
      >
        v{{ appVersion }}
      </UBadge>
      <a
        v-if="updateAvailable && latestVersion"
        :href="releaseUrl || 'https://github.com/O96u/PicHost/releases'"
        target="_blank"
        rel="noopener noreferrer"
        class="text-xs text-warning hover:underline"
      >
        {{ t('settings.updateAvailable', { version: `v${latestVersion}` }) }}
      </a>
    </div>
  </div>
</template>

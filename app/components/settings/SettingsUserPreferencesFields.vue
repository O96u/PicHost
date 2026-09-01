<script setup lang="ts">
const {
  compressEnabled,
  autoCopyMarkdown,
  copyFormat,
  clientWebpQuality,
  loadPreferences
} = useUploadPreferences()

const { t } = useI18n()

const {
  userSettings,
  enabled: userAutoDeleteEnabled,
  daysDraft: userAutoDeleteDaysDraft,
  load: loadUserSettings
} = useUserAutoDeleteSettings()

const copyFormatItems = computed(() => [
  { label: t('copy.url'), value: 'url' as const },
  { label: t('copy.markdown'), value: 'markdown' as const },
  { label: t('copy.html'), value: 'html' as const }
])

const clientQualityLevel = computed(() => {
  if (clientWebpQuality.value >= 85) return t('preferences.qualityHigh')
  if (clientWebpQuality.value >= 60) return t('preferences.qualityMedium')
  return t('preferences.qualityLow')
})

function setCopyFormat(value: 'url' | 'markdown' | 'html') {
  copyFormat.value = value
}

function onClientQualityInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  clientWebpQuality.value = Number.isFinite(value) ? value : 80
}

onMounted(() => {
  loadPreferences()
  void loadUserSettings()
})
</script>

<template>
  <SettingsSection :title="t('preferences.processing')">
    <SettingsGroup>
      <SettingsToggleRow
        v-model="compressEnabled"
        :title="t('preferences.clientCompress')"
        :hint="t('preferences.clientCompressHint')"
      />
      <div
        v-if="userSettings"
        class="flex items-start justify-between gap-4 px-4 py-4 sm:px-5"
      >
        <div class="min-w-0 flex-1 pr-2">
          <p class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-medium text-highlighted">
            <span>{{ t('preferences.autoDeletePrefix') }}</span>
            <UInput
              v-model.number="userAutoDeleteDaysDraft"
              type="number"
              min="1"
              max="3650"
              size="xs"
              class="w-14 tabular-nums"
              :class="userAutoDeleteEnabled ? '' : 'pointer-events-none opacity-40'"
            />
            <span>{{ t('preferences.autoDeleteSuffix') }}</span>
          </p>
          <p class="mt-1 text-xs leading-relaxed text-muted">
            {{ t('preferences.autoDeleteHint') }}
          </p>
        </div>
        <USwitch
          v-model="userAutoDeleteEnabled"
          class="mt-0.5 shrink-0"
        />
      </div>
      <div
        v-else
        class="flex justify-center py-4"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-5 animate-spin text-muted"
        />
      </div>
      <div class="px-4 py-4 sm:px-5">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-highlighted">
              {{ t('preferences.webpQuality') }}
            </p>
            <p class="mt-1 text-xs leading-relaxed text-muted">
              {{ t('preferences.webpQualityHint') }}
            </p>
          </div>
          <div class="shrink-0 text-right text-xs text-muted">
            <p>{{ t('preferences.current', { n: clientWebpQuality }) }}</p>
            <p class="mt-0.5">
              {{ clientQualityLevel }}
            </p>
          </div>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          :value="clientWebpQuality"
          class="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          @input="onClientQualityInput"
        >
      </div>
    </SettingsGroup>
  </SettingsSection>

  <SettingsSection :title="t('settings.uploadConvenience')">
    <SettingsGroup>
      <SettingsToggleRow
        v-model="autoCopyMarkdown"
        :title="t('preferences.autoCopy')"
        :hint="t('preferences.autoCopyHint')"
      />
      <div class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p class="text-sm font-medium text-highlighted">
          {{ t('settings.defaultCopyFormat') }}
        </p>
        <div
          class="flex w-full max-w-xs gap-1 rounded-lg border border-default p-0.5 sm:w-auto"
          :class="autoCopyMarkdown ? '' : 'pointer-events-none opacity-40'"
        >
          <UButton
            v-for="item in copyFormatItems"
            :key="item.value"
            size="xs"
            class="flex-1 justify-center sm:min-w-[4.5rem]"
            :variant="copyFormat === item.value ? 'solid' : 'ghost'"
            :color="copyFormat === item.value ? 'primary' : 'neutral'"
            :label="item.label"
            @click="setCopyFormat(item.value)"
          />
        </div>
      </div>
    </SettingsGroup>
  </SettingsSection>
</template>

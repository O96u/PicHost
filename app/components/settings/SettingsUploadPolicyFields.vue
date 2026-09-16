<script setup lang="ts">
type PolicySource = 'env' | 'db' | 'default'
type MimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'image/svg+xml' | 'image/x-icon'

defineProps<{
  part: 'upload-preference' | 'image-processing' | 'login-rate'
  uploadMaxFileSizeMbSource?: PolicySource
  allowedMimeTypesSource?: PolicySource
  uploadRateIpMaxSource?: PolicySource
  uploadRateTokenMaxSource?: PolicySource
  uploadRateWindowMinutesSource?: PolicySource
  loginRateMaxSource?: PolicySource
  loginRateWindowMinutesSource?: PolicySource
  preserveOriginalUploadSource?: PolicySource
  mimeTypeOptions?: ReadonlyArray<{ mime: MimeType, label: string }>
}>()

const uploadMaxFileSizeMbDraft = defineModel<number>('uploadMaxFileSizeMb')
const allowedMimeTypesDraft = defineModel<MimeType[]>('allowedMimeTypes')
const uploadRateIpMaxDraft = defineModel<number>('uploadRateIpMax')
const uploadRateTokenMaxDraft = defineModel<number>('uploadRateTokenMax')
const uploadRateWindowMinutesDraft = defineModel<number>('uploadRateWindowMinutes')
const loginRateMaxDraft = defineModel<number>('loginRateMax')
const loginRateWindowMinutesDraft = defineModel<number>('loginRateWindowMinutes')
const preserveOriginalUploadDraft = defineModel<boolean>('preserveOriginalUpload')

const { t } = useI18n()

function sourceBadge(source: PolicySource) {
  switch (source) {
    case 'env':
      return { label: t('settings.badgeEnv'), color: 'warning' as const }
    case 'db':
      return { label: t('settings.badgeSaved'), color: 'success' as const }
    default:
      return { label: t('settings.badgeDefault'), color: 'neutral' as const }
  }
}

function toggleMime(mime: MimeType, checked: boolean) {
  if (!allowedMimeTypesDraft.value) return
  if (checked) {
    if (!allowedMimeTypesDraft.value.includes(mime)) {
      allowedMimeTypesDraft.value = [...allowedMimeTypesDraft.value, mime]
    }
    return
  }
  if (allowedMimeTypesDraft.value.length <= 1) return
  allowedMimeTypesDraft.value = allowedMimeTypesDraft.value.filter(item => item !== mime)
}

function isMimeChecked(mime: MimeType): boolean {
  return allowedMimeTypesDraft.value?.includes(mime) ?? false
}

function clampUploadMaxFileSizeMb(value: unknown): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return uploadMaxFileSizeMbDraft.value ?? 10
  return Math.min(100, Math.max(1, Math.round(num)))
}

function onUploadMaxFileSizeInput(event: Event) {
  uploadMaxFileSizeMbDraft.value = clampUploadMaxFileSizeMb(
    (event.target as HTMLInputElement).value
  )
}

function onUploadMaxFileSizeNumberInput(value: string | number) {
  uploadMaxFileSizeMbDraft.value = clampUploadMaxFileSizeMb(value)
}
</script>

<template>
  <template v-if="part === 'upload-preference'">
    <div class="py-4">
      <div class="flex flex-wrap items-center gap-2">
        <p class="text-sm font-medium text-highlighted">
          {{ t('settings.uploadMaxFileSize') }}
        </p>
        <UBadge
          v-if="uploadMaxFileSizeMbSource"
          :color="sourceBadge(uploadMaxFileSizeMbSource).color"
          variant="subtle"
          size="xs"
        >
          {{ sourceBadge(uploadMaxFileSizeMbSource).label }}
        </UBadge>
      </div>
      <p class="mt-1 text-xs leading-relaxed text-muted">
        {{ t('settings.uploadMaxFileSizeHint') }}
      </p>
      <div
        class="mt-3 flex items-center gap-3"
        :class="uploadMaxFileSizeMbSource === 'env' ? 'pointer-events-none opacity-60' : ''"
      >
        <input
          type="range"
          min="1"
          max="100"
          :value="uploadMaxFileSizeMbDraft"
          class="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          :disabled="uploadMaxFileSizeMbSource === 'env'"
          @input="onUploadMaxFileSizeInput"
        >
        <div class="flex shrink-0 items-center gap-1.5">
          <UInput
            :model-value="uploadMaxFileSizeMbDraft"
            type="number"
            :min="1"
            :max="100"
            size="xs"
            class="w-14 tabular-nums"
            :disabled="uploadMaxFileSizeMbSource === 'env'"
            @update:model-value="onUploadMaxFileSizeNumberInput"
          />
          <span class="text-xs text-muted">MB</span>
        </div>
      </div>
    </div>

    <div class="py-4">
      <div class="flex flex-wrap items-center gap-2">
        <p class="text-sm font-medium text-highlighted">
          {{ t('settings.allowedMimeTypes') }}
        </p>
        <UBadge
          v-if="allowedMimeTypesSource"
          :color="sourceBadge(allowedMimeTypesSource).color"
          variant="subtle"
          size="xs"
        >
          {{ sourceBadge(allowedMimeTypesSource).label }}
        </UBadge>
      </div>
      <p class="mt-1 text-xs leading-relaxed text-muted">
        {{ t('settings.allowedMimeTypesHint') }}
      </p>
      <div
        class="mt-3 flex flex-wrap gap-2"
        :class="allowedMimeTypesSource === 'env' ? 'pointer-events-none opacity-60' : ''"
      >
        <label
          v-for="option in mimeTypeOptions ?? []"
          :key="option.mime"
          class="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
          :class="isMimeChecked(option.mime)
            ? 'border-primary/40 bg-primary/5'
            : 'border-default bg-muted/20 hover:bg-muted/40'"
          :title="option.mime"
        >
          <UCheckbox
            :model-value="isMimeChecked(option.mime)"
            @update:model-value="(v) => toggleMime(option.mime, v === true)"
            @click.stop
          />
          <span class="font-medium text-highlighted">{{ option.label }}</span>
        </label>
      </div>
    </div>

    <div class="py-4">
      <p class="text-sm font-medium text-highlighted">
        {{ t('settings.uploadRateGroup') }}
      </p>
      <p class="mt-1 text-xs leading-relaxed text-muted">
        {{ t('settings.uploadRateFootnote') }}
      </p>
      <div class="mt-3 grid gap-4 sm:grid-cols-3">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-xs font-medium text-muted">
              {{ t('settings.uploadRateIpMax') }}
            </p>
            <UBadge
              v-if="uploadRateIpMaxSource"
              :color="sourceBadge(uploadRateIpMaxSource).color"
              variant="subtle"
              size="xs"
            >
              {{ sourceBadge(uploadRateIpMaxSource).label }}
            </UBadge>
          </div>
          <UInput
            v-model.number="uploadRateIpMaxDraft"
            type="number"
            :min="1"
            :max="1000"
            size="sm"
            class="mt-2 w-full tabular-nums"
            :disabled="uploadRateIpMaxSource === 'env'"
          />
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-xs font-medium text-muted">
              {{ t('settings.uploadRateTokenMax') }}
            </p>
            <UBadge
              v-if="uploadRateTokenMaxSource"
              :color="sourceBadge(uploadRateTokenMaxSource).color"
              variant="subtle"
              size="xs"
            >
              {{ sourceBadge(uploadRateTokenMaxSource).label }}
            </UBadge>
          </div>
          <UInput
            v-model.number="uploadRateTokenMaxDraft"
            type="number"
            :min="1"
            :max="5000"
            size="sm"
            class="mt-2 w-full tabular-nums"
            :disabled="uploadRateTokenMaxSource === 'env'"
          />
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-xs font-medium text-muted">
              {{ t('settings.uploadRateWindowMinutes') }}
            </p>
            <UBadge
              v-if="uploadRateWindowMinutesSource"
              :color="sourceBadge(uploadRateWindowMinutesSource).color"
              variant="subtle"
              size="xs"
            >
              {{ sourceBadge(uploadRateWindowMinutesSource).label }}
            </UBadge>
          </div>
          <div class="mt-2 flex items-center gap-2">
            <UInput
              v-model.number="uploadRateWindowMinutesDraft"
              type="number"
              :min="1"
              :max="1440"
              size="sm"
              class="w-full tabular-nums"
              :disabled="uploadRateWindowMinutesSource === 'env'"
            />
            <span class="shrink-0 text-xs text-muted">{{ t('settings.minutesUnit') }}</span>
          </div>
        </div>
      </div>
    </div>
  </template>

  <SettingsToggleRow
    v-else-if="part === 'image-processing'"
    v-model="preserveOriginalUploadDraft!"
    :disabled="preserveOriginalUploadSource === 'env'"
  >
    <template #title>
      <span class="inline-flex flex-wrap items-center gap-2">
        {{ t('settings.preserveOriginalUpload') }}
        <UBadge
          v-if="preserveOriginalUploadSource"
          :color="sourceBadge(preserveOriginalUploadSource).color"
          variant="subtle"
          size="xs"
        >
          {{ sourceBadge(preserveOriginalUploadSource).label }}
        </UBadge>
      </span>
    </template>
    <template #hint>
      {{ t('settings.preserveOriginalUploadHint') }}
    </template>
  </SettingsToggleRow>

  <template v-else-if="part === 'login-rate'">
    <div class="grid gap-4 py-4 sm:grid-cols-2">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <p class="text-sm font-medium text-highlighted">
            {{ t('settings.loginRateMax') }}
          </p>
          <UBadge
            v-if="loginRateMaxSource"
            :color="sourceBadge(loginRateMaxSource).color"
            variant="subtle"
            size="xs"
          >
            {{ sourceBadge(loginRateMaxSource).label }}
          </UBadge>
        </div>
        <UInput
          v-model.number="loginRateMaxDraft"
          type="number"
          :min="1"
          :max="100"
          size="sm"
          class="mt-2 w-full tabular-nums"
          :disabled="loginRateMaxSource === 'env'"
        />
      </div>
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <p class="text-sm font-medium text-highlighted">
            {{ t('settings.loginRateWindowMinutes') }}
          </p>
          <UBadge
            v-if="loginRateWindowMinutesSource"
            :color="sourceBadge(loginRateWindowMinutesSource).color"
            variant="subtle"
            size="xs"
          >
            {{ sourceBadge(loginRateWindowMinutesSource).label }}
          </UBadge>
        </div>
        <div class="mt-2 flex items-center gap-2">
          <UInput
            v-model.number="loginRateWindowMinutesDraft"
            type="number"
            :min="1"
            :max="1440"
            size="sm"
            class="w-full tabular-nums"
            :disabled="loginRateWindowMinutesSource === 'env'"
          />
          <span class="shrink-0 text-xs text-muted">{{ t('settings.minutesUnit') }}</span>
        </div>
      </div>
    </div>
    <p class="pb-4 text-xs leading-relaxed text-muted">
      {{ t('settings.loginRateFootnote') }}
    </p>
  </template>
</template>

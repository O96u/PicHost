<script setup lang="ts">
import type { StorageBackendItem } from '~/types/storage'

type CardAction = {
  key: string
  icon: string
  label: string
  shortLabel: string
  danger?: boolean
  disabled?: boolean
  onClick: () => void
}

const props = defineProps<{
  backend: StorageBackendItem
  envOverride?: boolean
  busy?: boolean
}>()

const emit = defineEmits<{
  setDefault: []
  edit: []
  test: []
  toggleEnabled: []
  delete: []
}>()

const { t } = useI18n()

const typeIcon = computed(() =>
  props.backend.type === 'local' ? 'i-lucide-hard-drive' : 'i-lucide-cloud'
)

const typeLabel = computed(() =>
  props.backend.type === 'local' ? t('storage.backendLocal') : t('storage.backendCloud')
)

const servingLabel = computed(() =>
  props.backend.servingMode === 'public'
    ? t('storage.servingPublic')
    : t('storage.servingProxy')
)

const bucketLine = computed(() => {
  if (props.backend.type !== 's3') return null
  return props.backend.config.bucket || t('storage.notConfigured')
})

const actionsDisabled = computed(() => props.envOverride || props.busy)

const actions = computed<CardAction[]>(() => {
  const isLocal = props.backend.type === 'local'
  const items: CardAction[] = []

  if (!props.backend.isDefault && props.backend.enabled) {
    items.push({
      key: 'default',
      icon: 'i-lucide-star',
      label: t('storage.setDefault'),
      shortLabel: isLocal ? t('storage.setDefault') : t('storage.actionSetDefault'),
      onClick: () => emit('setDefault')
    })
  }

  if (props.backend.type === 's3') {
    items.push({
      key: 'edit',
      icon: 'i-lucide-pencil',
      label: t('common.edit'),
      shortLabel: t('common.edit'),
      onClick: () => emit('edit')
    })
  }

  items.push({
    key: 'test',
    icon: 'i-lucide-plug-zap',
    label: t('storage.testConnection'),
    shortLabel: isLocal ? t('storage.testConnection') : t('storage.actionTest'),
    onClick: () => emit('test')
  })

  if (props.backend.type !== 'local') {
    items.push({
      key: 'toggle',
      icon: props.backend.enabled ? 'i-lucide-pause' : 'i-lucide-play',
      label: props.backend.enabled ? t('storage.disable') : t('storage.enable'),
      shortLabel: props.backend.enabled ? t('storage.disable') : t('storage.enable'),
      disabled: props.backend.isDefault && props.backend.enabled,
      onClick: () => emit('toggleEnabled')
    })
  }

  if (props.backend.type !== 'local' && !props.backend.isDefault) {
    items.push({
      key: 'delete',
      icon: 'i-lucide-trash-2',
      label: t('common.delete'),
      shortLabel: t('common.delete'),
      danger: true,
      onClick: () => emit('delete')
    })
  }

  return items
})

const actionGridClass = computed(() => {
  switch (actions.value.length) {
    case 1: return 'grid-cols-1'
    case 2: return 'grid-cols-2'
    case 3: return 'grid-cols-3'
    case 4: return 'grid-cols-4'
    default: return 'grid-cols-5'
  }
})
</script>

<template>
  <article
    class="flex h-full flex-col rounded-2xl border border-default bg-elevated p-4 shadow-sm"
    :class="{
      'ring-2 ring-primary/30': backend.isDefault,
      'opacity-75': !backend.enabled
    }"
  >
    <div class="mb-3 flex items-start justify-between gap-2">
      <div class="flex min-w-0 items-start gap-2.5">
        <div
          class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <UIcon
            :name="typeIcon"
            class="size-4.5"
          />
        </div>
        <div class="min-w-0">
          <h3 class="truncate text-sm font-semibold">
            {{ backend.name }}
          </h3>
          <p class="mt-0.5 text-xs text-muted">
            {{ typeLabel }}
            <template v-if="bucketLine">
              · {{ bucketLine }}
            </template>
          </p>
        </div>
      </div>
      <div class="flex shrink-0 flex-wrap justify-end gap-1">
        <UBadge
          v-if="backend.enabled"
          color="success"
          variant="subtle"
          size="xs"
        >
          {{ t('storage.badgeEnabled') }}
        </UBadge>
        <UBadge
          v-if="backend.isDefault"
          color="primary"
          variant="subtle"
          size="xs"
        >
          {{ t('storage.badgeDefault') }}
        </UBadge>
        <UBadge
          v-if="!backend.enabled"
          color="warning"
          variant="subtle"
          size="xs"
        >
          {{ t('storage.badgeDisabled') }}
        </UBadge>
      </div>
    </div>

    <StorageUsageBar
      :capacity="backend.capacity"
      :index-bytes="backend.usage.bytes"
    />

    <p class="mt-3 text-xs text-muted">
      {{ t('storage.servingMode') }}: {{ servingLabel }}
    </p>

    <div class="mt-4 border-t border-default pt-4">
      <div
        class="grid gap-1.5"
        :class="actionGridClass"
      >
        <button
          v-for="action in actions"
          :key="action.key"
          type="button"
          class="flex flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 transition disabled:cursor-not-allowed disabled:opacity-40"
          :class="action.danger
            ? 'border-error/30 text-error hover:bg-error/5'
            : 'border-default text-muted hover:bg-muted/40 hover:text-highlighted'"
          :title="action.label"
          :aria-label="action.label"
          :disabled="actionsDisabled || action.disabled"
          @click="action.onClick"
        >
          <UIcon
            :name="action.icon"
            class="size-4 shrink-0"
          />
          <span class="w-full truncate text-center text-[11px] leading-none">
            {{ action.shortLabel }}
          </span>
        </button>
      </div>
    </div>
  </article>
</template>

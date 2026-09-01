<script setup lang="ts">
import type { StorageCapacity } from '~/types/storage'

const props = defineProps<{
  capacity: StorageCapacity
  indexBytes: number
}>()

const { formatFileSize } = useFileSize()

const displayUsedBytes = computed(() =>
  props.capacity.source === 'disk' ? props.capacity.usedBytes : props.indexBytes
)

const hasBar = computed(() =>
  props.capacity.totalBytes != null && props.capacity.totalBytes > 0
)

const displayPercent = computed(() => props.capacity.percent ?? 0)

const overQuota = computed(() =>
  props.capacity.source === 'quota' && displayPercent.value > 100
)

const barWidth = computed(() => {
  if (!hasBar.value) return 0
  const percent = Math.min(displayPercent.value, 100)
  return Math.max(percent, displayUsedBytes.value > 0 ? 4 : 0)
})

function formatOptional(bytes: number | null): string {
  if (bytes == null) return '—'
  return formatFileSize(bytes)
}
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div>
        <p class="text-xs text-muted">
          {{ $t('storage.statUsed') }}
        </p>
        <p class="mt-1 text-sm font-semibold tabular-nums">
          {{ formatFileSize(displayUsedBytes) }}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted">
          {{ $t('storage.statTotal') }}
        </p>
        <p class="mt-1 text-sm font-semibold tabular-nums">
          {{ formatOptional(capacity.totalBytes) }}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted">
          {{ $t('storage.statFree') }}
        </p>
        <p
          class="mt-1 text-sm font-semibold tabular-nums"
          :class="overQuota ? 'text-error' : ''"
        >
          {{ formatOptional(capacity.freeBytes) }}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted">
          {{ $t('storage.usageRate') }}
        </p>
        <p class="mt-1 text-sm font-semibold tabular-nums">
          {{ hasBar ? `${displayPercent}%` : '—' }}
        </p>
      </div>
    </div>

    <div
      v-if="hasBar"
      class="h-1 overflow-hidden rounded-full bg-muted/50"
    >
      <div
        class="h-full rounded-full transition-all"
        :class="overQuota ? 'bg-error/80' : 'bg-primary'"
        :style="{ width: `${barWidth}%` }"
      />
    </div>
  </div>
</template>

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
    <div class="grid grid-cols-3 gap-2 text-center text-xs">
      <div class="rounded-lg bg-muted/30 px-2 py-2">
        <p class="text-muted">
          {{ $t('storage.statTotal') }}
        </p>
        <p class="mt-1 font-medium tabular-nums text-highlighted">
          {{ formatOptional(capacity.totalBytes) }}
        </p>
      </div>
      <div class="rounded-lg bg-muted/30 px-2 py-2">
        <p class="text-muted">
          {{ $t('storage.statUsed') }}
        </p>
        <p class="mt-1 font-medium tabular-nums text-highlighted">
          {{ formatFileSize(displayUsedBytes) }}
        </p>
      </div>
      <div class="rounded-lg bg-muted/30 px-2 py-2">
        <p class="text-muted">
          {{ $t('storage.statFree') }}
        </p>
        <p
          class="mt-1 font-medium tabular-nums"
          :class="overQuota ? 'text-error' : 'text-highlighted'"
        >
          {{ formatOptional(capacity.freeBytes) }}
        </p>
      </div>
    </div>

    <div
      v-if="hasBar"
      class="space-y-1"
    >
      <div class="flex items-center justify-between text-xs">
        <span class="text-muted">{{ $t('storage.usageRate') }}</span>
        <span
          class="tabular-nums font-medium"
          :class="overQuota ? 'text-error' : ''"
        >
          {{ displayPercent }}%
        </span>
      </div>
      <div class="h-1.5 overflow-hidden rounded-full bg-muted/50">
        <div
          class="h-full rounded-full transition-all"
          :class="overQuota ? 'bg-error/80' : 'bg-primary/70'"
          :style="{ width: `${barWidth}%` }"
        />
      </div>
    </div>
  </div>
</template>

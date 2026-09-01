<script setup lang="ts">
import type { StorageBackendItem } from '~/types/storage'

const props = defineProps<{
  backends: StorageBackendItem[]
  loading?: boolean
}>()

const { t } = useI18n()
const { formatFileSize } = useFileSize()

const CHART_COLORS = [
  'var(--ui-primary)',
  '#3b82f6',
  '#6366f1',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6'
] as const

function backendUsedBytes(backend: StorageBackendItem) {
  return backend.capacity.source === 'disk'
    ? backend.capacity.usedBytes
    : backend.usage.bytes
}

const totalCapacityBytes = computed(() => {
  let total = 0
  let hasTotal = false
  for (const backend of props.backends) {
    if (backend.capacity.totalBytes != null && backend.capacity.totalBytes > 0) {
      total += backend.capacity.totalBytes
      hasTotal = true
    }
  }
  return hasTotal ? total : null
})

const totalUsedBytes = computed(() =>
  props.backends.reduce((sum, backend) => sum + backendUsedBytes(backend), 0)
)

const totalFreeBytes = computed(() => {
  if (!totalCapacityBytes.value) return null
  return Math.max(0, totalCapacityBytes.value - totalUsedBytes.value)
})

const usagePercent = computed(() => {
  if (!totalCapacityBytes.value) return null
  return Math.min(Math.round((totalUsedBytes.value / totalCapacityBytes.value) * 1000) / 10, 100)
})

const usageBarWidth = computed(() => {
  if (usagePercent.value == null) return 0
  return Math.max(usagePercent.value, totalUsedBytes.value > 0 ? 4 : 0)
})

const distributionItems = computed(() => {
  if (!totalCapacityBytes.value) return []

  return props.backends
    .filter(backend => backend.capacity.totalBytes != null && backend.capacity.totalBytes > 0)
    .map((backend, index) => ({
      id: backend.id,
      name: backend.name,
      color: CHART_COLORS[index % CHART_COLORS.length]!,
      percent: Math.round((backend.capacity.totalBytes! / totalCapacityBytes.value!) * 1000) / 10
    }))
})

const donutStyle = computed(() => {
  const items = distributionItems.value
  if (!items.length) return { background: 'var(--ui-bg-muted)' }

  let cursor = 0
  const segments = items.map((item) => {
    const start = cursor
    cursor += item.percent
    return `${item.color} ${start}% ${cursor}%`
  })

  return { background: `conic-gradient(${segments.join(', ')})` }
})

function displaySize(bytes: number | null) {
  if (props.loading) return '—'
  if (bytes == null) return '—'
  return formatFileSize(bytes)
}
</script>

<template>
  <section class="rounded-xl border border-default bg-elevated p-4 sm:p-5">
    <h2 class="text-sm font-semibold">
      {{ t('storage.overviewTitle') }}
    </h2>
    <p class="mt-0.5 text-xs text-muted">
      {{ t('storage.overviewSubtitle') }}
    </p>

    <div class="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p class="text-xs text-muted">
              {{ t('storage.overviewTotal') }}
            </p>
            <p class="mt-1 text-lg font-semibold tabular-nums">
              {{ displaySize(totalCapacityBytes) }}
            </p>
            <div
              v-if="totalCapacityBytes"
              class="mt-2 h-1 overflow-hidden rounded-full bg-muted/50"
            >
              <div
                class="h-full rounded-full bg-primary transition-all"
                :style="{ width: `${usageBarWidth}%` }"
              />
            </div>
          </div>
          <div>
            <p class="text-xs text-muted">
              {{ t('storage.overviewUsed') }}
            </p>
            <p class="mt-1 text-lg font-semibold tabular-nums">
              {{ displaySize(totalUsedBytes) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">
              {{ t('storage.overviewFree') }}
            </p>
            <p class="mt-1 text-lg font-semibold tabular-nums">
              {{ displaySize(totalFreeBytes) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">
              {{ t('storage.overviewUsageRate') }}
            </p>
            <p class="mt-1 text-lg font-semibold tabular-nums">
              {{ usagePercent != null ? `${usagePercent}%` : '—' }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <div
          class="relative size-24 shrink-0 rounded-full p-2"
          :style="donutStyle"
        >
          <div class="flex size-full items-center justify-center rounded-full bg-elevated px-2 text-center">
            <p class="text-[10px] leading-tight text-muted">
              {{ t('storage.capacityDistribution') }}
            </p>
          </div>
        </div>

        <ul
          v-if="distributionItems.length"
          class="min-w-[8rem] space-y-2"
        >
          <li
            v-for="item in distributionItems"
            :key="item.id"
            class="flex items-center justify-between gap-3 text-xs"
          >
            <span class="flex min-w-0 items-center gap-1.5">
              <span
                class="size-2 shrink-0 rounded-full"
                :style="{ background: item.color }"
              />
              <span class="truncate">{{ item.name }}</span>
            </span>
            <span class="shrink-0 tabular-nums text-muted">
              {{ item.percent }}%
            </span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

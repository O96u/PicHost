<script setup lang="ts">
export interface GalleryStatsData {
  uploadToday: number
  uploadYesterday: number
  uploadMonth: number
  uploadLastMonth: number
  uploadTotal: number
  storedCount: number
  uploadBytesTotal: number
  bySource: {
    web: number
    api: number
  }
  storageUsage: {
    usedBytes: number
    totalBytes: number | null
    percent: number | null
  }
}

const props = defineProps<{
  stats: GalleryStatsData | null
  loading?: boolean
}>()

const { t } = useI18n()
const { formatFileSize } = useFileSize()

const SOURCE_COLORS = ['var(--ui-primary)', '#10b981'] as const

const sourceItems = computed(() => {
  const bySource = props.stats?.bySource
  if (!bySource) return []
  return [
    { key: 'web', label: t('stats.sourceWeb'), count: bySource.web, color: SOURCE_COLORS[0] },
    { key: 'api', label: t('stats.sourceApi'), count: bySource.api, color: SOURCE_COLORS[1] }
  ]
})

const sourceTotal = computed(() =>
  sourceItems.value.reduce((sum, item) => sum + item.count, 0)
)

function sourcePercent(count: number) {
  if (!sourceTotal.value) return 0
  return Math.round((count / sourceTotal.value) * 100)
}

function formatTrend(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) {
      return { text: t('stats.trendFlat'), tone: 'muted' as const }
    }
    return { text: t('stats.trendUp', { p: 100 }), tone: 'up' as const }
  }
  const change = Math.round(((current - previous) / previous) * 100)
  if (change > 0) {
    return { text: t('stats.trendUp', { p: change }), tone: 'up' as const }
  }
  if (change < 0) {
    return { text: t('stats.trendDown', { p: Math.abs(change) }), tone: 'down' as const }
  }
  return { text: t('stats.trendFlat'), tone: 'muted' as const }
}

const todayTrend = computed(() =>
  formatTrend(props.stats?.uploadToday ?? 0, props.stats?.uploadYesterday ?? 0)
)

const monthTrend = computed(() =>
  formatTrend(props.stats?.uploadMonth ?? 0, props.stats?.uploadLastMonth ?? 0)
)

const usageLabel = computed(() => {
  const usage = props.stats?.storageUsage
  if (!usage) return '—'
  const used = formatFileSize(usage.usedBytes)
  if (usage.totalBytes) {
    return `${used} / ${formatFileSize(usage.totalBytes)}`
  }
  return used
})

const usagePercent = computed(() => {
  const percent = props.stats?.storageUsage.percent
  if (percent == null) return null
  return Math.min(percent, 100)
})

const usageBarWidth = computed(() => {
  const usage = props.stats?.storageUsage
  if (!usage?.totalBytes || usagePercent.value == null) return 0
  return Math.max(usagePercent.value, usage.usedBytes > 0 ? 4 : 0)
})

function displayValue(value: number | undefined) {
  if (props.loading) return '—'
  return value ?? '—'
}
</script>

<template>
  <section class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
    <div class="rounded-xl border border-default bg-elevated p-4">
      <p class="text-xs text-muted">
        {{ t('stats.uploadToday') }}
      </p>
      <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
        {{ displayValue(stats?.uploadToday) }}
      </p>
      <p
        class="mt-2 text-xs"
        :class="{
          'text-primary': todayTrend.tone === 'up',
          'text-muted': todayTrend.tone === 'muted',
          'text-orange-600 dark:text-orange-400': todayTrend.tone === 'down'
        }"
      >
        {{ t('stats.vsYesterday') }} {{ todayTrend.text }}
      </p>
    </div>

    <div class="rounded-xl border border-default bg-elevated p-4">
      <p class="text-xs text-muted">
        {{ t('stats.uploadMonth') }}
      </p>
      <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
        {{ displayValue(stats?.uploadMonth) }}
      </p>
      <p
        class="mt-2 text-xs"
        :class="{
          'text-primary': monthTrend.tone === 'up',
          'text-muted': monthTrend.tone === 'muted',
          'text-orange-600 dark:text-orange-400': monthTrend.tone === 'down'
        }"
      >
        {{ t('stats.vsLastMonth') }} {{ monthTrend.text }}
      </p>
    </div>

    <div class="rounded-xl border border-default bg-elevated p-4">
      <p class="text-xs text-muted">
        {{ t('stats.uploadTotal') }}
      </p>
      <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
        {{ displayValue(stats?.uploadTotal) }}
      </p>
      <p class="mt-2 text-xs text-muted">
        {{ t('stats.totalFiles') }}
      </p>
    </div>

    <div class="rounded-xl border border-default bg-elevated p-4">
      <p class="text-xs text-muted">
        {{ t('stats.storedCount') }}
      </p>
      <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
        {{ displayValue(stats?.storedCount) }}
      </p>
      <p class="mt-2 text-xs text-muted">
        {{ stats ? t('stats.totalOccupied', { size: formatFileSize(stats.uploadBytesTotal) }) : '—' }}
      </p>
    </div>

    <div class="rounded-xl border border-default bg-elevated p-4">
      <p class="text-xs text-muted">
        {{ t('stats.storageUsage') }}
      </p>
      <p class="mt-2 text-sm font-semibold tabular-nums text-highlighted sm:text-base">
        {{ usageLabel }}
      </p>
      <div
        v-if="stats?.storageUsage.totalBytes"
        class="mt-3 space-y-1"
      >
        <div class="h-1.5 overflow-hidden rounded-full bg-muted/50">
          <div
            class="h-full rounded-full bg-primary transition-all"
            :style="{ width: `${usageBarWidth}%` }"
          />
        </div>
        <p class="text-right text-xs tabular-nums text-muted">
          {{ usagePercent }}%
        </p>
      </div>
      <p
        v-else
        class="mt-2 text-xs text-muted"
      >
        {{ t('stats.noQuota') }}
      </p>
    </div>

    <div class="col-span-2 rounded-xl border border-default bg-elevated p-4 sm:col-span-1">
      <p class="text-xs text-muted">
        {{ t('stats.sourceDistribution') }}
      </p>
      <div
        v-if="!sourceTotal"
        class="mt-4 text-xs text-muted"
      >
        {{ t('stats.noData') }}
      </div>
      <ul
        v-else
        class="mt-3 space-y-3"
      >
        <li
          v-for="item in sourceItems"
          :key="item.key"
        >
          <div class="flex items-center justify-between gap-2 text-xs">
            <span class="flex min-w-0 items-center gap-1.5">
              <span
                class="size-2 shrink-0 rounded-full"
                :style="{ background: item.color }"
              />
              <span class="truncate">{{ item.label }}</span>
            </span>
            <span class="shrink-0 tabular-nums text-muted">
              {{ item.count }} ({{ sourcePercent(item.count) }}%)
            </span>
          </div>
          <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/40">
            <div
              class="h-full rounded-full transition-[width]"
              :style="{
                width: `${sourcePercent(item.count)}%`,
                backgroundColor: item.color
              }"
            />
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

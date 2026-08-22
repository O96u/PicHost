<script setup lang="ts">
export interface DonutSegment {
  label: string
  value: number
  color: string
}

const props = defineProps<{
  segments: DonutSegment[]
  size?: number
}>()

const total = computed(() =>
  props.segments.reduce((sum, item) => sum + item.value, 0)
)

const gradient = computed(() => {
  if (!total.value) {
    return 'conic-gradient(var(--ui-bg-muted) 0% 100%)'
  }

  let offset = 0
  const stops = props.segments
    .filter(item => item.value > 0)
    .map((item) => {
      const start = offset
      const percent = (item.value / total.value) * 100
      offset += percent
      return `${item.color} ${start}% ${offset}%`
    })

  if (!stops.length) {
    return 'conic-gradient(var(--ui-bg-muted) 0% 100%)'
  }

  return `conic-gradient(${stops.join(', ')})`
})

function percent(value: number) {
  if (!total.value) return 0
  return Math.round((value / total.value) * 100)
}

function formatCount(value: number) {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(value >= 1000000000 ? 0 : 1)}亿`
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`
  }
  return String(value)
}

const centerText = computed(() => formatCount(total.value))

const centerTextClass = computed(() => {
  const raw = String(total.value)
  if (raw.length >= 7) return 'text-[9px] font-semibold leading-none'
  if (raw.length >= 5) return 'text-xs font-semibold leading-none'
  if (raw.length >= 4) return 'text-sm font-semibold leading-none'
  return 'text-lg font-semibold leading-none'
})
</script>

<template>
  <div class="flex items-center gap-4">
    <div
      class="relative shrink-0 rounded-full"
      :style="{
        width: `${size ?? 88}px`,
        height: `${size ?? 88}px`,
        background: gradient
      }"
    >
      <div
        class="absolute inset-[20%] flex flex-col items-center justify-center rounded-full bg-elevated px-1 text-center"
      >
        <p
          class="max-w-full truncate tabular-nums"
          :class="centerTextClass"
          :title="String(total)"
        >
          {{ centerText }}
        </p>
        <p class="mt-0.5 text-[10px] text-muted">
          次
        </p>
      </div>
    </div>

    <ul class="min-w-0 flex-1 space-y-1.5">
      <li
        v-for="item in segments"
        :key="item.label"
        class="flex items-center gap-2 text-xs"
      >
        <span
          class="size-2 shrink-0 rounded-full"
          :style="{ background: item.color }"
        />
        <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
        <span
          class="shrink-0 tabular-nums text-muted"
          :title="`${item.value}`"
        >
          {{ formatCount(item.value) }} ({{ percent(item.value) }}%)
        </span>
      </li>
    </ul>
  </div>
</template>

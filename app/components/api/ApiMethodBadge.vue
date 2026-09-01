<script setup lang="ts">
import type { ApiDocMethod } from '~/composables/useApiDocs'

const props = defineProps<{
  method: ApiDocMethod
  size?: 'xs' | 'sm'
}>()

const colorClass = computed(() => {
  switch (props.method) {
    case 'GET':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
    case 'POST':
      return 'bg-primary/15 text-primary'
    case 'DELETE':
      return 'bg-red-500/15 text-red-700 dark:text-red-300'
    default:
      return 'bg-muted text-muted'
  }
})

const sizeClass = computed(() =>
  props.size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-[10px]'
)
</script>

<template>
  <span
    class="inline-flex shrink-0 rounded font-mono font-semibold leading-none"
    :class="[colorClass, sizeClass]"
  >
    {{ method }}
  </span>
</template>

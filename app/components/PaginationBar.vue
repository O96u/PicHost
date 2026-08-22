<script setup lang="ts">
const props = defineProps<{
  page: number
  totalPages: number
  total: number
  unit?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:page': [page: number]
}>()

const unitLabel = computed(() => props.unit ?? '条')

function goTo(target: number) {
  if (target < 1 || target > props.totalPages || target === props.page || props.loading) {
    return
  }
  emit('update:page', target)
}
</script>

<template>
  <div
    v-if="total > 0"
    class="flex flex-col items-center gap-2 border-t border-default pt-4 sm:flex-row sm:justify-between"
  >
    <p
      v-if="totalPages > 1"
      class="text-sm text-muted"
    >
      第 {{ page }} / {{ totalPages }} 页 · 共 {{ total }} {{ unitLabel }}
    </p>
    <p
      v-else
      class="text-sm text-muted"
    >
      共 {{ total }} {{ unitLabel }}
    </p>

    <div
      v-if="totalPages > 1"
      class="flex items-center gap-1"
    >
      <UButton
        icon="i-lucide-chevrons-left"
        variant="outline"
        size="sm"
        aria-label="第一页"
        :disabled="page <= 1 || loading"
        @click="goTo(1)"
      />
      <UButton
        icon="i-lucide-chevron-left"
        variant="outline"
        size="sm"
        aria-label="上一页"
        :disabled="page <= 1 || loading"
        @click="goTo(page - 1)"
      />
      <UButton
        icon="i-lucide-chevron-right"
        variant="outline"
        size="sm"
        aria-label="下一页"
        :disabled="page >= totalPages || loading"
        @click="goTo(page + 1)"
      />
      <UButton
        icon="i-lucide-chevrons-right"
        variant="outline"
        size="sm"
        aria-label="最后一页"
        :disabled="page >= totalPages || loading"
        @click="goTo(totalPages)"
      />
    </div>
  </div>
</template>

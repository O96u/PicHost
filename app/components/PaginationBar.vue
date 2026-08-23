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

const { t } = useI18n()

const unitLabel = computed(() => props.unit ?? t('common.itemsUnit'))

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
      {{ t('pagination.pageOf', { page, totalPages, total, unit: unitLabel }) }}
    </p>
    <p
      v-else
      class="text-sm text-muted"
    >
      {{ t('pagination.totalOnly', { total, unit: unitLabel }) }}
    </p>

    <div
      v-if="totalPages > 1"
      class="flex items-center gap-1"
    >
      <UButton
        icon="i-lucide-chevrons-left"
        variant="outline"
        size="sm"
        :aria-label="t('pagination.first')"
        :disabled="page <= 1 || loading"
        @click="goTo(1)"
      />
      <UButton
        icon="i-lucide-chevron-left"
        variant="outline"
        size="sm"
        :aria-label="t('pagination.prev')"
        :disabled="page <= 1 || loading"
        @click="goTo(page - 1)"
      />
      <UButton
        icon="i-lucide-chevron-right"
        variant="outline"
        size="sm"
        :aria-label="t('pagination.next')"
        :disabled="page >= totalPages || loading"
        @click="goTo(page + 1)"
      />
      <UButton
        icon="i-lucide-chevrons-right"
        variant="outline"
        size="sm"
        :aria-label="t('pagination.last')"
        :disabled="page >= totalPages || loading"
        @click="goTo(totalPages)"
      />
    </div>
  </div>
</template>

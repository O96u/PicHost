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
const jumpInput = ref('')

function goTo(target: number) {
  if (target < 1 || target > props.totalPages || props.loading) {
    return
  }
  if (target === props.page) {
    jumpInput.value = ''
    return
  }
  emit('update:page', target)
}

function submitJump() {
  const raw = String(jumpInput.value ?? '').trim()
  if (!raw) return
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) return
  goTo(parsed)
}

watch(() => props.page, () => {
  jumpInput.value = ''
})
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
      class="flex flex-wrap items-center justify-center gap-1"
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
      <form
        class="ml-1 flex items-center gap-1"
        @submit.prevent="submitJump"
      >
        <UInput
          v-model="jumpInput"
          type="number"
          :min="1"
          :max="totalPages"
          size="sm"
          class="w-16"
          :placeholder="t('pagination.pagePlaceholder')"
          :disabled="loading"
          :aria-label="t('pagination.pagePlaceholder')"
          @keyup.enter="submitJump"
        />
        <UButton
          type="button"
          size="sm"
          variant="outline"
          :label="t('pagination.goTo')"
          :disabled="loading || !String(jumpInput ?? '').trim()"
          @click="submitJump"
        />
      </form>
    </div>
  </div>
</template>

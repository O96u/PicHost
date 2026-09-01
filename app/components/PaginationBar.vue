<script setup lang="ts">
type PageItem = number | 'ellipsis'

const props = withDefaults(defineProps<{
  page: number
  totalPages: number
  total: number
  unit?: string
  loading?: boolean
  pageSize?: number
  pageSizeOptions?: number[]
}>(), {
  loading: false,
  pageSizeOptions: () => [10, 20, 30, 50]
})

const emit = defineEmits<{
  'update:page': [page: number]
  'update:pageSize': [pageSize: number]
}>()

const { t } = useI18n()

const unitLabel = computed(() => props.unit ?? t('common.itemsUnit'))
const jumpPageInput = ref('')

const showMobilePageNumbers = computed(() => props.totalPages <= 5)

const visiblePages = computed<PageItem[]>(() => {
  const total = Math.max(1, props.totalPages)
  const current = Math.min(Math.max(1, props.page), total)

  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, total])
  for (let page = current - 1; page <= current + 1; page++) {
    if (page >= 1 && page <= total) pages.add(page)
  }

  const sorted = [...pages].sort((a, b) => a - b)
  const items: PageItem[] = []

  for (let index = 0; index < sorted.length; index++) {
    const page = sorted[index]!
    const prev = sorted[index - 1]
    if (prev !== undefined && page - prev > 1) {
      items.push('ellipsis')
    }
    items.push(page)
  }

  return items
})

const pageSizeItems = computed(() =>
  props.pageSizeOptions.map(size => ({
    label: t('pagination.perPage', { size }),
    value: size
  }))
)

watch(
  () => props.page,
  (page) => {
    jumpPageInput.value = String(page)
  },
  { immediate: true }
)

function goTo(target: number) {
  if (target < 1 || target > props.totalPages || props.loading) return
  if (target === props.page) return
  emit('update:page', target)
}

function onPageSizeChange(value: unknown) {
  const size = Number(value)
  if (!Number.isFinite(size) || size <= 0 || size === props.pageSize) return
  emit('update:pageSize', size)
}

function jumpToPage() {
  const target = Number.parseInt(jumpPageInput.value, 10)
  if (!Number.isFinite(target)) return
  goTo(target)
}

function pageButtonClass(target: number) {
  return target === props.page
    ? 'border-primary bg-primary/10 text-primary font-medium'
    : 'border-default bg-elevated text-default hover:bg-muted'
}

const navButtonClass = 'inline-flex items-center justify-center rounded-md border border-default bg-elevated text-default transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40'
</script>

<template>
  <div
    v-if="total > 0"
    class="border-t border-default pt-4"
  >
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between gap-2 sm:hidden">
        <p class="text-sm text-muted">
          {{ t('pagination.totalCount', { total, unit: unitLabel }) }}
        </p>
        <USelect
          v-if="pageSize !== undefined"
          :model-value="pageSize"
          :items="pageSizeItems"
          value-key="value"
          size="sm"
          class="w-[6.5rem] shrink-0"
          :aria-label="t('pagination.pageSize')"
          :disabled="loading"
          @update:model-value="onPageSizeChange"
        />
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="hidden text-sm text-muted sm:block">
          {{ t('pagination.totalCount', { total, unit: unitLabel }) }}
        </p>

        <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
        <USelect
          v-if="pageSize !== undefined"
          :model-value="pageSize"
          :items="pageSizeItems"
          value-key="value"
          size="sm"
          class="hidden w-[7.5rem] shrink-0 sm:block"
          :aria-label="t('pagination.pageSize')"
          :disabled="loading"
          @update:model-value="onPageSizeChange"
        />

        <div class="flex items-center justify-center gap-1 sm:justify-end">
          <button
            type="button"
            :class="[navButtonClass, 'hidden size-8 sm:inline-flex']"
            :aria-label="t('pagination.first')"
            :disabled="page <= 1 || loading"
            @click="goTo(1)"
          >
            <UIcon
              name="i-lucide-chevrons-left"
              class="size-4"
            />
          </button>
          <button
            type="button"
            :class="[navButtonClass, 'size-9 sm:size-8']"
            :aria-label="t('pagination.prev')"
            :disabled="page <= 1 || loading"
            @click="goTo(page - 1)"
          >
            <UIcon
              name="i-lucide-chevron-left"
              class="size-4"
            />
          </button>

          <p
            v-if="!showMobilePageNumbers"
            class="min-w-[5.5rem] px-1 text-center text-sm text-muted sm:hidden"
          >
            {{ t('pagination.pageStatus', { page, totalPages }) }}
          </p>

          <template
            v-for="(target, index) in visiblePages"
            :key="`${target}-${index}`"
          >
            <span
              v-if="target === 'ellipsis'"
              class="inline-flex size-9 items-center justify-center text-sm text-muted sm:size-8"
              :class="showMobilePageNumbers ? '' : 'hidden sm:inline-flex'"
              aria-hidden="true"
            >
              …
            </span>
            <button
              v-else
              type="button"
              class="inline-flex items-center justify-center rounded-md border text-sm transition-colors disabled:pointer-events-none disabled:opacity-40"
              :class="[
                pageButtonClass(target),
                showMobilePageNumbers ? 'size-9 sm:size-8' : 'hidden size-8 sm:inline-flex'
              ]"
              :aria-label="t('pagination.pageNumber', { page: target })"
              :aria-current="target === page ? 'page' : undefined"
              :disabled="loading"
              @click="goTo(target)"
            >
              {{ target }}
            </button>
          </template>

          <button
            type="button"
            :class="[navButtonClass, 'size-9 sm:size-8']"
            :aria-label="t('pagination.next')"
            :disabled="page >= totalPages || loading"
            @click="goTo(page + 1)"
          >
            <UIcon
              name="i-lucide-chevron-right"
              class="size-4"
            />
          </button>
          <button
            type="button"
            :class="[navButtonClass, 'hidden size-8 sm:inline-flex']"
            :aria-label="t('pagination.last')"
            :disabled="page >= totalPages || loading"
            @click="goTo(totalPages)"
          >
            <UIcon
              name="i-lucide-chevrons-right"
              class="size-4"
            />
          </button>
        </div>

        <form
          class="hidden items-center gap-1.5 text-sm text-muted sm:flex"
          @submit.prevent="jumpToPage"
        >
          <span>{{ t('pagination.goToPrefix') }}</span>
          <UInput
            v-model="jumpPageInput"
            type="number"
            min="1"
            :max="totalPages"
            size="sm"
            class="w-14"
            :aria-label="t('pagination.pagePlaceholder')"
            :disabled="loading"
            @blur="jumpToPage"
          />
          <span v-if="t('pagination.goToSuffix')">{{ t('pagination.goToSuffix') }}</span>
        </form>
        </div>
      </div>
    </div>
  </div>
</template>

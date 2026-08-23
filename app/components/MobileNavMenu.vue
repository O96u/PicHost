<script setup lang="ts">
defineProps<{
  items: Array<{ label: string, to: string, icon: string }>
}>()

const open = defineModel<boolean>('open', { default: false })

const route = useRoute()
const { t } = useI18n()
const menuRef = ref<HTMLElement | null>(null)

function isActive(to: string) {
  return route.path.startsWith(to)
}

function onDocumentClick(event: MouseEvent) {
  if (!open.value || !menuRef.value) return
  const target = event.target
  if (target instanceof Node && !menuRef.value.contains(target)) {
    open.value = false
  }
}

watch(() => route.path, () => {
  open.value = false
})

watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('click', onDocumentClick, true)
  } else {
    document.removeEventListener('click', onDocumentClick, true)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick, true)
})
</script>

<template>
  <div
    ref="menuRef"
    class="relative sm:hidden"
  >
    <UButton
      variant="outline"
      color="neutral"
      size="sm"
      icon="i-lucide-menu"
      :aria-label="t('nav.menu')"
      :aria-expanded="open"
      @click.stop="open = !open"
    />

    <div
      v-show="open"
      class="absolute top-full right-0 z-50 mt-2 w-52 rounded-xl border border-default bg-default p-1.5 shadow-lg"
      @click.stop
    >
      <nav class="space-y-0.5">
        <NuxtLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
          :class="isActive(item.to)
            ? 'bg-primary/10 text-primary'
            : 'text-highlighted hover:bg-elevated'"
          @click="open = false"
        >
          <UIcon
            :name="item.icon"
            class="size-4 shrink-0 opacity-70"
          />
          {{ item.label }}
        </NuxtLink>
      </nav>
    </div>
  </div>
</template>

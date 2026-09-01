<script setup lang="ts">
import type { SettingsTab } from '~/types/settings'

defineProps<{
  modelValue: SettingsTab
  items: Array<{ id: SettingsTab, label: string, icon: string }>
  title: string
  subtitle: string
}>()

const emit = defineEmits<{
  'update:modelValue': [SettingsTab]
}>()
</script>

<template>
  <aside class="flex w-full shrink-0 flex-col border-b border-default bg-neutral-50 dark:bg-neutral-900/30 lg:w-56 lg:border-b-0 lg:border-r xl:w-60">
    <div class="border-b border-default px-4 py-5 sm:px-5">
      <h1 class="text-lg font-semibold tracking-tight text-highlighted">
        {{ title }}
      </h1>
      <p class="mt-1 text-xs leading-relaxed text-muted">
        {{ subtitle }}
      </p>
    </div>

    <nav class="flex-1 space-y-0.5 p-3">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
        :class="modelValue === item.id
          ? 'bg-primary/10 font-medium text-primary'
          : 'text-muted hover:bg-muted/50 hover:text-highlighted'"
        @click="emit('update:modelValue', item.id)"
      >
        <UIcon
          :name="item.icon"
          class="size-4 shrink-0"
          :class="modelValue === item.id ? 'text-primary' : 'opacity-70'"
        />
        <span>{{ item.label }}</span>
      </button>
    </nav>
  </aside>
</template>

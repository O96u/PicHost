<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    code: string
    scrollable?: boolean
  }>(),
  {
    scrollable: true
  }
)

const toast = useToast()
const { t } = useI18n()

async function copyCode() {
  try {
    await navigator.clipboard.writeText(props.code)
    toast.add({ title: t('copy.curl'), color: 'success' })
  } catch {
    toast.add({ title: t('copy.failed'), color: 'error' })
  }
}
</script>

<template>
  <div class="overflow-hidden rounded-xl bg-neutral-950">
    <div
      class="flex items-center justify-between border-b border-neutral-800/80 bg-neutral-900 px-3.5 py-2.5"
    >
      <div
        class="flex items-center gap-2"
        aria-hidden="true"
      >
        <span class="size-3 rounded-full border border-black/15 bg-[#ff5f56]" />
        <span class="size-3 rounded-full border border-black/15 bg-[#ffbd2e]" />
        <span class="size-3 rounded-full border border-black/15 bg-[#27c93f]" />
      </div>
      <UButton
        icon="i-lucide-copy"
        :label="t('common.copy')"
        size="xs"
        variant="ghost"
        color="neutral"
        class="text-neutral-300 hover:text-white"
        @click="copyCode"
      />
    </div>
    <pre
      class="overflow-auto p-4 text-xs leading-relaxed text-neutral-100"
      :class="props.scrollable ? 'max-h-80' : ''"
    ><code class="font-mono">{{ props.code }}</code></pre>
  </div>
</template>

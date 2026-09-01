<script setup lang="ts">
const { t } = useI18n()

const items = computed(() => [
  {
    icon: 'i-lucide-hard-drive',
    iconClass: 'text-primary',
    boxClass: 'border-primary/20 bg-primary/5',
    title: t('storage.backendLocal'),
    desc: t('storage.supportedLocalDesc')
  },
  {
    icon: 'i-lucide-cloud',
    iconClass: 'text-orange-500',
    boxClass: 'border-orange-500/20 bg-orange-500/5',
    title: 'Cloudflare R2',
    desc: t('storage.supportedR2Desc')
  },
  {
    icon: 'i-lucide-server',
    iconClass: 'text-blue-500',
    boxClass: 'border-blue-500/20 bg-blue-500/5',
    title: t('storage.supportedS3Title'),
    desc: t('storage.supportedS3Desc')
  }
])
</script>

<template>
  <section class="rounded-xl border border-default bg-elevated p-4 sm:p-5">
    <h2 class="text-sm font-semibold">
      {{ t('storage.supportedTitle') }}
    </h2>

    <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div
        v-for="item in items"
        :key="item.title"
        class="flex items-start gap-3 rounded-lg border border-default bg-muted/30 px-4 py-3"
      >
        <div
          class="flex size-10 shrink-0 items-center justify-center rounded-lg border"
          :class="item.boxClass"
        >
          <UIcon
            :name="item.icon"
            class="size-5"
            :class="item.iconClass"
          />
        </div>
        <div class="min-w-0 pt-0.5">
          <p class="text-sm font-semibold">
            {{ item.title }}
          </p>
          <p class="mt-0.5 text-xs leading-relaxed text-muted">
            {{ item.desc }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

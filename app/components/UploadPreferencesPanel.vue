<script setup lang="ts">
withDefaults(
  defineProps<{
    embedded?: boolean
  }>(),
  {
    embedded: false
  }
)

const emit = defineEmits<{
  back: []
}>()

const {
  compressEnabled,
  autoCopyMarkdown,
  copyFormat,
  clientWebpQuality,
  loadPreferences
} = useUploadPreferences()

const {
  userSettings,
  enabled: userAutoDeleteEnabled,
  daysDraft: userAutoDeleteDaysDraft,
  load: loadUserSettings
} = useUserAutoDeleteSettings()

const copyFormatItems = [
  { label: '直链', value: 'url' as const },
  { label: 'Markdown', value: 'markdown' as const },
  { label: 'HTML', value: 'html' as const }
]

const clientQualityLevel = computed(() => {
  if (clientWebpQuality.value >= 85) return '高质量'
  if (clientWebpQuality.value >= 60) return '中等质量'
  return '有损压缩'
})

function setCopyFormat(value: 'url' | 'markdown' | 'html') {
  copyFormat.value = value
}

function onClientQualityInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  clientWebpQuality.value = Number.isFinite(value) ? value : 80
}

onMounted(() => {
  loadPreferences()
  void loadUserSettings()
})
</script>

<template>
  <div
    class="flex flex-col overflow-hidden max-sm:overflow-visible"
    :class="
      embedded
        ? ''
        : 'upload-card-surface upload-card-surface--panel max-sm:min-h-0 sm:h-full'
    "
  >
    <div
      class="flex items-start justify-between gap-3 border-b border-default px-5 py-4 sm:px-6"
    >
      <div class="flex min-w-0 items-start gap-2">
        <UIcon
          name="i-lucide-settings-2"
          class="mt-0.5 size-5 shrink-0 text-primary"
        />
        <div class="min-w-0">
          <h2 class="text-base font-semibold">
            上传偏好
          </h2>
          <p class="mt-0.5 text-xs text-muted">
            浏览器本地与账号设置，仅影响您的上传体验
          </p>
        </div>
      </div>
      <UButton
        v-if="!embedded"
        label="返回"
        icon="i-lucide-arrow-left"
        variant="ghost"
        color="neutral"
        size="sm"
        class="shrink-0"
        aria-label="返回上传"
        @click="emit('back')"
      />
    </div>

    <div
      class="p-5 sm:p-6"
      :class="embedded ? '' : 'flex flex-1 flex-col justify-center'"
    >
      <div class="grid gap-5 sm:grid-cols-3 sm:gap-6">
        <div class="space-y-4">
          <h3 class="text-sm font-semibold">
            图片处理
          </h3>

          <label class="flex cursor-pointer items-start gap-2.5">
            <UCheckbox
              v-model="compressEnabled"
              class="mt-0.5"
            />
            <span>
              <span class="block text-sm">客户端预压缩</span>
              <span class="mt-1 block text-xs leading-relaxed text-muted">
                上传前在浏览器端压缩（服务端仍会转 WebP）
              </span>
            </span>
          </label>

          <div
            v-if="userSettings"
            class="border-t border-default pt-4"
          >
            <label class="flex cursor-pointer items-start gap-2.5">
              <UCheckbox
                v-model="userAutoDeleteEnabled"
                class="mt-0.5"
              />
              <span class="min-w-0 flex-1">
                <span
                  class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm"
                >
                  <span>自动删除超过</span>
                  <UInput
                    v-model.number="userAutoDeleteDaysDraft"
                    type="number"
                    min="1"
                    max="3650"
                    size="xs"
                    class="w-14 tabular-nums"
                    :class="
                      userAutoDeleteEnabled
                        ? ''
                        : 'pointer-events-none opacity-40'
                    "
                  />
                  <span>天的图片</span>
                </span>
                <span class="mt-1 block text-xs leading-relaxed text-muted">
                  仅清理开启后上传的图片，不影响此前已存的图片
                </span>
              </span>
            </label>
          </div>
          <div
            v-else
            class="flex justify-center border-t border-default py-4"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-5 animate-spin text-muted"
            />
          </div>
        </div>

        <div class="space-y-4">
          <h3 class="text-sm font-semibold">
            WebP 压缩质量
          </h3>
          <p class="text-xs leading-relaxed text-muted">
            客户端预压缩质量（1–100），需开启「客户端预压缩」
          </p>
          <div
            class="flex items-center justify-between gap-2 text-sm text-muted"
          >
            <span>当前：{{ clientWebpQuality }}</span>
            <span>{{ clientQualityLevel }}</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            :value="clientWebpQuality"
            class="h-2 w-full cursor-pointer appearance-none rounded-full bg-default accent-primary"
            @input="onClientQualityInput"
          >
        </div>

        <div class="space-y-4">
          <h3 class="text-sm font-semibold">
            便捷功能
          </h3>
          <label class="flex cursor-pointer items-start gap-2.5">
            <UCheckbox
              v-model="autoCopyMarkdown"
              class="mt-0.5"
            />
            <span>
              <span class="block text-sm">上传成功自动复制链接</span>
              <span class="mt-1 block text-xs leading-relaxed text-muted">
                按所选格式复制到剪贴板
              </span>
            </span>
          </label>
          <div
            class="ml-7 flex gap-1 rounded-lg border border-default p-0.5"
            :class="autoCopyMarkdown ? '' : 'pointer-events-none opacity-40'"
          >
            <UButton
              v-for="item in copyFormatItems"
              :key="item.value"
              size="xs"
              class="flex-1 justify-center"
              :variant="copyFormat === item.value ? 'solid' : 'ghost'"
              :color="copyFormat === item.value ? 'primary' : 'neutral'"
              :label="item.label"
              @click="setCopyFormat(item.value)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

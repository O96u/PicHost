<script setup lang="ts">
import type { QuotaUnit } from '~/composables/useFileSize'
import type { StorageBackendItem } from '~/types/storage'

type StorageProvider = 'r2' | 'cos' | 'oss' | 'aws' | 'custom'

export interface StorageFormPayload {
  name: string
  config: {
    endpoint: string
    region: string
    bucket: string
    prefix?: string
    forcePathStyle: boolean
  }
  secrets: {
    accessKeyId: string
    secretAccessKey: string
  }
  servingMode: 'proxy' | 'public'
  publicUrl: string
  quotaValue: string
  quotaUnit: QuotaUnit
}

const props = defineProps<{
  backend?: StorageBackendItem | null
  createMode?: boolean
  saving?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: StorageFormPayload]
  cancel: []
}>()

const { t } = useI18n()
const { bytesToQuotaInput, QUOTA_UNITS } = useFileSize()

const name = ref('')
const provider = ref<StorageProvider>('r2')
const endpoint = ref('')
const region = ref('auto')
const bucket = ref('')
const prefix = ref('')
const forcePathStyle = ref(false)
const accessKeyId = ref('')
const secretAccessKey = ref('')
const servingMode = ref<'proxy' | 'public'>('proxy')
const publicUrl = ref('')
const quotaValue = ref('')
const quotaUnit = ref<QuotaUnit>('GB')

const quotaUnitOptions = computed(() =>
  QUOTA_UNITS.map(unit => ({ label: unit, value: unit }))
)

const providerOptions = computed(() => [
  { label: t('storage.providerR2'), value: 'r2' as const },
  { label: t('storage.providerCos'), value: 'cos' as const },
  { label: t('storage.providerOss'), value: 'oss' as const },
  { label: t('storage.providerAws'), value: 'aws' as const },
  { label: t('storage.providerCustom'), value: 'custom' as const }
])

const servingModeOptions = computed(() => [
  { label: t('storage.servingProxy'), value: 'proxy' },
  { label: t('storage.servingPublic'), value: 'public' }
])

function providerLabel(value: StorageProvider): string {
  return providerOptions.value.find(option => option.value === value)?.label
    ?? t('storage.backendCloud')
}

function applyProviderTemplate(value: StorageProvider) {
  if (!props.createMode && props.backend) return
  if (props.createMode) {
    name.value = providerLabel(value)
  }
  switch (value) {
    case 'r2':
      endpoint.value = 'https://{account_id}.r2.cloudflarestorage.com'
      region.value = 'auto'
      forcePathStyle.value = false
      break
    case 'cos':
      endpoint.value = 'https://cos.{region}.myqcloud.com'
      region.value = 'ap-guangzhou'
      forcePathStyle.value = true
      break
    case 'oss':
      endpoint.value = 'https://oss-{region}.aliyuncs.com'
      region.value = 'cn-hangzhou'
      forcePathStyle.value = false
      break
    case 'aws':
      endpoint.value = 'https://s3.{region}.amazonaws.com'
      region.value = 'us-east-1'
      forcePathStyle.value = false
      break
    default:
      break
  }
}

function detectProvider(config: StorageBackendItem['config']): StorageProvider {
  const ep = config.endpoint ?? ''
  if (ep.includes('r2.cloudflarestorage.com')) return 'r2'
  if (ep.includes('myqcloud.com')) return 'cos'
  if (ep.includes('aliyuncs.com')) return 'oss'
  if (ep.includes('amazonaws.com')) return 'aws'
  return 'custom'
}

function loadBackend(backend: StorageBackendItem | null | undefined) {
  if (!backend || backend.type !== 's3') {
    if (props.createMode) {
      name.value = ''
      provider.value = 'r2'
      applyProviderTemplate('r2')
      bucket.value = ''
      prefix.value = ''
      accessKeyId.value = ''
      secretAccessKey.value = ''
      servingMode.value = 'proxy'
      publicUrl.value = ''
      quotaValue.value = ''
      quotaUnit.value = 'GB'
    }
    return
  }

  name.value = backend.name
  provider.value = detectProvider(backend.config)
  endpoint.value = backend.config.endpoint ?? ''
  region.value = backend.config.region ?? 'auto'
  bucket.value = backend.config.bucket ?? ''
  prefix.value = backend.config.prefix ?? ''
  forcePathStyle.value = backend.config.forcePathStyle ?? false
  servingMode.value = backend.servingMode
  publicUrl.value = backend.publicUrl
  const quota = bytesToQuotaInput(backend.quotaBytes)
  quotaValue.value = quota.value
  quotaUnit.value = quota.unit
  accessKeyId.value = ''
  secretAccessKey.value = ''
}

watch(() => props.backend, loadBackend, { immediate: true })

watch(provider, (value) => {
  if (props.createMode) {
    applyProviderTemplate(value)
  }
})

function handleSubmit() {
  emit('submit', {
    name: name.value.trim() || providerLabel(provider.value),
    config: {
      endpoint: endpoint.value.trim(),
      region: region.value.trim() || 'auto',
      bucket: bucket.value.trim(),
      prefix: prefix.value.trim() || undefined,
      forcePathStyle: forcePathStyle.value
    },
    secrets: {
      accessKeyId: accessKeyId.value.trim(),
      secretAccessKey: secretAccessKey.value.trim()
    },
    servingMode: servingMode.value,
    publicUrl: publicUrl.value.trim(),
    quotaValue: String(quotaValue.value ?? '').trim(),
    quotaUnit: quotaUnit.value
  })
}
</script>

<template>
  <form
    class="space-y-4"
    @submit.prevent="handleSubmit"
  >
    <div class="space-y-2">
      <label class="text-sm">{{ t('storage.provider') }}</label>
      <USelect
        v-model="provider"
        :items="providerOptions"
        class="w-full"
      />
    </div>

    <div class="space-y-2">
      <label class="text-sm">{{ t('storage.backendName') }}</label>
      <UInput
        v-model="name"
        class="w-full"
      />
    </div>

    <div class="space-y-2">
      <label class="text-sm">{{ t('storage.endpoint') }}</label>
      <UInput
        v-model="endpoint"
        class="w-full font-mono text-sm"
      />
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <div class="space-y-2">
        <label class="text-sm">{{ t('storage.region') }}</label>
        <UInput
          v-model="region"
          class="w-full font-mono text-sm"
        />
      </div>
      <div class="space-y-2">
        <label class="text-sm">{{ t('storage.bucket') }}</label>
        <UInput
          v-model="bucket"
          class="w-full font-mono text-sm"
          required
        />
      </div>
    </div>

    <div class="space-y-2">
      <label class="text-sm">{{ t('storage.prefix') }}</label>
      <UInput
        v-model="prefix"
        :placeholder="t('storage.prefixPlaceholder')"
        class="w-full font-mono text-sm"
      />
    </div>

    <label class="flex cursor-pointer items-center gap-2">
      <UCheckbox v-model="forcePathStyle" />
      <span class="text-sm">{{ t('storage.forcePathStyle') }}</span>
    </label>

    <div class="grid gap-3 sm:grid-cols-2">
      <div class="space-y-2">
        <label class="text-sm">{{ t('storage.accessKey') }}</label>
        <UInput
          v-model="accessKeyId"
          :placeholder="backend?.secretsMasked.accessKeyId || ''"
          class="w-full font-mono text-sm"
          :required="createMode"
        />
      </div>
      <div class="space-y-2">
        <label class="text-sm">{{ t('storage.secretKey') }}</label>
        <UInput
          v-model="secretAccessKey"
          type="password"
          :placeholder="backend?.secretsMasked.secretAccessKey || ''"
          class="w-full font-mono text-sm"
          :required="createMode"
        />
      </div>
    </div>

    <div class="space-y-2">
      <label class="text-sm">{{ t('storage.servingMode') }}</label>
      <URadioGroup
        v-model="servingMode"
        :items="servingModeOptions"
      />
      <p class="text-xs text-muted">
        {{ t('storage.servingHint') }}
      </p>
    </div>

    <div
      v-if="servingMode === 'public'"
      class="space-y-2"
    >
      <label class="text-sm">{{ t('storage.publicUrl') }}</label>
      <UInput
        v-model="publicUrl"
        :placeholder="t('storage.publicUrlPlaceholder')"
        class="w-full font-mono text-sm"
      />
    </div>

    <div class="space-y-2">
      <label class="text-sm">
        {{ t('storage.quotaTotal') }}
        <span class="text-error">*</span>
      </label>
      <div class="flex gap-2">
        <UInput
          :model-value="String(quotaValue)"
          type="number"
          min="0"
          step="any"
          required
          :placeholder="t('storage.quotaPlaceholder')"
          class="min-w-0 flex-1"
          @update:model-value="quotaValue = String($event ?? '')"
        />
        <USelect
          v-model="quotaUnit"
          :items="quotaUnitOptions"
          class="w-24 shrink-0"
        />
      </div>
      <p class="text-xs text-muted">
        {{ t('storage.quotaHint') }}
      </p>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <UButton
        type="button"
        :label="t('common.cancel')"
        variant="outline"
        color="neutral"
        @click="emit('cancel')"
      />
      <UButton
        type="submit"
        :label="t('common.save')"
        icon="i-lucide-save"
        :loading="saving"
      />
    </div>
  </form>
</template>

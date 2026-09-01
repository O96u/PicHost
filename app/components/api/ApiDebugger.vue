<script setup lang="ts">
import type { ApiDocEndpoint, ApiDocParam } from '~/composables/useApiDocs'

const props = defineProps<{
  endpoint: ApiDocEndpoint
  token: string
}>()

const { t } = useI18n()
const toast = useToast()

const authToken = ref('')
const paramValues = ref<Record<string, string>>({})
const fileValues = ref<Record<string, File | null>>({})
const fileInputRefs = ref<Record<string, HTMLInputElement | null>>({})
const sending = ref(false)
const responseStatus = ref<number | null>(null)
const responseBody = ref('')
const responseError = ref(false)

function isDebugParam(param: ApiDocParam) {
  if (param.name === 'token' && props.endpoint.requiresAuth) {
    return false
  }
  return true
}

const debugQueryParams = computed(() =>
  props.endpoint.params.filter(p => p.location === 'query' && isDebugParam(p))
)

const debugBodyParams = computed(() =>
  props.endpoint.params.filter(p =>
    (p.location === 'form-data' || p.location === 'body') && isDebugParam(p)
  )
)

const showAuthHeader = computed(() => props.endpoint.requiresAuth)

watch(
  () => props.endpoint.id,
  () => {
    resetForm()
  },
  { immediate: true }
)

watch(
  () => props.token,
  (value) => {
    if (value) {
      authToken.value = value
      if (!props.endpoint.requiresAuth && 'token' in paramValues.value) {
        paramValues.value.token = value
      }
    }
  },
  { immediate: true }
)

function resetForm() {
  const values: Record<string, string> = {}
  const files: Record<string, File | null> = {}
  for (const param of props.endpoint.params) {
    if (!isDebugParam(param)) continue
    if (param.type === 'file') {
      files[param.name] = null
    } else if (param.name === 'keys') {
      values[param.name] = '["images/2026/08/example.webp"]'
    } else if (param.name === 'token' && props.token) {
      values[param.name] = props.token
    } else {
      values[param.name] = ''
    }
  }
  paramValues.value = values
  fileValues.value = files
  responseStatus.value = null
  responseBody.value = ''
  responseError.value = false
}

function fileLabel(name: string) {
  return fileValues.value[name]?.name ?? t('api.debug.noFileSelected')
}

function triggerFilePick(name: string) {
  fileInputRefs.value[name]?.click()
}

function onFileChange(name: string, event: Event) {
  const input = event.target as HTMLInputElement
  fileValues.value[name] = input.files?.[0] ?? null
}

function isParamFilled(param: ApiDocParam) {
  if (param.type === 'file') {
    return fileValues.value[param.name] != null
  }
  const value = paramValues.value[param.name]?.trim() ?? ''
  if (!value) return false
  if (param.location === 'body' && param.name === 'keys') {
    try {
      const parsed = JSON.parse(value) as { keys?: unknown }
      return Array.isArray(parsed.keys) && parsed.keys.length > 0
    } catch {
      return false
    }
  }
  return true
}

const canSendRequest = computed(() => {
  if (sending.value) return false
  if (showAuthHeader.value && !authToken.value.trim()) return false
  const params = [...debugQueryParams.value, ...debugBodyParams.value]
  return params.every(param => !param.required || isParamFilled(param))
})

function buildUrl() {
  const url = new URL(props.endpoint.path, window.location.origin)
  for (const param of debugQueryParams.value) {
    const value = paramValues.value[param.name]?.trim()
    if (value) {
      url.searchParams.set(param.name, value)
    }
  }
  return url.toString()
}

async function sendRequest() {
  if (!canSendRequest.value) return
  sending.value = true
  responseStatus.value = null
  responseBody.value = ''
  responseError.value = false

  try {
    const headers: Record<string, string> = {}
    if (showAuthHeader.value && authToken.value.trim()) {
      headers['Auth-Token'] = authToken.value.trim()
    }

    let body: BodyInit | undefined

    if (debugBodyParams.value.some(p => p.location === 'form-data')) {
      const formData = new FormData()
      for (const param of debugBodyParams.value) {
        if (param.location !== 'form-data') continue
        if (param.type === 'file') {
          const file = fileValues.value[param.name]
          if (file) formData.append(param.name, file)
        } else {
          const value = paramValues.value[param.name]?.trim()
          if (value) formData.append(param.name, value)
        }
      }
      body = formData
    } else if (debugBodyParams.value.some(p => p.location === 'body')) {
      headers['Content-Type'] = 'application/json'
      try {
        body = JSON.stringify(JSON.parse(paramValues.value.keys || '{}'))
      } catch {
        toast.add({ title: t('api.debug.invalidJson'), color: 'error' })
        sending.value = false
        return
      }
    }

    const response = await fetch(buildUrl(), {
      method: props.endpoint.method,
      headers,
      body,
      credentials: 'include'
    })

    responseStatus.value = response.status
    const text = await response.text()
    try {
      responseBody.value = JSON.stringify(JSON.parse(text), null, 2)
    } catch {
      responseBody.value = text
    }
    responseError.value = !response.ok
  } catch {
    responseError.value = true
    responseBody.value = t('api.debug.networkError')
    toast.add({ title: t('api.debug.sendFailed'), color: 'error' })
  } finally {
    sending.value = false
  }
}

const responseScrollable = computed(() => responseBody.value.split('\n').length > 14)
</script>

<template>
  <aside class="flex w-full shrink-0 flex-col border-t border-default bg-default lg:w-72 lg:border-t-0 lg:border-l xl:w-80">
    <div class="flex items-start gap-2 border-b border-default px-5 py-4 sm:px-6">
      <UIcon
        name="i-lucide-flask-conical"
        class="mt-0.5 size-5 shrink-0 text-primary"
      />
      <div class="min-w-0">
        <h3 class="text-base font-semibold">
          {{ t('api.debug.title') }}
        </h3>
        <div class="mt-1.5 flex flex-wrap items-center gap-2">
          <ApiMethodBadge
            :method="endpoint.method"
            size="sm"
          />
          <code class="truncate font-mono text-xs text-muted">
            {{ endpoint.path }}
          </code>
        </div>
      </div>
    </div>

    <div class="flex flex-1 flex-col">
      <div class="space-y-3 p-5 sm:p-6">
        <section
          v-if="showAuthHeader"
          class="rounded-xl border border-default p-3 sm:p-4"
        >
          <h4 class="mb-3 text-xs font-semibold text-highlighted">
            {{ t('api.debug.headers') }}
          </h4>
          <div class="space-y-1.5">
            <label class="text-xs text-muted">
              Auth-Token
              <span class="text-error">*</span>
            </label>
            <UInput
              v-model="authToken"
              size="sm"
              class="font-mono text-xs"
              :placeholder="t('api.debug.tokenPlaceholder')"
            />
          </div>
        </section>

        <section
          v-if="debugQueryParams.length"
          class="rounded-xl border border-default p-3 sm:p-4"
        >
          <h4 class="mb-3 text-xs font-semibold text-highlighted">
            {{ t('api.debug.query') }}
          </h4>
          <div class="space-y-3">
            <div
              v-for="param in debugQueryParams"
              :key="param.name"
              class="space-y-1.5"
            >
              <label class="text-xs text-muted">
                {{ param.name }}
                <span
                  v-if="param.required"
                  class="text-error"
                >*</span>
              </label>
              <UInput
                v-model="paramValues[param.name]"
                size="sm"
                class="font-mono text-xs"
              />
            </div>
          </div>
        </section>

        <section
          v-if="debugBodyParams.length"
          class="rounded-xl border border-default p-3 sm:p-4"
        >
          <h4 class="mb-3 text-xs font-semibold text-highlighted">
            {{ t('api.debug.body') }}
          </h4>
          <div class="space-y-3">
            <div
              v-for="param in debugBodyParams"
              :key="param.name"
              class="space-y-1.5"
            >
              <label class="text-xs text-muted">
                {{ param.name }}
                <span
                  v-if="param.required"
                  class="text-error"
                >*</span>
              </label>

              <div
                v-if="param.type === 'file'"
                class="flex items-center gap-2"
              >
                <input
                  :ref="(el) => { fileInputRefs[param.name] = el as HTMLInputElement }"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="onFileChange(param.name, $event)"
                >
                <UButton
                  size="xs"
                  variant="outline"
                  color="neutral"
                  :label="t('api.debug.selectFile')"
                  @click="triggerFilePick(param.name)"
                />
                <span class="min-w-0 truncate text-xs text-muted">
                  {{ fileLabel(param.name) }}
                </span>
              </div>

              <UTextarea
                v-else-if="param.location === 'body'"
                v-model="paramValues[param.name]"
                :rows="3"
                size="sm"
                class="font-mono text-xs"
              />
              <UInput
                v-else
                v-model="paramValues[param.name]"
                size="sm"
                class="font-mono text-xs"
              />
            </div>
          </div>
        </section>

        <UButton
          icon="i-lucide-send"
          :label="t('api.debug.send')"
          color="primary"
          block
          :loading="sending"
          :disabled="!canSendRequest"
          @click="sendRequest"
        />

        <section
          v-if="responseStatus !== null || responseBody"
          class="overflow-hidden rounded-xl border border-default"
        >
          <div class="flex items-center justify-between border-b border-default px-3 py-2">
            <span class="text-xs font-semibold text-highlighted">
              {{ t('api.debug.response') }}
            </span>
            <UBadge
              v-if="responseStatus !== null"
              :color="responseError ? 'error' : 'success'"
              variant="subtle"
              size="xs"
            >
              {{ responseStatus }}
            </UBadge>
          </div>
          <pre
            class="api-debug-response bg-neutral-950 p-3 text-xs leading-relaxed text-neutral-100"
            :class="responseScrollable ? 'max-h-64 overflow-y-auto' : ''"
          ><code class="font-mono whitespace-pre">{{ responseBody }}</code></pre>
        </section>
      </div>

      <div class="mt-auto border-t border-default p-5 sm:p-6">
        <h4 class="mb-2 text-xs font-semibold">
          {{ t('api.debug.notesTitle') }}
        </h4>
        <ul class="space-y-1 text-xs leading-relaxed text-muted">
          <li>{{ t('api.debug.noteSuccess') }}</li>
          <li>{{ t('api.debug.noteError') }}</li>
          <li>{{ t('api.debug.noteLimit') }}</li>
        </ul>
      </div>
    </div>
  </aside>
</template>

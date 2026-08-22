<script setup lang="ts">
interface SettingsResponse {
  apiUploadToken: string
  tokenSource: 'env' | 'db' | 'none'
  envTokenOverride: boolean
  env: {
    webpQuality: number
    refererConfigured: boolean
    imageBaseUrl: string
    appVersion: string
  }
}

interface ApiDocItem {
  index: number
  method: 'GET' | 'POST' | 'DELETE'
  path: string
  title: string
  description: string
  curl: string
}

const { isChecking, isAuthenticated, checkSession, handleAuthError, fetchStatus, isAdmin } = useAuth()
const toast = useToast()

const settings = ref<SettingsResponse | null>(null)
const loading = ref(false)
const regenerating = ref(false)
const confirmRegenerateOpen = ref(false)
const regenerateResultOpen = ref(false)
const newToken = ref('')

const baseUrl = computed(() => {
  if (import.meta.client) {
    return window.location.origin
  }
  return settings.value?.env.imageBaseUrl ?? ''
})

const tokenDisplay = computed(() => settings.value?.apiUploadToken ?? '')
const hasToken = computed(() => tokenDisplay.value.length > 0)
const canRegenerate = computed(() => !settings.value?.envTokenOverride && !loading.value)

const authHeader = computed(() =>
  hasToken.value ? tokenDisplay.value : 'YOUR-TOKEN'
)

const authHeaderFlag = computed(() => `-H 'Auth-Token: ${authHeader.value}'`)

const apiDocs = computed<ApiDocItem[]>(() => {
  const uploadDescription = isAdmin.value
    ? '上传单张或多张图片。字段 image 传图片，folder 指定目录（不存在则自动创建）；仍兼容 file、files、type。'
    : '上传单张或多张图片。字段 image 传图片；仍兼容 file、files。图片固定存入 images/ 目录。'
  const uploadCurl = isAdmin.value
    ? `curl -X POST "${baseUrl.value}/api/images/upload" \\
  ${authHeaderFlag.value} \\
  -F "image=@./demo.png"

# 上传到自定义目录 blog/
curl -X POST "${baseUrl.value}/api/images/upload" \\
  ${authHeaderFlag.value} \\
  -F "folder=blog" \\
  -F "image=@./demo.png"`
    : `curl -X POST "${baseUrl.value}/api/images/upload" \\
  ${authHeaderFlag.value} \\
  -F "image=@./demo.png"`

  const listDescription = isAdmin.value
    ? '分页列出图库，folder 可筛选目录，limit 默认 20、最大 100。'
    : '分页列出您的图库，limit 默认 20、最大 100。'
  const listCurl = isAdmin.value
    ? `curl "${baseUrl.value}/api/images?limit=20&page=1" \\
  ${authHeaderFlag.value}

# 按目录筛选
curl "${baseUrl.value}/api/images?folder=blog&limit=20&page=1" \\
  ${authHeaderFlag.value}`
    : `curl "${baseUrl.value}/api/images?limit=20&page=1" \\
  ${authHeaderFlag.value}`

  return [
    {
      index: 1,
      method: 'POST',
      path: '/api/images/upload',
      title: '上传图片',
      description: uploadDescription,
      curl: uploadCurl
    },
    {
      index: 2,
      method: 'GET',
      path: '/api/images',
      title: '获取图片列表',
      description: listDescription,
      curl: listCurl
    },
    {
      index: 3,
      method: 'GET',
      path: '/api/images/search',
      title: '搜索图片',
      description: '按文件名或路径关键词搜索，参数 q 必填。',
      curl: `curl "${baseUrl.value}/api/images/search?q=demo&limit=20&page=1" \\
  ${authHeaderFlag.value}`
    },
    {
      index: 4,
      method: 'DELETE',
      path: '/api/images',
      title: '删除图片',
      description: '通过 key 删除单张图片，key 为存储路径（如 images/2026/08/xxx.webp）。',
      curl: `curl -X DELETE "${baseUrl.value}/api/images?key=images/2026/08/xxxx.webp" \\
  ${authHeaderFlag.value}`
    },
    {
      index: 5,
      method: 'POST',
      path: '/api/images/batch-delete',
      title: '批量删除',
      description: '一次删除多张图片，请求体为 keys 数组。',
      curl: `curl -X POST "${baseUrl.value}/api/images/batch-delete" \\
  ${authHeaderFlag.value} \\
  -H "Content-Type: application/json" \\
  -d '{"keys":["images/2026/08/a.webp","images/2026/08/b.webp"]}'`
    }
  ]
})

const twikooDoc = computed(() => ({
  method: 'POST' as const,
  path: '/api/index.php',
  title: 'twikoo 兼容上传',
  description: '兼容 Twikoo / EasyImage 2.0 协议，图片存入 twikoo/ 目录；字段 image + token。',
  curl: `curl -X POST "${baseUrl.value}/api/index.php" \\
  -F "token=${authHeader.value}" \\
  -F "image=@./demo.png"`
}))

function tokenSourceLabel(source: SettingsResponse['tokenSource']) {
  switch (source) {
    case 'env':
      return '来源：环境变量 API_UPLOAD_TOKEN'
    case 'db':
      return '来源：后台生成（可重新生成）'
    default:
      return '来源：未配置'
  }
}

function methodBadgeColor(method: ApiDocItem['method']) {
  switch (method) {
    case 'GET':
      return 'info' as const
    case 'DELETE':
      return 'error' as const
    default:
      return 'primary' as const
  }
}

async function loadSettings() {
  loading.value = true
  try {
    const endpoint = isAdmin.value ? '/api/settings' : '/api/user/api-token'
    settings.value = await $fetch<SettingsResponse>(endpoint, {
      credentials: 'include'
    })
  } catch (error: unknown) {
    handleAuthError(error)
    if (isAuthenticated.value) {
      toast.add({ title: '加载 API 设置失败', color: 'error' })
    }
  } finally {
    loading.value = false
  }
}

function requestRegenerate() {
  if (!canRegenerate.value) return
  confirmRegenerateOpen.value = true
}

async function confirmRegenerate() {
  confirmRegenerateOpen.value = false
  regenerating.value = true
  try {
    const endpoint = isAdmin.value
      ? '/api/settings/api-token/regenerate'
      : '/api/user/api-token/regenerate'
    const response = await $fetch<{ apiUploadToken: string }>(
      endpoint,
      { method: 'POST', credentials: 'include' }
    )
    newToken.value = response.apiUploadToken
    regenerateResultOpen.value = true
    await loadSettings()
  } catch (error: unknown) {
    handleAuthError(error)
    if (isAuthenticated.value) {
      const status = typeof error === 'object' && error !== null && 'statusCode' in error
        ? (error as { statusCode: number }).statusCode
        : 0
      if (status === 409) {
        toast.add({
          title: '环境变量已配置 Token，无法在后台重新生成',
          color: 'warning'
        })
      } else {
        toast.add({ title: '重新生成 Token 失败', color: 'error' })
      }
    }
  } finally {
    regenerating.value = false
  }
}

async function copyCurl(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: '已复制 cURL 示例', color: 'success' })
  } catch {
    toast.add({ title: '复制失败', color: 'error' })
  }
}

function closeConfirmRegenerate() {
  confirmRegenerateOpen.value = false
}

function closeRegenerateResult() {
  regenerateResultOpen.value = false
}

onMounted(async () => {
  const status = await fetchStatus()
  if (!status.initialized && !status.legacyMode) {
    await navigateTo('/setup')
    return
  }
  await checkSession()
})

watch(isAuthenticated, async (authed) => {
  if (authed) {
    await nextTick()
    await loadSettings()
  } else {
    settings.value = null
  }
})
</script>

<template>
  <div class="min-h-screen">
    <div
      v-if="isChecking"
      class="flex min-h-screen items-center justify-center"
    >
      <div class="flex flex-col items-center gap-3 text-muted">
        <UIcon
          name="i-lucide-loader-circle"
          class="size-8 animate-spin"
        />
        <p class="text-sm">
          正在验证登录状态…
        </p>
      </div>
    </div>

    <AdminLoginGate v-else-if="!isAuthenticated" />

    <AppShell v-else>
      <section class="overflow-hidden rounded-2xl border border-default bg-elevated shadow-sm">
        <div class="flex items-center gap-2 border-b border-default px-5 py-4 sm:px-6">
          <UIcon
            name="i-lucide-key-round"
            class="size-5 text-primary"
          />
          <h2 class="text-base font-semibold">
            API Token
          </h2>
        </div>

        <div class="space-y-4 p-5 sm:p-6">
          <UAlert
            v-if="settings?.envTokenOverride"
            color="warning"
            variant="subtle"
            icon="i-lucide-triangle-alert"
            title="Token 由环境变量覆盖"
            description="修改 API_UPLOAD_TOKEN 后需重启服务；后台无法重新生成。"
          />

          <UAlert
            v-else-if="!isAdmin"
            color="info"
            variant="subtle"
            icon="i-lucide-info"
            title="个人 API Token"
            description="此 Token 仅用于您自己的脚本上传，上传的图片归属您的账号。"
          />

          <UAlert
            v-else-if="settings && !hasToken"
            color="info"
            variant="subtle"
            icon="i-lucide-info"
            title="尚未配置 Token"
            description="点击「重新生成」创建 Token，用于下方所有接口的 Auth-Token 鉴权。"
          />

          <div class="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <UInput
              :model-value="hasToken ? tokenDisplay : '（未配置）'"
              readonly
              class="min-w-0 flex-1 font-mono text-xs sm:text-sm"
              :loading="loading"
            />
            <div class="flex gap-2">
              <CopyButton
                label="复制"
                :value="tokenDisplay"
              />
              <UButton
                icon="i-lucide-refresh-cw"
                label="重新生成"
                color="warning"
                variant="soft"
                :loading="regenerating"
                :disabled="!canRegenerate"
                @click="requestRegenerate"
              />
            </div>
          </div>

          <p
            v-if="settings"
            class="text-xs text-muted"
          >
            {{ tokenSourceLabel(settings.tokenSource) }}
            · 请求头：
            <code class="font-mono">Auth-Token: &lt;token&gt;</code>
            <template v-if="hasToken && !settings.envTokenOverride">
              · 重新生成后旧 Token 立即失效
            </template>
          </p>
        </div>
      </section>

      <section class="overflow-hidden rounded-2xl border border-default bg-elevated shadow-sm">
        <div class="flex items-center gap-2 border-b border-default px-5 py-4 sm:px-6">
          <UIcon
            name="i-lucide-book-open"
            class="size-5 text-primary"
          />
          <h2 class="text-base font-semibold">
            API 文档
          </h2>
        </div>

        <div class="divide-y divide-default">
          <article
            v-for="doc in apiDocs"
            :key="doc.index"
            class="space-y-4 p-5 sm:p-6"
          >
            <div class="flex gap-3">
              <span
                class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
              >
                {{ doc.index }}
              </span>
              <div class="min-w-0 space-y-2">
                <div class="flex flex-wrap items-center gap-2">
                  <UBadge
                    :color="methodBadgeColor(doc.method)"
                    variant="subtle"
                    size="sm"
                  >
                    {{ doc.method }}
                  </UBadge>
                  <code class="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-sm font-medium text-primary">
                    {{ doc.path }}
                  </code>
                  <span class="text-sm font-medium">
                    {{ doc.title }}
                  </span>
                </div>
                <p class="text-sm leading-relaxed text-muted">
                  {{ doc.description }}
                </p>
              </div>
            </div>

            <div>
              <p class="mb-2 text-xs font-medium text-muted">
                cURL 示例
              </p>
              <div class="relative overflow-hidden rounded-xl bg-neutral-950">
                <UButton
                  icon="i-lucide-copy"
                  label="复制"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  class="absolute top-2 right-2 z-10 text-neutral-300 hover:text-white"
                  @click="copyCurl(doc.curl)"
                />
                <pre class="max-h-80 overflow-auto p-4 pt-10 text-xs leading-relaxed text-neutral-100"><code class="font-mono">{{ doc.curl }}</code></pre>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="overflow-hidden rounded-2xl border border-dashed border-default bg-muted/20">
        <div class="space-y-4 p-5 sm:p-6">
          <div class="flex gap-3">
            <UIcon
              name="i-lucide-message-square"
              class="mt-0.5 size-5 shrink-0 text-muted"
            />
            <div class="min-w-0 space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge
                  color="neutral"
                  variant="subtle"
                  size="sm"
                >
                  {{ twikooDoc.method }}
                </UBadge>
                <code class="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-sm font-medium text-primary">
                  {{ twikooDoc.path }}
                </code>
                <span class="text-sm font-medium">
                  {{ twikooDoc.title }}
                </span>
              </div>
              <p class="text-sm leading-relaxed text-muted">
                {{ twikooDoc.description }}
              </p>
            </div>
          </div>

          <div>
            <p class="mb-2 text-xs font-medium text-muted">
              cURL 示例
            </p>
            <div class="relative overflow-hidden rounded-xl bg-neutral-950">
              <UButton
                icon="i-lucide-copy"
                label="复制"
                size="xs"
                variant="ghost"
                color="neutral"
                class="absolute top-2 right-2 z-10 text-neutral-300 hover:text-white"
                @click="copyCurl(twikooDoc.curl)"
              />
              <pre class="overflow-auto p-4 pt-10 text-xs leading-relaxed text-neutral-100"><code class="font-mono">{{ twikooDoc.curl }}</code></pre>
            </div>
          </div>
        </div>
      </section>
    </AppShell>

    <UModal
      :open="confirmRegenerateOpen"
      title="确认重新生成 Token？"
      description="旧 Token 将立即失效，使用旧 Token 的脚本与自动化任务将无法继续调用接口，直到你更新为新 Token。"
      @update:open="confirmRegenerateOpen = $event"
    >
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            label="取消"
            color="neutral"
            variant="outline"
            @click="closeConfirmRegenerate"
          />
          <UButton
            label="确认重新生成"
            color="warning"
            :loading="regenerating"
            @click="confirmRegenerate"
          />
        </div>
      </template>
    </UModal>

    <UModal
      :open="regenerateResultOpen"
      title="新 Token 已生成"
      description="请立即复制保存。关闭弹窗后仍可在上方输入框复制，但请尽快更新到你的脚本配置中。"
      @update:open="regenerateResultOpen = $event"
    >
      <template #body>
        <UInput
          :model-value="newToken"
          readonly
          class="w-full font-mono text-sm"
        />
      </template>
      <template #footer>
        <div class="flex w-full flex-wrap justify-end gap-2">
          <CopyButton
            label="复制 Token"
            :value="newToken"
          />
          <UButton
            label="我已保存"
            @click="closeRegenerateResult"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

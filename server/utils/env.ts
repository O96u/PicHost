import type { H3Event } from 'h3'

type EnvRecord = Record<string, unknown>

function getCloudflareEnvFromEvent(event: H3Event): EnvRecord | undefined {
  const ctx = event.context as Record<string, unknown>

  const direct = ctx.cloudflare as { env?: EnvRecord } | undefined
  if (direct?.env) {
    return direct.env
  }

  const platform = ctx._platform as { cloudflare?: { env?: EnvRecord } } | undefined
  if (platform?.cloudflare?.env) {
    return platform.cloudflare.env
  }

  return undefined
}

function getGlobalCloudflareEnv(): EnvRecord | undefined {
  const g = globalThis as typeof globalThis & { __env__?: EnvRecord }
  return g.__env__
}

export function getRuntimeEnv(
  event: H3Event,
  envKey: string,
  configKey?: string
): string {
  const sources: (EnvRecord | undefined)[] = [
    getCloudflareEnvFromEvent(event),
    getGlobalCloudflareEnv()
  ]

  for (const record of sources) {
    const value = record?.[envKey]
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }

  try {
    const fromProcess = process.env[envKey]
    if (fromProcess) {
      return fromProcess
    }
  } catch {
    // Cloudflare Workers 中 process.env 可能不可用
  }

  if (configKey) {
    const config = useRuntimeConfig(event) as Record<string, unknown>
    const fromConfig = config[configKey]
    if (typeof fromConfig === 'string' && fromConfig.length > 0) {
      return fromConfig
    }
  }

  return ''
}

export function isAdminSecretConfigured(event: H3Event): boolean {
  return getAdminSecret(event).length > 0
}

export function getAdminSecret(event: H3Event): string {
  return getRuntimeEnv(event, 'ADMIN_SECRET', 'adminSecret')
    || getRuntimeEnv(event, 'NUXT_ADMIN_SECRET', 'adminSecret')
}

export function getImageBaseUrl(event: H3Event): string {
  return getRuntimeEnv(event, 'IMAGE_BASE_URL', 'imageBaseUrl')
}

export function getInternalPurgeToken(event: H3Event): string {
  return getRuntimeEnv(event, 'INTERNAL_PURGE_TOKEN', 'internalPurgeToken')
}

export function getImageWorkerPurgeUrl(event: H3Event): string {
  return getRuntimeEnv(event, 'IMAGE_WORKER_PURGE_URL', 'imageWorkerPurgeUrl')
}

export function getTurnstileSiteKey(event: H3Event): string {
  return getRuntimeEnv(event, 'TURNSTILE_SITE_KEY', 'turnstileSiteKey')
}

export function getTurnstileSecret(event: H3Event): string {
  return getRuntimeEnv(event, 'TURNSTILE_SECRET', 'turnstileSecret')
}

export function isApiUploadTokenConfigured(event: H3Event): boolean {
  return getApiUploadToken(event).length > 0
}

export function getApiUploadToken(event: H3Event): string {
  return (
    getRuntimeEnv(event, 'API_UPLOAD_TOKEN', 'apiUploadToken')
    || getRuntimeEnv(event, 'NUXT_API_UPLOAD_TOKEN', 'apiUploadToken')
  )
}

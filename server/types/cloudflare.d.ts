import type { R2Bucket } from '@cloudflare/workers-types'

export interface CloudflareEnv {
  IMAGES: R2Bucket
  ADMIN_SECRET?: string
  IMAGE_BASE_URL?: string
  INTERNAL_PURGE_TOKEN?: string
  IMAGE_WORKER_PURGE_URL?: string
  TURNSTILE_SITE_KEY?: string
  TURNSTILE_SECRET?: string
  API_UPLOAD_TOKEN?: string
}

declare module 'h3' {
  interface H3EventContext {
    cloudflare?: {
      env: CloudflareEnv
      context: ExecutionContext
    }
  }
}

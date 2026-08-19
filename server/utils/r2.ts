import type { H3Event } from 'h3'
import type { R2Bucket } from '@cloudflare/workers-types'
import type { ApiError, ErrorCode } from '~/types/image'

export function getR2Bucket(event: H3Event): R2Bucket {
  const bucket = event.context.cloudflare?.env?.IMAGES
  if (!bucket) {
    throw createApiError(event, 'R2_ERROR', 'R2 存储未绑定', 500)
  }
  return bucket
}

export function createApiError(
  event: H3Event,
  code: ErrorCode,
  message: string,
  statusCode = 400
): never {
  throw createError({
    statusCode,
    statusMessage: message,
    data: {
      success: false,
      error: { code, message } satisfies ApiError
    }
  })
}

export function isApiErrorResponse(data: unknown): data is { error: ApiError } {
  return typeof data === 'object'
    && data !== null
    && 'error' in data
    && typeof (data as { error: unknown }).error === 'object'
}

import type { H3Event } from 'h3'
import type { ImageItem, UploadErrorItem } from '~/types/image'
import {
  ALLOWED_MIME_TYPES,
  IMAGE_CACHE_CONTROL,
  MAX_FILE_SIZE
} from './constants'
import {
  detectMimeFromSignature,
  isAllowedMimeType,
  validateFileSignature
} from './file-signature'
import { generateImageKey } from './image-key'
import { buildImageItem, sanitizeOriginalName } from './image-response'
import { getImageBaseUrl } from './env'
import { getR2Bucket } from './r2'

export async function processSingleImageUpload(
  event: H3Event,
  input: { bytes: Uint8Array, filename?: string }
): Promise<{ item: ImageItem } | { error: UploadErrorItem }> {
  const originalName = sanitizeOriginalName(input.filename ?? 'image')
  const bytes = input.bytes

  if (bytes.byteLength > MAX_FILE_SIZE) {
    return {
      error: {
        name: originalName,
        error: {
          code: 'FILE_TOO_LARGE',
          message: '图片大小不能超过 10 MB'
        }
      }
    }
  }

  const detectedMime = detectMimeFromSignature(bytes)
  if (!detectedMime) {
    return {
      error: {
        name: originalName,
        error: {
          code: 'INVALID_FILE_SIGNATURE',
          message: '无法识别的图片格式'
        }
      }
    }
  }

  if (!ALLOWED_MIME_TYPES.includes(detectedMime)) {
    return {
      error: {
        name: originalName,
        error: {
          code: 'UNSUPPORTED_FILE_TYPE',
          message: '不支持的图片格式'
        }
      }
    }
  }

  if (!validateFileSignature(detectedMime, bytes)) {
    return {
      error: {
        name: originalName,
        error: {
          code: 'INVALID_FILE_SIGNATURE',
          message: '文件签名校验失败'
        }
      }
    }
  }

  const bucket = getR2Bucket(event)
  const imageBaseUrl = getImageBaseUrl(event)
  const uploadedAt = new Date().toISOString()
  const key = generateImageKey(detectedMime, new Date(uploadedAt))

  try {
    await bucket.put(key, bytes, {
      httpMetadata: {
        contentType: detectedMime,
        cacheControl: IMAGE_CACHE_CONTROL
      },
      customMetadata: {
        originalName,
        uploadedAt,
        size: String(bytes.byteLength)
      }
    })
  } catch {
    return {
      error: {
        name: originalName,
        error: {
          code: 'UPLOAD_FAILED',
          message: '上传失败，请稍后重试'
        }
      }
    }
  }

  return {
    item: buildImageItem({
      key,
      baseUrl: imageBaseUrl,
      originalName,
      contentType: detectedMime,
      size: bytes.byteLength,
      uploadedAt
    })
  }
}

/** 与 multipart 声明的 MIME 交叉校验（可选） */
export function mimeMatchesDeclared(
  declaredMime: string,
  detectedMime: string
): boolean {
  if (!declaredMime || !isAllowedMimeType(declaredMime)) {
    return true
  }
  return declaredMime === detectedMime
}

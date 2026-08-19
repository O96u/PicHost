import { readMultipartFormData } from 'h3'
import type { UploadResponse, UploadErrorItem, ImageItem } from '~/types/image'
import { requireUploadAuth } from '../../utils/access'
import { MAX_FILES_PER_UPLOAD } from '../../utils/constants'
import {
  detectMimeFromSignature,
  isAllowedMimeType
} from '../../utils/file-signature'
import {
  mimeMatchesDeclared,
  processSingleImageUpload
} from '../../utils/process-image-upload'
import { createApiError } from '../../utils/r2'

export default defineEventHandler(async (event) => {
  await requireUploadAuth(event)

  const formData = await readMultipartFormData(event)
  if (!formData?.length) {
    createApiError(event, 'INVALID_REQUEST', '未收到上传文件', 400)
  }

  // 兼容 files / file / image 字段名（网页多图 / 油猴脚本）
  const fileParts = formData.filter(
    part => (part.name === 'files' || part.name === 'file' || part.name === 'image')
      && part.data?.length
  )
  if (!fileParts.length) {
    createApiError(event, 'INVALID_REQUEST', '未收到上传文件', 400)
  }

  if (fileParts.length > MAX_FILES_PER_UPLOAD) {
    createApiError(
      event,
      'TOO_MANY_FILES',
      `每次最多上传 ${MAX_FILES_PER_UPLOAD} 张图片`,
      400
    )
  }

  const items: ImageItem[] = []
  const errors: UploadErrorItem[] = []

  for (const part of fileParts) {
    const originalName = part.filename ?? 'image'
    const bytes = new Uint8Array(part.data)
    const declaredMime = part.type?.toLowerCase() ?? ''
    const detectedMime = detectMimeFromSignature(bytes)

    if (detectedMime && !mimeMatchesDeclared(declaredMime, detectedMime)) {
      errors.push({
        name: originalName,
        error: {
          code: 'INVALID_FILE_SIGNATURE',
          message: '文件类型与内容不匹配'
        }
      })
      continue
    }

    if (declaredMime && isAllowedMimeType(declaredMime) && !detectedMime) {
      errors.push({
        name: originalName,
        error: {
          code: 'INVALID_FILE_SIGNATURE',
          message: '无法识别的图片格式'
        }
      })
      continue
    }

    const result = await processSingleImageUpload(event, {
      bytes,
      filename: part.filename
    })

    if ('error' in result) {
      errors.push(result.error)
    } else {
      items.push(result.item)
    }
  }

  const response: UploadResponse = {
    success: items.length > 0,
    items,
    errors
  }

  if (!items.length && errors.length) {
    setResponseStatus(event, 400)
  }

  return response
})

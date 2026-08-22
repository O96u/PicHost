import { readMultipartFormData } from 'h3'
import { verifyUploadTokenValue } from '../../utils/access'
import {
  detectMimeFromSignature,
  isAllowedMimeType
} from '../../utils/file-signature'
import {
  mimeMatchesDeclared,
  processSingleImageUpload
} from '../../utils/process-image-upload'
import { getApiUploadToken } from '../../utils/env'

/** EasyImages 2.0 兼容上传（Twikoo IMAGE_CDN=easyimage） */
export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'application/json; charset=utf-8')

  const config = useRuntimeConfig(event)
  const devBypass = import.meta.dev && config.devBypassAccess

  const formData = await readMultipartFormData(event)
  if (!formData?.length) {
    return easyImageError(400, '未收到上传数据')
  }

  const tokenField = formData.find(part => part.name === 'token')
  const token = tokenField?.data?.length
    ? new TextDecoder().decode(tokenField.data).trim()
    : ''

  if (!devBypass) {
    if (!getApiUploadToken(event)) {
      return easyImageError(500, '服务端未配置 API_UPLOAD_TOKEN')
    }
    if (!verifyUploadTokenValue(event, token)) {
      return easyImageError(401, 'token 错误或无效')
    }
  }

  const imagePart = formData.find(
    part => part.name === 'image' && part.data?.length
  )
  if (!imagePart?.data?.length) {
    return easyImageError(400, '未收到图片文件')
  }

  const bytes = new Uint8Array(imagePart.data)
  const declaredMime = imagePart.type?.toLowerCase() ?? ''
  const detectedMime = detectMimeFromSignature(bytes)

  if (detectedMime && !mimeMatchesDeclared(declaredMime, detectedMime)) {
    return easyImageError(415, '文件类型与内容不匹配')
  }
  if (declaredMime && isAllowedMimeType(declaredMime) && !detectedMime) {
    return easyImageError(415, '无法识别的图片格式')
  }

  // Twikoo 评论图片单独存放在 twikoo/ 目录下
  const result = await processSingleImageUpload(event, {
    bytes,
    filename: imagePart.filename,
    prefix: 'twikoo',
    source: 'twikoo'
  })

  if ('error' in result) {
    const code = easyImageCodeFromError(result.error.error.code)
    return easyImageError(code, result.error.error.message)
  }

  const { item } = result
  return {
    result: 'success',
    code: 200,
    url: item.url,
    srcName: item.originalName,
    thumb: item.url,
    del: ''
  }
})

function easyImageError(code: number, message: string) {
  return {
    result: 'failed',
    code,
    message
  }
}

function easyImageCodeFromError(code: string): number {
  switch (code) {
    case 'FILE_TOO_LARGE':
      return 413
    case 'UNSUPPORTED_FILE_TYPE':
    case 'INVALID_FILE_SIGNATURE':
      return 415
    case 'UPLOAD_FAILED':
      return 500
    default:
      return 400
  }
}

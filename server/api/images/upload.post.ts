import { readMultipartFormData } from 'h3'
import type { UploadResponse, UploadErrorItem, ImageItem } from '~/types/image'
import { requireUploadAuth, verifyApiUploadToken, getUploadUserId, canUseCustomUploadFolder } from '../../utils/access'
import { MAX_FILES_PER_UPLOAD } from '../../utils/constants'
import {
  detectMimeFromSignature,
  isAllowedMimeType
} from '../../utils/file-signature'
import {
  mimeMatchesDeclared,
  processSingleImageUpload
} from '../../utils/process-image-upload'
import { createApiError } from '../../utils/api-error'
import {
  DEFAULT_FOLDER,
  isValidFolderName,
  normalizeFolderName
} from '../../utils/image-key'

function readFormText(
  formData: { name?: string, data?: Buffer | Uint8Array }[],
  name: string
): string {
  const part = formData.find(item => item.name === name && item.data?.length)
  if (!part?.data) return ''
  return new TextDecoder().decode(part.data).trim()
}

export default defineEventHandler(async (event) => {
  await requireUploadAuth(event)

  const source = verifyApiUploadToken(event) ? 'api' : 'web'
  const uploadUserId = await getUploadUserId(event)

  const formData = await readMultipartFormData(event)
  if (!formData?.length) {
    createApiError(event, 'INVALID_REQUEST', '未收到上传文件', 400)
  }

  const query = getQuery(event)
  const folderFromForm = readFormText(formData, 'folder') || readFormText(formData, 'type')
  const folderFromQuery = typeof query.folder === 'string'
    ? query.folder
    : typeof query.type === 'string'
      ? query.type
      : ''
  const requestedFolder = normalizeFolderName(folderFromForm || folderFromQuery)
  const canCustomFolder = await canUseCustomUploadFolder(event)

  if (!canCustomFolder && requestedFolder && requestedFolder !== DEFAULT_FOLDER) {
    createApiError(
      event,
      'FORBIDDEN',
      '当前账号不支持自定义上传目录',
      403
    )
  }

  const folder = canCustomFolder ? requestedFolder : ''

  if (folder && !isValidFolderName(folder)) {
    createApiError(
      event,
      'INVALID_REQUEST',
      '无效的 folder：仅允许字母数字开头，可含 - _，最长 32 位，且不能是 api/stats 等保留名',
      400
    )
  }

  // 兼容 image / file / files 字段名（图床脚本 / 通用客户端 / 网页多图）
  const fileParts = formData.filter(
    part => (part.name === 'image' || part.name === 'file' || part.name === 'files')
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
      filename: part.filename,
      source,
      prefix: folder || DEFAULT_FOLDER,
      userId: uploadUserId
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

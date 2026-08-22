import type { H3Event } from 'h3'
import type { ImageItem } from '~/types/image'
import type { AllowedMimeType } from './constants'
import type { StoredImage } from './storage'
import { getImageBaseUrl } from './env'

export function resolveImageOwner(
  userId: number | null | undefined,
  ownerMap?: Map<number, string>
): ImageItem['owner'] | undefined {
  if (!ownerMap) return undefined

  if (userId == null) {
    return { userId: null, username: '系统/API' }
  }

  return {
    userId,
    username: ownerMap.get(userId) ?? `用户 #${userId}`
  }
}

export function mapStoredImageToItem(
  event: H3Event,
  stored: StoredImage,
  options?: { ownerMap?: Map<number, string> }
): ImageItem {
  const item = buildImageItem({
    key: stored.key,
    baseUrl: getImageBaseUrl(event),
    originalName: stored.originalName,
    contentType: stored.contentType,
    size: stored.size,
    uploadedAt: stored.uploadedAt
  })

  const owner = resolveImageOwner(stored.userId, options?.ownerMap)
  if (owner) {
    return { ...item, owner }
  }

  return item
}

export function buildImageUrl(baseUrl: string, key: string): string {
  const normalizedBase = baseUrl.replace(/\/$/, '')
  return `${normalizedBase}/${key}`
}

export function buildMarkdown(url: string, alt: string): string {
  const safeAlt = alt.replace(/[[\]]/g, '')
  return `![${safeAlt}](${url})`
}

export function buildHtml(url: string, alt: string): string {
  const safeAlt = escapeHtml(alt)
  const safeUrl = escapeHtml(url)
  return `<img src="${safeUrl}" alt="${safeAlt}">`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function buildImageItem(input: {
  key: string
  baseUrl: string
  originalName: string
  contentType: AllowedMimeType | string
  size: number
  uploadedAt: string
}) {
  const url = buildImageUrl(input.baseUrl, input.key)
  const alt = sanitizeOriginalName(input.originalName)

  return {
    key: input.key,
    url,
    originalName: alt,
    contentType: input.contentType,
    size: input.size,
    uploadedAt: input.uploadedAt,
    markdown: buildMarkdown(url, alt),
    html: buildHtml(url, alt)
  }
}

export function sanitizeOriginalName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? 'image'
  return base.replace(/[^\w.\-()]/g, '_').slice(0, 200) || 'image'
}

import type { H3Event } from 'h3'
import { IMAGE_CACHE_CONTROL } from './constants'
import { getAllowedRefererHostsRaw } from './env'
import { validateImageKey } from './image-key'
import { buildPublicImageUrl } from './image-response'
import { createImageStream, headImage } from './storage'
import { getBackendRowForKey } from './storage/resolver'

/**
 * 图片直链处理（/{type}/YYYY/MM/file）
 *
 * 防盗链说明：
 * - Referer 可以缺失（直接访问、部分客户端），缺失时放行
 * - Referer 可被非浏览器客户端伪造，本方案防普通网站盗链，不是身份认证
 */

const ERROR_CACHE_CONTROL = 'public, max-age=60'

function getAllowedHosts(event: H3Event): Set<string> {
  const hosts = new Set<string>()

  const raw = getAllowedRefererHostsRaw(event)
  for (const part of raw.split(',')) {
    const trimmed = part.trim().toLowerCase()
    if (trimmed) hosts.add(trimmed)
  }

  const requestUrl = getRequestURL(event, {
    xForwardedHost: true,
    xForwardedProto: true
  })
  hosts.add(requestUrl.hostname.toLowerCase())

  return hosts
}

export function isRefererAllowed(referer: string | null, allowedHosts: Set<string>): boolean {
  if (!referer) return true

  try {
    const hostname = new URL(referer).hostname.toLowerCase()
    return allowedHosts.has(hostname)
  } catch {
    return false
  }
}

function parseRangeHeader(
  rangeHeader: string | undefined,
  size: number
): { start: number, end: number } | null {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) return null

  const [startStr, endStr] = rangeHeader.slice(6).split('-', 2)
  const start = startStr ? Number(startStr) : NaN
  const end = endStr ? Number(endStr) : size - 1

  if (!Number.isFinite(start) || start < 0 || start >= size) return null

  const safeEnd = Number.isFinite(end) ? Math.min(end, size - 1) : size - 1
  if (safeEnd < start) return null

  return { start, end: safeEnd }
}

export function requestPathToImageKey(pathname: string): string | null {
  const key = decodeURIComponent(pathname).replace(/^\/+/, '')
  return validateImageKey(key) ? key : null
}

export async function serveImageByKey(event: H3Event, key: string) {
  const referer = getHeader(event, 'referer') ?? null
  if (!isRefererAllowed(referer, getAllowedHosts(event))) {
    setHeader(event, 'Cache-Control', ERROR_CACHE_CONTROL)
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: hotlink protection'
    })
  }

  const stored = await headImage(key)
  if (!stored) {
    setHeader(event, 'Cache-Control', ERROR_CACHE_CONTROL)
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const backendRow = await getBackendRowForKey(key)
  if (backendRow.serving_mode === 'public' && backendRow.public_url) {
    const publicUrl = buildPublicImageUrl(backendRow, key)
    return sendRedirect(event, publicUrl, 302)
  }

  const etag = `"${stored.size}-${Math.round(stored.mtimeMs)}"`

  setHeader(event, 'ETag', etag)
  setHeader(event, 'Cache-Control', IMAGE_CACHE_CONTROL)
  setHeader(event, 'Accept-Ranges', 'bytes')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Content-Type', stored.contentType)

  if (stored.contentType === 'image/svg+xml') {
    setHeader(
      event,
      'Content-Security-Policy',
      'default-src \'none\'; style-src \'unsafe-inline\''
    )
  }

  const ifNoneMatch = getHeader(event, 'if-none-match')
  if (ifNoneMatch && ifNoneMatch === etag) {
    setResponseStatus(event, 304)
    return null
  }

  const method = getMethod(event)
  if (method === 'HEAD') {
    setHeader(event, 'Content-Length', stored.size)
    return null
  }

  const range = parseRangeHeader(getHeader(event, 'range'), stored.size)

  if (range) {
    setResponseStatus(event, 206)
    setHeader(event, 'Content-Range', `bytes ${range.start}-${range.end}/${stored.size}`)
    setHeader(event, 'Content-Length', range.end - range.start + 1)
    return sendStream(event, await createImageStream(key, range))
  }

  setHeader(event, 'Content-Length', stored.size)
  return sendStream(event, await createImageStream(key))
}

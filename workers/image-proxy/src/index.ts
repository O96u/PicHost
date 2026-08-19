/**
 * 图片访问 Worker
 *
 * 防盗链说明：
 * - Referer 可以缺失（直接访问、部分客户端）
 * - Referer 可被非浏览器客户端伪造
 * - 本方案用于防普通网站盗链，不是身份认证
 * - 真正私密图片应使用签名 URL 或 Cloudflare Access
 */

export interface Env {
  IMAGES: R2Bucket
  ALLOWED_REFERER_HOSTS?: string
  PUBLIC_IMAGE_ORIGIN?: string
  INTERNAL_PURGE_TOKEN?: string
}

const IMAGE_CACHE_CONTROL
  = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400'
const ERROR_CACHE_CONTROL = 'public, max-age=60'
const NOT_FOUND_CACHE_CONTROL = 'public, max-age=60'
const MAX_PURGE_KEYS = 100

/** Cloudflare Workers 运行时提供 caches.default */
function getDefaultCache(): Cache {
  return (caches as CacheStorage & { default: Cache }).default
}

function parseAllowedHosts(raw: string, imageOrigin: string): Set<string> {
  const hosts = new Set<string>()

  for (const part of raw.split(',')) {
    const trimmed = part.trim().toLowerCase()
    if (trimmed) hosts.add(trimmed)
  }

  try {
    const imageHost = new URL(imageOrigin).hostname.toLowerCase()
    hosts.add(imageHost)
  } catch {
    // ignore invalid origin
  }

  return hosts
}

function validateImageKey(key: string): boolean {
  if (!key || key.startsWith('/') || key.includes('..')) return false
  if (!key.startsWith('images/')) return false
  if (key.includes('//')) return false
  return true
}

function isRefererAllowed(referer: string | null, allowedHosts: Set<string>): boolean {
  if (!referer) return true

  try {
    const hostname = new URL(referer).hostname.toLowerCase()
    return allowedHosts.has(hostname)
  } catch {
    return false
  }
}

function keyFromPathname(pathname: string): string | null {
  const decoded = decodeURIComponent(pathname).replace(/^\/+/, '')
  if (!decoded || decoded.includes('?')) return null
  return validateImageKey(decoded) ? decoded : null
}

function parseRangeHeader(
  rangeHeader: string | null,
  size: number
): { offset: number, length: number } | null {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) return null

  const [startStr, endStr] = rangeHeader.slice(6).split('-', 2)
  const start = startStr ? Number(startStr) : NaN
  const end = endStr ? Number(endStr) : size - 1

  if (!Number.isFinite(start) || start < 0 || start >= size) return null

  const safeEnd = Number.isFinite(end) ? Math.min(end, size - 1) : size - 1
  if (safeEnd < start) return null

  return {
    offset: start,
    length: safeEnd - start + 1
  }
}

async function handleImageRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  key: string
): Promise<Response> {
  const allowedHosts = parseAllowedHosts(
    env.ALLOWED_REFERER_HOSTS ?? '',
    env.PUBLIC_IMAGE_ORIGIN ?? request.url
  )

  if (!isRefererAllowed(request.headers.get('Referer'), allowedHosts)) {
    return new Response('Forbidden: hotlink protection', {
      status: 403,
      headers: { 'Cache-Control': ERROR_CACHE_CONTROL }
    })
  }

  const isHead = request.method === 'HEAD'
  const rangeHeader = request.headers.get('Range')
  const hasRange = Boolean(rangeHeader)
  const useCache = request.method === 'GET' && !hasRange

  if (useCache) {
    const cached = await getDefaultCache().match(request)
    if (cached) return cached
  }

  const head = await env.IMAGES.head(key)
  if (!head) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Cache-Control': NOT_FOUND_CACHE_CONTROL }
    })
  }

  const etag = head.etag ?? `"${head.key}-${head.size}"`
  const ifNoneMatch = request.headers.get('If-None-Match')

  if (ifNoneMatch && ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        'ETag': etag,
        'Cache-Control': IMAGE_CACHE_CONTROL
      }
    })
  }

  if (isHead) {
    return new Response(null, {
      status: 200,
      headers: buildObjectHeaders(head, etag)
    })
  }

  const range = parseRangeHeader(rangeHeader, head.size)

  if (range) {
    const object = await env.IMAGES.get(key, {
      range: { offset: range.offset, length: range.length }
    })

    if (!object) {
      return new Response('Not Found', {
        status: 404,
        headers: { 'Cache-Control': NOT_FOUND_CACHE_CONTROL }
      })
    }

    const headers = buildObjectHeaders(object, etag)
    headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${head.size}`)
    headers.set('Content-Length', String(range.length))
    headers.set('Accept-Ranges', 'bytes')

    return new Response(object.body, {
      status: 206,
      headers
    })
  }

  const object = await env.IMAGES.get(key)
  if (!object) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Cache-Control': NOT_FOUND_CACHE_CONTROL }
    })
  }

  const headers = buildObjectHeaders(object, etag)
  const response = new Response(object.body, { status: 200, headers })

  if (useCache) {
    ctx.waitUntil(getDefaultCache().put(request, response.clone()))
  }

  return response
}

function buildObjectHeaders(
  object: R2Object | R2ObjectBody,
  etag: string
): Headers {
  const headers = new Headers()
  const contentType = object.httpMetadata?.contentType ?? 'application/octet-stream'

  headers.set('Content-Type', contentType)
  headers.set('ETag', etag)
  headers.set('Cache-Control', IMAGE_CACHE_CONTROL)
  headers.set('Accept-Ranges', 'bytes')
  headers.set('X-Content-Type-Options', 'nosniff')

  if ('size' in object) {
    headers.set('Content-Length', String(object.size))
  }

  return headers
}

async function handlePurge(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get('Authorization')
  const token = env.INTERNAL_PURGE_TOKEN

  if (!token || auth !== `Bearer ${token}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: { keys?: string[] }
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const keys = body.keys
  if (!Array.isArray(keys) || !keys.length) {
    return new Response('Missing keys', { status: 400 })
  }

  if (keys.length > MAX_PURGE_KEYS) {
    return new Response('Too many keys', { status: 400 })
  }

  const origin = env.PUBLIC_IMAGE_ORIGIN?.replace(/\/$/, '')
  if (!origin) {
    return new Response('PUBLIC_IMAGE_ORIGIN not configured', { status: 500 })
  }

  const failed: string[] = []

  for (const key of keys) {
    if (!validateImageKey(key)) {
      failed.push(key)
      continue
    }

    const url = `${origin}/${key}`
    const cache = getDefaultCache()
    await cache.delete(new Request(url, { method: 'GET' }))
    await cache.delete(new Request(url, { method: 'HEAD' }))
    // Cache API 删除能力可能与全局 CDN 缓存存在差异，见 README
  }

  return Response.json({ success: true, failed })
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/__internal/purge') {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 })
      }
      return handlePurge(request, env)
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          Allow: 'GET, HEAD, OPTIONS'
        }
      })
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    const key = keyFromPathname(url.pathname)
    if (!key) {
      return new Response('Not Found', {
        status: 404,
        headers: { 'Cache-Control': NOT_FOUND_CACHE_CONTROL }
      })
    }

    try {
      return await handleImageRequest(request, env, ctx, key)
    } catch {
      return new Response('Internal Server Error', { status: 500 })
    }
  }
}

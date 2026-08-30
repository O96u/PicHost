import type { H3Event } from 'h3'
import {
  getImageBaseUrlConfigured,
  getSiteBaseUrlConfigured,
  hostnameFromBaseUrl,
  isDomainSeparationActive,
  isHideFolderInUrl
} from './env'
import { requestPathToImageKey } from './serve-image'

const DEV_LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

function getIsolationRequestHost(event: H3Event): string {
  const requestUrl = getRequestURL(event, {
    xForwardedHost: true,
    xForwardedProto: true
  })
  return requestUrl.hostname.toLowerCase()
}

function isDevLocalHost(host: string): boolean {
  return process.env.NODE_ENV === 'development' && DEV_LOCAL_HOSTS.has(host)
}

export function getConfiguredSiteHost(event: H3Event): string | null {
  return hostnameFromBaseUrl(getSiteBaseUrlConfigured(event))
}

export function getConfiguredImageHost(event: H3Event): string | null {
  return hostnameFromBaseUrl(getImageBaseUrlConfigured(event))
}

/** 双域名开启时，拒绝未配置的第三 Host（开发环境 localhost 例外） */
export function shouldBlockUnknownHostRequest(
  event: H3Event,
  options?: {
    requestHost?: string
    separationActive?: boolean
    siteHost?: string | null
    imageHost?: string | null
  }
): boolean {
  const separationActive = options?.separationActive ?? isDomainSeparationActive(event)
  if (!separationActive) return false

  const siteHost = options?.siteHost ?? getConfiguredSiteHost(event)
  const imageHost = options?.imageHost ?? getConfiguredImageHost(event)
  if (!siteHost || !imageHost) return false

  const requestHost = (options?.requestHost ?? getIsolationRequestHost(event)).toLowerCase()
  if (requestHost === siteHost || requestHost === imageHost) return false
  if (isDevLocalHost(requestHost)) return false

  return true
}

export function shouldBlockImageHostRequest(
  event: H3Event,
  options?: {
    method?: string
    pathname?: string
    requestHost?: string
    separationActive?: boolean
    imageHost?: string | null
    siteHost?: string | null
    hideFolder?: boolean
  }
): boolean {
  const separationActive = options?.separationActive ?? isDomainSeparationActive(event)
  if (!separationActive) return false

  const imageHost = options?.imageHost ?? getConfiguredImageHost(event)
  if (!imageHost) return false

  const requestHost = (options?.requestHost ?? getIsolationRequestHost(event)).toLowerCase()
  if (requestHost !== imageHost) return false

  const method = (options?.method ?? getMethod(event)).toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') return true

  const pathname = options?.pathname ?? getRequestURL(event, {
    xForwardedHost: true,
    xForwardedProto: true
  }).pathname
  const hideFolder = options?.hideFolder ?? isHideFolderInUrl(event)
  return requestPathToImageKey(pathname, {
    hideFolder
  }) === null
}

/** 网站域禁止直链出图（仅图片域可 GET/HEAD 图片路径） */
export function shouldBlockSiteHostImageRequest(
  event: H3Event,
  options?: {
    method?: string
    pathname?: string
    requestHost?: string
    separationActive?: boolean
    siteHost?: string | null
    hideFolder?: boolean
  }
): boolean {
  const separationActive = options?.separationActive ?? isDomainSeparationActive(event)
  if (!separationActive) return false

  const siteHost = options?.siteHost ?? getConfiguredSiteHost(event)
  if (!siteHost) return false

  const requestHost = (options?.requestHost ?? getIsolationRequestHost(event)).toLowerCase()
  if (requestHost !== siteHost) return false

  const method = (options?.method ?? getMethod(event)).toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') return false

  const pathname = options?.pathname ?? getRequestURL(event, {
    xForwardedHost: true,
    xForwardedProto: true
  }).pathname
  const hideFolder = options?.hideFolder ?? isHideFolderInUrl(event)
  return requestPathToImageKey(pathname, {
    hideFolder
  }) !== null
}

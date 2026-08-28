import type { H3Event } from 'h3'
import {
  getImageBaseUrlConfigured,
  getSiteBaseUrlConfigured,
  hostnameFromBaseUrl,
  isDomainSeparationActive,
  isHideFolderInUrl
} from './env'
import { requestPathToImageKey } from './serve-image'

export function getConfiguredSiteHost(event: H3Event): string | null {
  return hostnameFromBaseUrl(getSiteBaseUrlConfigured(event))
}

export function getConfiguredImageHost(event: H3Event): string | null {
  return hostnameFromBaseUrl(getImageBaseUrlConfigured(event))
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

  const requestUrl = options?.requestHost
    ? null
    : getRequestURL(event, {
        xForwardedHost: true,
        xForwardedProto: true
      })
  const requestHost = (options?.requestHost ?? requestUrl?.hostname ?? '').toLowerCase()
  if (requestHost !== imageHost) return false

  const method = (options?.method ?? getMethod(event)).toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') return true

  const pathname = options?.pathname ?? requestUrl?.pathname ?? ''
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

  const requestUrl = options?.requestHost
    ? null
    : getRequestURL(event, {
        xForwardedHost: true,
        xForwardedProto: true
      })
  const requestHost = (options?.requestHost ?? requestUrl?.hostname ?? '').toLowerCase()
  if (requestHost !== siteHost) return false

  const method = (options?.method ?? getMethod(event)).toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') return false

  const pathname = options?.pathname ?? requestUrl?.pathname ?? ''
  const hideFolder = options?.hideFolder ?? isHideFolderInUrl(event)
  return requestPathToImageKey(pathname, {
    hideFolder
  }) !== null
}

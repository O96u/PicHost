export function hostnameFromBaseUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    return new URL(trimmed).hostname.toLowerCase()
  } catch {
    return null
  }
}

/** 勾选分离且网站域、图片域主机名不同 → 保存后将启用双域名中间件隔离 */
export function willActivateDomainSeparation(
  enabled: boolean,
  siteBaseUrl: string,
  imageBaseUrl: string
): boolean {
  if (!enabled) return false
  const site = siteBaseUrl.trim()
  const image = imageBaseUrl.trim()
  if (!site || !image) return false
  const siteHost = hostnameFromBaseUrl(site)
  const imageHost = hostnameFromBaseUrl(image)
  return Boolean(siteHost && imageHost && siteHost !== imageHost)
}

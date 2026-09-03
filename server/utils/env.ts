import type { H3Event } from 'h3'
import {
  getSetting,
  setSetting,
  SETTINGS_ALLOWED_REFERER_HOSTS,
  SETTINGS_API_UPLOAD_TOKEN,
  SETTINGS_AUTO_DELETE_DAYS,
  SETTINGS_AUTO_DELETE_ENABLED_AT,
  SETTINGS_HIDE_FOLDER_IN_URL,
  SETTINGS_STORAGE_USE_DATE_PATH,
  SETTINGS_IMAGE_BASE_URL,
  SETTINGS_SITE_BASE_URL,
  SETTINGS_WEBP_QUALITY,
  SETTINGS_LOGIN_VERIFICATION_METHOD,
  SETTINGS_TURNSTILE_SITE_KEY,
  SETTINGS_TURNSTILE_SECRET_KEY,
  SETTINGS_CAP_API_ENDPOINT,
  SETTINGS_CAP_SECRET,
  isAllowRegistration
} from './db'

export function getRuntimeEnv(
  event: H3Event,
  envKey: string,
  configKey?: string
): string {
  try {
    const fromProcess = process.env[envKey]
    if (fromProcess) {
      return fromProcess
    }
  } catch {
    // process.env may be unavailable in some runtimes
  }

  if (configKey) {
    const config = useRuntimeConfig(event) as Record<string, unknown>
    const fromConfig = config[configKey]
    if (typeof fromConfig === 'string' && fromConfig.length > 0) {
      return fromConfig
    }
  }

  return ''
}

export function isAdminSecretConfigured(event: H3Event): boolean {
  return getAdminSecret(event).length > 0
}

export function getAdminSecret(event: H3Event): string {
  return getRuntimeEnv(event, 'ADMIN_SECRET', 'adminSecret')
    || getRuntimeEnv(event, 'NUXT_ADMIN_SECRET', 'adminSecret')
}

export type SettingSource = 'env' | 'db' | 'none'

export function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/$/, '')
}

export function normalizeImageBaseUrl(raw: string): string {
  return normalizeBaseUrl(raw)
}

export function normalizeSiteBaseUrl(raw: string): string {
  return normalizeBaseUrl(raw)
}

export function hostnameFromBaseUrl(value: string): string | null {
  if (!value) return null
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return null
  }
}

export function getImageBaseUrlFromEnv(event: H3Event): string {
  return normalizeImageBaseUrl(
    getRuntimeEnv(event, 'IMAGE_BASE_URL', 'imageBaseUrl')
  )
}

export function isImageBaseUrlEnvConfigured(event: H3Event): boolean {
  return getImageBaseUrlFromEnv(event).length > 0
}

export function getImageBaseUrlSource(event: H3Event): SettingSource {
  if (getSetting(SETTINGS_IMAGE_BASE_URL) !== null) return 'db'
  if (isImageBaseUrlEnvConfigured(event)) return 'env'
  return 'none'
}

export function getImageBaseUrlConfigured(event: H3Event): string {
  const dbRaw = getSetting(SETTINGS_IMAGE_BASE_URL)
  if (dbRaw !== null) return normalizeImageBaseUrl(dbRaw)
  return getImageBaseUrlFromEnv(event)
}

export function getSiteBaseUrlFromEnv(event: H3Event): string {
  return normalizeSiteBaseUrl(
    getRuntimeEnv(event, 'SITE_BASE_URL', 'siteBaseUrl')
  )
}

export function isSiteBaseUrlEnvConfigured(event: H3Event): boolean {
  return getSiteBaseUrlFromEnv(event).length > 0
}

export function getSiteBaseUrlSource(event: H3Event): SettingSource {
  if (getSetting(SETTINGS_SITE_BASE_URL) !== null) return 'db'
  if (isSiteBaseUrlEnvConfigured(event)) return 'env'
  return 'none'
}

export function getSiteBaseUrlConfigured(event: H3Event): string {
  const dbRaw = getSetting(SETTINGS_SITE_BASE_URL)
  if (dbRaw !== null) return normalizeSiteBaseUrl(dbRaw)
  return getSiteBaseUrlFromEnv(event)
}

export function getSiteBaseUrl(event: H3Event): string {
  const dbRaw = getSetting(SETTINGS_SITE_BASE_URL)
  if (dbRaw !== null) {
    const configured = normalizeSiteBaseUrl(dbRaw)
    if (configured) return configured
  } else {
    const fromEnv = getSiteBaseUrlFromEnv(event)
    if (fromEnv) return fromEnv
  }

  const requestUrl = getRequestURL(event, {
    xForwardedHost: true,
    xForwardedProto: true
  })
  return requestUrl.origin
}

export function getImageBaseUrl(event: H3Event): string {
  const dbRaw = getSetting(SETTINGS_IMAGE_BASE_URL)
  if (dbRaw !== null) {
    const configured = normalizeImageBaseUrl(dbRaw)
    if (configured) return configured
  } else {
    const fromEnv = getImageBaseUrlFromEnv(event)
    if (fromEnv) return fromEnv
  }

  // 单域名部署：未配置时用当前请求的域名（支持反代转发头）
  const requestUrl = getRequestURL(event, {
    xForwardedHost: true,
    xForwardedProto: true
  })
  return requestUrl.origin
}

export function isHideFolderInUrlFromEnv(): boolean {
  try {
    return process.env.HIDE_FOLDER_IN_URL?.trim().toLowerCase() === 'true'
  } catch {
    return false
  }
}

export function isHideFolderInUrlEnvConfigured(): boolean {
  try {
    const raw = process.env.HIDE_FOLDER_IN_URL?.trim().toLowerCase()
    return raw === 'true' || raw === 'false'
  } catch {
    return false
  }
}

export function getHideFolderInUrlSource(): SettingSource {
  if (getSetting(SETTINGS_HIDE_FOLDER_IN_URL) !== null) return 'db'
  if (isHideFolderInUrlEnvConfigured()) return 'env'
  return 'none'
}

/** 优先级：SQLite settings → 环境变量 → 默认 false */
export function isHideFolderInUrl(_event?: H3Event): boolean {
  const dbRaw = getSetting(SETTINGS_HIDE_FOLDER_IN_URL)
  if (dbRaw !== null) return dbRaw === 'true'
  return isHideFolderInUrlFromEnv()
}

export function isStorageUseDatePathFromEnv(): boolean {
  try {
    const layout = process.env.STORAGE_LAYOUT?.trim().toLowerCase()
    if (layout === 'flat') return false
    if (layout === 'date') return true
    const raw = process.env.STORAGE_USE_DATE_PATH?.trim().toLowerCase()
    if (raw === 'false') return false
    if (raw === 'true') return true
    return true
  } catch {
    return true
  }
}

export function isStorageUseDatePathEnvConfigured(): boolean {
  try {
    const layout = process.env.STORAGE_LAYOUT?.trim().toLowerCase()
    if (layout === 'flat' || layout === 'date') return true
    const raw = process.env.STORAGE_USE_DATE_PATH?.trim().toLowerCase()
    return raw === 'true' || raw === 'false'
  } catch {
    return false
  }
}

export function getStorageUseDatePathSource(): SettingSource {
  if (getSetting(SETTINGS_STORAGE_USE_DATE_PATH) !== null) return 'db'
  if (isStorageUseDatePathEnvConfigured()) return 'env'
  return 'none'
}

/** 优先级：SQLite settings → 环境变量 → 默认 true（按年/月分组） */
export function isStorageUseDatePath(_event?: H3Event): boolean {
  const dbRaw = getSetting(SETTINGS_STORAGE_USE_DATE_PATH)
  if (dbRaw !== null) return dbRaw !== 'false'
  if (isStorageUseDatePathEnvConfigured()) return isStorageUseDatePathFromEnv()
  return true
}

export function getStorageLayout(event?: H3Event): 'date' | 'flat' {
  return isStorageUseDatePath(event) ? 'date' : 'flat'
}

export function getApiUploadTokenFromEnv(event: H3Event): string {
  return (
    getRuntimeEnv(event, 'API_UPLOAD_TOKEN', 'apiUploadToken')
    || getRuntimeEnv(event, 'NUXT_API_UPLOAD_TOKEN', 'apiUploadToken')
  )
}

export function isApiUploadTokenEnvConfigured(event: H3Event): boolean {
  return getApiUploadTokenFromEnv(event).length > 0
}

export type ApiUploadTokenSource = SettingSource

export function getApiUploadTokenSource(event: H3Event): ApiUploadTokenSource {
  if (getApiUploadTokenFromEnv(event)) return 'env'
  if (getSetting(SETTINGS_API_UPLOAD_TOKEN)) return 'db'
  return 'none'
}

export function isApiUploadTokenConfigured(event: H3Event): boolean {
  return getApiUploadToken(event).length > 0
}

/** 优先级：环境变量 → SQLite settings → runtimeConfig */
export function getApiUploadToken(event: H3Event): string {
  const fromEnv = getApiUploadTokenFromEnv(event)
  if (fromEnv) return fromEnv

  const fromDb = getSetting(SETTINGS_API_UPLOAD_TOKEN)
  if (fromDb) return fromDb

  return ''
}

export const LOGIN_VERIFICATION_METHODS = ['slider', 'turnstile', 'cap'] as const
export type LoginVerificationMethod = typeof LOGIN_VERIFICATION_METHODS[number]

const DEFAULT_LOGIN_VERIFICATION_METHOD: LoginVerificationMethod = 'slider'

export function parseLoginVerificationMethod(raw: string): LoginVerificationMethod | null {
  if (raw === 'slider' || raw === 'turnstile' || raw === 'cap') return raw
  return null
}

export function getLoginVerificationMethod(_event?: H3Event): LoginVerificationMethod {
  const fromDb = getSetting(SETTINGS_LOGIN_VERIFICATION_METHOD)
  if (fromDb !== null) {
    return parseLoginVerificationMethod(fromDb) ?? DEFAULT_LOGIN_VERIFICATION_METHOD
  }
  return DEFAULT_LOGIN_VERIFICATION_METHOD
}

export function getTurnstileSiteKeyConfigured(_event?: H3Event): string {
  return getSetting(SETTINGS_TURNSTILE_SITE_KEY)?.trim() ?? ''
}

export function getTurnstileSecretKey(_event?: H3Event): string {
  return getSetting(SETTINGS_TURNSTILE_SECRET_KEY)?.trim() ?? ''
}

export function normalizeCapApiEndpoint(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`
}

export function getCapApiEndpointConfigured(_event?: H3Event): string {
  const fromDb = getSetting(SETTINGS_CAP_API_ENDPOINT)
  return fromDb ? normalizeCapApiEndpoint(fromDb) : ''
}

export function getCapSecret(_event?: H3Event): string {
  return getSetting(SETTINGS_CAP_SECRET)?.trim() ?? ''
}

export interface LoginVerificationPublicConfig {
  method: LoginVerificationMethod
  turnstileSiteKey?: string
  capApiEndpoint?: string
}

export function getLoginVerificationPublicConfig(event: H3Event): LoginVerificationPublicConfig {
  const method = getLoginVerificationMethod(event)
  const config: LoginVerificationPublicConfig = { method }
  if (method === 'turnstile') {
    const siteKey = getTurnstileSiteKeyConfigured(event)
    if (siteKey) config.turnstileSiteKey = siteKey
  }
  if (method === 'cap') {
    const endpoint = getCapApiEndpointConfigured(event)
    if (endpoint) config.capApiEndpoint = endpoint
  }
  return config
}

export function validateLoginVerificationSettings(
  method: LoginVerificationMethod,
  turnstileSiteKey: string,
  turnstileSecretKey: string,
  capApiEndpoint: string,
  capSecret: string
): string | null {
  if (method === 'turnstile') {
    if (!turnstileSiteKey.trim()) {
      return '请配置 Turnstile Site Key'
    }
    if (!turnstileSecretKey.trim()) {
      return '请配置 Turnstile Secret Key'
    }
  }
  if (method === 'cap') {
    if (!normalizeCapApiEndpoint(capApiEndpoint)) {
      return '请配置 Cap API Endpoint'
    }
    if (!capSecret.trim()) {
      return '请配置 Cap Secret Key'
    }
  }
  return null
}

export const DEFAULT_WEBP_QUALITY = 80

export type WebpQualitySource = 'env' | 'db' | 'default'

export function parseWebpQuality(raw: string): number | null {
  const value = Number(raw)
  if (Number.isFinite(value) && value >= 1 && value <= 100) {
    return Math.round(value)
  }
  return null
}

export function getWebpQualityFromEnv(): string {
  try {
    return process.env.WEBP_QUALITY?.trim() ?? ''
  } catch {
    return ''
  }
}

export function isWebpQualityEnvConfigured(): boolean {
  return parseWebpQuality(getWebpQualityFromEnv()) !== null
}

export function getWebpQualitySource(): WebpQualitySource {
  if (getSetting(SETTINGS_WEBP_QUALITY) !== null) return 'db'
  if (isWebpQualityEnvConfigured()) return 'env'
  return 'default'
}

/** 优先级：SQLite settings → 环境变量 → 默认 80 */
export function getWebpQuality(_event?: H3Event): number {
  const dbRaw = getSetting(SETTINGS_WEBP_QUALITY)
  if (dbRaw !== null) {
    const fromDb = parseWebpQuality(dbRaw)
    if (fromDb !== null) return fromDb
  }

  const fromEnv = parseWebpQuality(getWebpQualityFromEnv())
  if (fromEnv !== null) return fromEnv

  return DEFAULT_WEBP_QUALITY
}

export function normalizeRefererHosts(raw: string): string {
  const seen = new Set<string>()
  const hosts: string[] = []
  for (const part of raw.split(',')) {
    const host = part.trim().toLowerCase()
    if (!host || seen.has(host)) continue
    seen.add(host)
    hosts.push(host)
  }
  return hosts.join(',')
}

export function getRefererHostsFromEnv(): string {
  try {
    return normalizeRefererHosts(process.env.ALLOWED_REFERER_HOSTS ?? '')
  } catch {
    return ''
  }
}

export function isRefererEnvConfigured(): boolean {
  return getRefererHostsFromEnv().length > 0
}

export function getRefererSource(): SettingSource {
  if (getSetting(SETTINGS_ALLOWED_REFERER_HOSTS) !== null) return 'db'
  if (isRefererEnvConfigured()) return 'env'
  return 'none'
}

/** 优先级：SQLite settings → 环境变量；均可不配置 */
export function getAllowedRefererHostsRaw(_event?: H3Event): string {
  const dbRaw = getSetting(SETTINGS_ALLOWED_REFERER_HOSTS)
  if (dbRaw !== null) return normalizeRefererHosts(dbRaw)
  return getRefererHostsFromEnv()
}

export function isRefererConfigured(event?: H3Event): boolean {
  return getAllowedRefererHostsRaw(event).length > 0
}

export const DEFAULT_AUTO_DELETE_DAYS = 0
export const MAX_AUTO_DELETE_DAYS = 3650

export type AutoDeleteDaysSource = 'env' | 'db' | 'default'

export function parseAutoDeleteDays(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    return null
  }
  if (value > MAX_AUTO_DELETE_DAYS) {
    return null
  }
  return value
}

export function getAutoDeleteDaysFromEnv(): string {
  try {
    return process.env.AUTO_DELETE_DAYS?.trim() ?? ''
  } catch {
    return ''
  }
}

export function isAutoDeleteDaysEnvConfigured(): boolean {
  return parseAutoDeleteDays(getAutoDeleteDaysFromEnv()) !== null
}

export function getAutoDeleteDaysSource(): AutoDeleteDaysSource {
  if (getSetting(SETTINGS_AUTO_DELETE_DAYS) !== null) return 'db'
  if (isAutoDeleteDaysEnvConfigured()) return 'env'
  return 'default'
}

/** 优先级：SQLite settings → 环境变量 → 默认 0（关闭） */
export function getAutoDeleteDays(_event?: H3Event): number {
  const dbRaw = getSetting(SETTINGS_AUTO_DELETE_DAYS)
  if (dbRaw !== null) {
    const fromDb = parseAutoDeleteDays(dbRaw)
    if (fromDb !== null) return fromDb
  }

  const fromEnv = parseAutoDeleteDays(getAutoDeleteDaysFromEnv())
  if (fromEnv !== null) return fromEnv

  return DEFAULT_AUTO_DELETE_DAYS
}

export function getGlobalAutoDeleteEnabledAt(): string | null {
  const raw = getSetting(SETTINGS_AUTO_DELETE_ENABLED_AT)
  return raw?.trim() ? raw : null
}

export function getGlobalAutoDeletePolicy(): { days: number, enabledAt: string | null } {
  return {
    days: getAutoDeleteDays(),
    enabledAt: getGlobalAutoDeleteEnabledAt()
  }
}

export function setGlobalAutoDeletePolicy(days: number): void {
  const dbRaw = getSetting(SETTINGS_AUTO_DELETE_DAYS)
  const currentDays = dbRaw !== null ? (parseAutoDeleteDays(dbRaw) ?? 0) : 0
  const currentEnabledAt = getGlobalAutoDeleteEnabledAt()
  const now = new Date().toISOString()
  let enabledAt = currentEnabledAt

  if (days > 0 && currentDays === 0) {
    enabledAt = now
  } else if (days === 0) {
    enabledAt = null
  }

  setSetting(SETTINGS_AUTO_DELETE_DAYS, String(days))
  setSetting(SETTINGS_AUTO_DELETE_ENABLED_AT, enabledAt ?? '')
}

export function isValidRefererHost(host: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i.test(host)
}

export function isValidBaseUrl(value: string): boolean {
  if (!value) return true
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function isValidImageBaseUrl(value: string): boolean {
  return isValidBaseUrl(value)
}

export function isValidSiteBaseUrl(value: string): boolean {
  return isValidBaseUrl(value)
}

export function validateDomainSeparationPair(
  siteBaseUrl: string,
  imageBaseUrl: string
): string | null {
  if (!siteBaseUrl || !imageBaseUrl) {
    return '启用域名分离时需同时填写网站域名与图片域名'
  }
  if (!isValidSiteBaseUrl(siteBaseUrl) || !isValidImageBaseUrl(imageBaseUrl)) {
    return '域名需为 http(s) 地址，且末尾不加 /'
  }
  const siteHost = hostnameFromBaseUrl(siteBaseUrl)
  const imageHost = hostnameFromBaseUrl(imageBaseUrl)
  if (!siteHost || !imageHost) {
    return '域名格式无效'
  }
  if (siteHost === imageHost) {
    return '网站域名与图片域名不能使用相同主机名'
  }
  return null
}

export type RequestHostRole = 'site' | 'image' | 'unknown' | 'single'

export function getIsolationRequestHost(event: H3Event): string {
  const requestUrl = getRequestURL(event, {
    xForwardedHost: true,
    xForwardedProto: true
  })
  return requestUrl.hostname.toLowerCase()
}

export function validateSettingsDomainPatch(input: {
  existingSite: string
  existingImage: string
  nextSite: string
  nextImage: string
  wantSeparation: boolean | null
  siteBaseUrlProvided: boolean
}): string | null {
  const {
    existingSite,
    existingImage,
    nextSite,
    nextImage,
    wantSeparation,
    siteBaseUrlProvided
  } = input

  const hadDualDomain = (() => {
    const siteHost = hostnameFromBaseUrl(existingSite)
    const imageHost = hostnameFromBaseUrl(existingImage)
    return Boolean(siteHost && imageHost && siteHost !== imageHost)
  })()

  if (wantSeparation === true) {
    if (!nextSite || !nextImage) {
      return '启用域名分离时需同时填写网站域名与图片域名'
    }
    return validateDomainSeparationPair(nextSite, nextImage)
  }

  if (wantSeparation === false) {
    return null
  }

  if (siteBaseUrlProvided && !nextSite && existingSite && hadDualDomain) {
    return '已启用域名分离时不能单独清空管理域名，请显式关闭域名分离'
  }

  if (nextSite && nextImage) {
    return validateDomainSeparationPair(nextSite, nextImage)
  }

  return null
}

export function getRequestRuntime(event: H3Event) {
  const requestUrl = getRequestURL(event, {
    xForwardedHost: true,
    xForwardedProto: true
  })
  const currentHost = requestUrl.hostname.toLowerCase()
  const currentOrigin = requestUrl.origin

  if (!isDomainSeparationActive(event)) {
    return {
      currentOrigin,
      currentHost,
      hostRole: 'single' as const
    }
  }

  const siteHost = hostnameFromBaseUrl(getSiteBaseUrlConfigured(event))
  const imageHost = hostnameFromBaseUrl(getImageBaseUrlConfigured(event))

  let hostRole: RequestHostRole = 'unknown'
  if (currentHost === siteHost) {
    hostRole = 'site'
  } else if (currentHost === imageHost) {
    hostRole = 'image'
  }

  return {
    currentOrigin,
    currentHost,
    hostRole
  }
}

export function getSettingsPayload(event: H3Event) {
  const config = useRuntimeConfig(event)
  const webpQuality = getWebpQuality(event)
  const allowedRefererHosts = getAllowedRefererHostsRaw(event)
  const siteBaseUrlConfigured = getSiteBaseUrlConfigured(event)
  const imageBaseUrlConfigured = getImageBaseUrlConfigured(event)
  const effectiveSiteBaseUrl = getSiteBaseUrl(event)
  const effectiveImageBaseUrl = getImageBaseUrl(event)
  const autoDeleteDays = getAutoDeleteDays(event)
  const appVersion = config.appVersion as string
  const domainSeparation = isDomainSeparationActive(event)
  const hideFolderInUrl = isHideFolderInUrl(event)
  const hideFolderInUrlSource = getHideFolderInUrlSource()
  const storageUseDatePath = isStorageUseDatePath(event)
  const storageUseDatePathSource = getStorageUseDatePathSource()

  return {
    apiUploadToken: getApiUploadToken(event),
    tokenSource: getApiUploadTokenSource(event),
    envTokenOverride: isApiUploadTokenEnvConfigured(event),
    webpQuality,
    webpQualitySource: getWebpQualitySource(),
    allowedRefererHosts,
    refererSource: getRefererSource(),
    refererEnvFallback: getRefererHostsFromEnv(),
    siteBaseUrl: siteBaseUrlConfigured,
    siteBaseUrlConfigured,
    siteBaseUrlSource: getSiteBaseUrlSource(event),
    imageBaseUrl: imageBaseUrlConfigured,
    imageBaseUrlConfigured,
    imageBaseUrlSource: getImageBaseUrlSource(event),
    effectiveSiteBaseUrl,
    effectiveImageBaseUrl,
    domainSeparation,
    runtime: getRequestRuntime(event),
    hideFolderInUrl,
    hideFolderInUrlSource,
    storageUseDatePath,
    storageUseDatePathSource,
    autoDeleteDays,
    autoDeleteDaysSource: getAutoDeleteDaysSource(),
    autoDeleteEnvFallback: parseAutoDeleteDays(getAutoDeleteDaysFromEnv()) ?? 0,
    allowRegistration: isAllowRegistration(),
    loginVerificationMethod: getLoginVerificationMethod(event),
    turnstileSiteKey: getTurnstileSiteKeyConfigured(event),
    turnstileSecretKey: getTurnstileSecretKey(event),
    capApiEndpoint: getCapApiEndpointConfigured(event),
    capSecret: getCapSecret(event),
    appVersion,
    env: {
      webpQuality,
      refererConfigured: allowedRefererHosts.length > 0,
      siteBaseUrl: effectiveSiteBaseUrl,
      imageBaseUrl: effectiveImageBaseUrl,
      hideFolderInUrl,
      appVersion
    }
  }
}

export function isDomainSeparationActive(event: H3Event): boolean {
  const siteHost = hostnameFromBaseUrl(getSiteBaseUrlConfigured(event))
  const imageHost = hostnameFromBaseUrl(getImageBaseUrlConfigured(event))
  return Boolean(siteHost && imageHost && siteHost !== imageHost)
}

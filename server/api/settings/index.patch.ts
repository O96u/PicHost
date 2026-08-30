import { requireAdminAuth } from '../../utils/access'
import { createApiError } from '../../utils/api-error'
import {
  getSetting,
  setSetting,
  SETTINGS_ALLOWED_REFERER_HOSTS,
  SETTINGS_HIDE_FOLDER_IN_URL,
  SETTINGS_STORAGE_USE_DATE_PATH,
  SETTINGS_IMAGE_BASE_URL,
  SETTINGS_SITE_BASE_URL,
  SETTINGS_WEBP_QUALITY,
  setAllowRegistration
} from '../../utils/db'
import {
  getSettingsPayload,
  isValidImageBaseUrl,
  isValidRefererHost,
  isValidSiteBaseUrl,
  MAX_AUTO_DELETE_DAYS,
  normalizeImageBaseUrl,
  normalizeRefererHosts,
  normalizeSiteBaseUrl,
  parseAutoDeleteDays,
  parseWebpQuality,
  setGlobalAutoDeletePolicy,
  validateSettingsDomainPatch
} from '../../utils/env'

interface SettingsPatchBody {
  webpQuality?: unknown
  allowedRefererHosts?: unknown
  siteBaseUrl?: unknown
  imageBaseUrl?: unknown
  domainSeparation?: unknown
  hideFolderInUrl?: unknown
  storageUseDatePath?: unknown
  autoDeleteDays?: unknown
  allowRegistration?: unknown
}

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  const body = await readBody<SettingsPatchBody>(event).catch(
    (): SettingsPatchBody => ({})
  )

  if (body.webpQuality !== undefined) {
    const quality = parseWebpQuality(String(body.webpQuality))
    if (quality === null) {
      createApiError(event, 'INVALID_REQUEST', '压缩质量需为 1–100 的整数', 400)
    }
    setSetting(SETTINGS_WEBP_QUALITY, String(quality))
  }

  if (body.allowedRefererHosts !== undefined) {
    const raw = typeof body.allowedRefererHosts === 'string'
      ? body.allowedRefererHosts
      : ''
    const normalized = normalizeRefererHosts(raw)
    if (normalized) {
      const invalid = normalized.split(',').find(host => !isValidRefererHost(host))
      if (invalid) {
        createApiError(
          event,
          'INVALID_REQUEST',
          `无效的 Referer 域名：${invalid}`,
          400
        )
      }
    }
    setSetting(SETTINGS_ALLOWED_REFERER_HOSTS, normalized)
  }

  const existingSite = normalizeSiteBaseUrl(getSetting(SETTINGS_SITE_BASE_URL) ?? '')
  const existingImage = normalizeImageBaseUrl(getSetting(SETTINGS_IMAGE_BASE_URL) ?? '')
  let nextSite = existingSite
  let nextImage = existingImage

  if (body.siteBaseUrl !== undefined) {
    const configured = normalizeSiteBaseUrl(
      typeof body.siteBaseUrl === 'string' ? body.siteBaseUrl : ''
    )
    if (configured && !isValidSiteBaseUrl(configured)) {
      createApiError(
        event,
        'INVALID_REQUEST',
        'SITE_BASE_URL 需为 http(s) 地址，且末尾不加 /',
        400
      )
    }
    nextSite = configured
  }

  if (body.imageBaseUrl !== undefined) {
    const configured = normalizeImageBaseUrl(
      typeof body.imageBaseUrl === 'string' ? body.imageBaseUrl : ''
    )
    if (configured && !isValidImageBaseUrl(configured)) {
      createApiError(
        event,
        'INVALID_REQUEST',
        'IMAGE_BASE_URL 需为 http(s) 地址，或留空使用当前请求域名',
        400
      )
    }
    nextImage = configured
  }

  const domainSeparationProvided = body.domainSeparation !== undefined
  const wantSeparation = domainSeparationProvided
    ? Boolean(body.domainSeparation)
    : null

  const patchError = validateSettingsDomainPatch({
    existingSite,
    existingImage,
    nextSite,
    nextImage,
    wantSeparation,
    siteBaseUrlProvided: body.siteBaseUrl !== undefined
  })
  if (patchError) {
    createApiError(event, 'INVALID_REQUEST', patchError, 400)
  }

  if (wantSeparation === false) {
    nextSite = ''
  }

  if (body.siteBaseUrl !== undefined || body.domainSeparation !== undefined) {
    setSetting(SETTINGS_SITE_BASE_URL, nextSite)
  }

  if (body.imageBaseUrl !== undefined) {
    setSetting(SETTINGS_IMAGE_BASE_URL, nextImage)
  }

  if (body.autoDeleteDays !== undefined) {
    const days = parseAutoDeleteDays(String(body.autoDeleteDays))
    if (days === null) {
      createApiError(
        event,
        'INVALID_REQUEST',
        `自动删除天数需为 0–${MAX_AUTO_DELETE_DAYS} 的整数（0 表示关闭）`,
        400
      )
    }
    setGlobalAutoDeletePolicy(days)
  }

  if (body.allowRegistration !== undefined) {
    setAllowRegistration(Boolean(body.allowRegistration))
  }

  if (body.hideFolderInUrl !== undefined) {
    setSetting(SETTINGS_HIDE_FOLDER_IN_URL, body.hideFolderInUrl ? 'true' : 'false')
  }

  if (body.storageUseDatePath !== undefined) {
    setSetting(SETTINGS_STORAGE_USE_DATE_PATH, body.storageUseDatePath ? 'true' : 'false')
  }

  return getSettingsPayload(event)
})

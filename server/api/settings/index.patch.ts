import { requireAdminAuth } from '../../utils/access'
import { createApiError } from '../../utils/api-error'
import {
  setSetting,
  SETTINGS_ALLOWED_REFERER_HOSTS,
  SETTINGS_IMAGE_BASE_URL,
  SETTINGS_WEBP_QUALITY,
  setAllowRegistration
} from '../../utils/db'
import {
  getSettingsPayload,
  isValidImageBaseUrl,
  isValidRefererHost,
  MAX_AUTO_DELETE_DAYS,
  normalizeImageBaseUrl,
  normalizeRefererHosts,
  parseAutoDeleteDays,
  parseWebpQuality,
  setGlobalAutoDeletePolicy
} from '../../utils/env'

interface SettingsPatchBody {
  webpQuality?: unknown
  allowedRefererHosts?: unknown
  imageBaseUrl?: unknown
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
    setSetting(SETTINGS_IMAGE_BASE_URL, configured)
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

  return getSettingsPayload(event)
})

import {
  getTurnstileSiteKey,
  isAdminSecretConfigured,
  isApiUploadTokenConfigured
} from '../../utils/env'
import { isTurnstileEnabled } from '../../utils/turnstile'

export default defineEventHandler((event) => {
  const enabled = isTurnstileEnabled(event)

  return {
    turnstileEnabled: enabled,
    siteKey: enabled ? getTurnstileSiteKey(event) : undefined,
    adminSecretConfigured: isAdminSecretConfigured(event),
    apiUploadTokenConfigured: isApiUploadTokenConfigured(event)
  }
})

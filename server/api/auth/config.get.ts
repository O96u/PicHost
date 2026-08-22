import { isAllowRegistration } from '../../utils/db'
import { isAdminSecretConfigured, isApiUploadTokenConfigured } from '../../utils/env'
import { isInitialized } from '../../utils/auth'

export default defineEventHandler((event) => {
  return {
    initialized: isInitialized(),
    allowRegistration: isAllowRegistration(),
    legacyMode: !isInitialized() && isAdminSecretConfigured(event),
    adminSecretConfigured: isAdminSecretConfigured(event),
    apiUploadTokenConfigured: isApiUploadTokenConfigured(event)
  }
})

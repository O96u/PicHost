import { isAllowRegistration } from '../../utils/db'
import { getLoginVerificationPublicConfig, isAdminSecretConfigured } from '../../utils/env'
import {
  getCurrentUser,
  isInitialized
} from '../../utils/auth'
import { verifyLegacyAuth } from '../../utils/access'

export default defineEventHandler(async (event) => {
  const initialized = isInitialized()
  const user = await getCurrentUser(event)
  const legacyMode = !initialized && isAdminSecretConfigured(event)
  const needsMigration = legacyMode && (await verifyLegacyAuth(event))

  return {
    initialized,
    allowRegistration: isAllowRegistration(),
    legacyMode,
    needsMigration,
    loginVerification: getLoginVerificationPublicConfig(event),
    user: user
      ? {
          id: user.id,
          username: user.username,
          role: user.role
        }
      : null
  }
})

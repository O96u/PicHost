import { destroySession } from '../../utils/auth'
import { clearLegacyAuthCookie } from '../../utils/access'
import { clientIp, logInfo } from '../../utils/logger'

export default defineEventHandler(async (event) => {
  await destroySession(event)
  clearLegacyAuthCookie(event)
  logInfo('logout', { ip: clientIp(event) })
  return { success: true }
})

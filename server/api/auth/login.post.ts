import {
  checkAdminSecret,
  setLegacyAuthCookie
} from '../../utils/access'
import { createApiError } from '../../utils/api-error'
import {
  createSession,
  isInitialized,
  rowToAuthUser,
  verifyPassword
} from '../../utils/auth'
import { findUserByUsername } from '../../utils/db'
import { getAdminSecret } from '../../utils/env'
import { verifyLoginVerification, type VerificationBody } from '../../utils/login-verification'
import { logActivity } from '../../utils/activity-log'
import { clientIp, logInfo, logWarn } from '../../utils/logger'
import { checkLoginRateLimit } from '../../utils/rate-limit'

interface LoginBody extends VerificationBody {
  username?: string
  password?: string
  secret?: string
}

export default defineEventHandler(async (event) => {
  const ip = clientIp(event)
  checkLoginRateLimit(ip)

  const body = await readBody<LoginBody>(event)
  await verifyLoginVerification(event, body ?? {})
  const initialized = isInitialized()

  if (!initialized) {
    const adminSecret = getAdminSecret(event)
    if (!adminSecret) {
      createApiError(event, 'FORBIDDEN', '请先完成系统初始化', 403)
    }

    const input = body?.secret?.trim()
    if (!input || !(await checkAdminSecret(input, adminSecret))) {
      logWarn('legacy login failed: invalid secret', { ip })
      createApiError(event, 'UNAUTHORIZED', '密钥错误', 401)
    }

    await setLegacyAuthCookie(event, adminSecret)
    logInfo('legacy login success', { ip })

    return { success: true, needsMigration: true }
  }

  const username = body?.username?.trim() ?? ''
  const password = body?.password ?? ''

  if (!username || !password) {
    createApiError(event, 'INVALID_REQUEST', '请输入用户名和密码', 400)
  }

  const user = findUserByUsername(username)
  if (!user || !verifyPassword(password, user.password_hash)) {
    logWarn('login failed: invalid credentials', { ip, username })
    createApiError(event, 'UNAUTHORIZED', '用户名或密码错误', 401)
  }

  await createSession(event, user.id)
  logInfo('login success', { ip, username: user.username })
  logActivity(event, {
    action: 'login',
    key: 'auth/login',
    originalName: user.username,
    userId: user.id,
    source: 'web'
  })

  return {
    success: true,
    user: rowToAuthUser(user)
  }
})

import { checkAdminSecret, setAuthCookie } from '../../utils/access'
import { getAdminSecret } from '../../utils/env'
import { createApiError } from '../../utils/r2'
import { isTurnstileEnabled, verifyTurnstileToken } from '../../utils/turnstile'

interface LoginBody {
  secret?: string
  turnstileToken?: string
}

export default defineEventHandler(async (event) => {
  const adminSecret = getAdminSecret(event)

  if (!adminSecret) {
    createApiError(
      event,
      'UNAUTHORIZED',
      '未配置 ADMIN_SECRET',
      500
    )
  }

  const body = await readBody<LoginBody>(event)

  if (isTurnstileEnabled(event)) {
    const valid = await verifyTurnstileToken(event, body?.turnstileToken)
    if (!valid) {
      createApiError(event, 'UNAUTHORIZED', '人机验证失败，请重试', 401)
    }
  }

  const input = body?.secret?.trim()

  if (!input || !(await checkAdminSecret(input, adminSecret))) {
    createApiError(event, 'UNAUTHORIZED', '密钥错误', 401)
  }

  await setAuthCookie(event, adminSecret)

  return { success: true }
})

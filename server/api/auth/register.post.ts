import { createApiError } from '../../utils/api-error'
import {
  createSession,
  createUserAccount,
  isInitialized
} from '../../utils/auth'
import { isAllowRegistration } from '../../utils/db'
import { verifyLoginVerification, type VerificationBody } from '../../utils/login-verification'
import { clientIp, logInfo } from '../../utils/logger'

interface RegisterBody extends VerificationBody {
  username?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  if (!isInitialized()) {
    createApiError(event, 'FORBIDDEN', '请先完成系统初始化', 403)
  }

  if (!isAllowRegistration()) {
    createApiError(event, 'FORBIDDEN', '当前未开放用户注册', 403)
  }

  const body = await readBody<RegisterBody>(event)
  await verifyLoginVerification(event, body ?? {})

  const username = body?.username?.trim() ?? ''
  const password = body?.password ?? ''

  try {
    const user = await createUserAccount({
      username,
      password,
      role: 'user'
    })

    await createSession(event, user.id)

    logInfo('register success', { ip: clientIp(event), username: user.username })

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'INVALID_USERNAME') {
        createApiError(
          event,
          'INVALID_REQUEST',
          '用户名需为 3–32 位字母、数字或下划线',
          400
        )
      } else if (error.message === 'INVALID_PASSWORD') {
        createApiError(
          event,
          'INVALID_REQUEST',
          '密码至少 8 位',
          400
        )
      } else if (error.message === 'USERNAME_TAKEN') {
        createApiError(event, 'INVALID_REQUEST', '用户名已被占用', 400)
      }
    }
    throw error
  }
})

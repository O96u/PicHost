import { createApiError } from '../utils/api-error'
import {
  createSession,
  createUserAccount,
  isInitialized
} from '../utils/auth'
import { setAllowRegistration } from '../utils/db'
import { clientIp, logInfo } from '../utils/logger'

interface SetupBody {
  username?: string
  password?: string
  allowRegistration?: boolean
}

export default defineEventHandler(async (event) => {
  if (isInitialized()) {
    createApiError(event, 'FORBIDDEN', '系统已初始化', 403)
  }

  const body = await readBody<SetupBody>(event)
  const username = body?.username?.trim() ?? ''
  const password = body?.password ?? ''

  try {
    const user = await createUserAccount({
      username,
      password,
      role: 'admin'
    })

    setAllowRegistration(Boolean(body?.allowRegistration))
    await createSession(event, user.id)

    logInfo('setup complete', { ip: clientIp(event), username: user.username })

    return {
      success: true,
      user: { id: user.id, username: user.username, role: user.role }
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

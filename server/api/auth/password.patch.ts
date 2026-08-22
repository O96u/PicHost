import { createApiError } from '../../utils/api-error'
import { requireUserAuth } from '../../utils/access'
import {
  hashPassword,
  isValidPassword,
  verifyPassword
} from '../../utils/auth'
import { findUserById, updateUserPassword } from '../../utils/db'
import { clientIp, logInfo } from '../../utils/logger'

interface PasswordBody {
  currentPassword?: string
  newPassword?: string
}

export default defineEventHandler(async (event) => {
  const authUser = await requireUserAuth(event)
  const body = await readBody<PasswordBody>(event)
  const currentPassword = body?.currentPassword ?? ''
  const newPassword = body?.newPassword ?? ''

  if (!currentPassword || !newPassword) {
    createApiError(event, 'INVALID_REQUEST', '请填写当前密码和新密码', 400)
  }

  if (!isValidPassword(newPassword)) {
    createApiError(event, 'INVALID_REQUEST', '新密码至少 8 位', 400)
  }

  if (currentPassword === newPassword) {
    createApiError(event, 'INVALID_REQUEST', '新密码不能与当前密码相同', 400)
  }

  const user = findUserById(authUser.id)
  if (!user || !verifyPassword(currentPassword, user.password_hash)) {
    createApiError(event, 'UNAUTHORIZED', '当前密码错误', 401)
  }

  updateUserPassword(authUser.id, hashPassword(newPassword))
  logInfo('password changed', { ip: clientIp(event), username: authUser.username })

  return { success: true }
})

import { getCurrentUser } from '../../utils/auth'
import { createApiError } from '../../utils/api-error'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    createApiError(event, 'UNAUTHORIZED', '未登录', 401)
  }

  return {
    authenticated: true,
    user: { id: user.id, username: user.username, role: user.role }
  }
})

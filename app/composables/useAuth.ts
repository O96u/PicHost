export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

export type UserRole = 'admin' | 'user'

export interface AuthUser {
  id: number
  username: string
  role: UserRole
}

export interface AuthStatusResponse {
  initialized: boolean
  allowRegistration: boolean
  legacyMode: boolean
  needsMigration: boolean
  user: AuthUser | null
}

export function isUnauthorizedError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'statusCode' in error
    && (error as { statusCode: number }).statusCode === 401
}

export const AUTH_USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,32}$/
export const AUTH_MIN_PASSWORD_LENGTH = 8

export function validateAuthInput(username: string, password: string): string | null {
  const trimmed = username.trim()
  if (!AUTH_USERNAME_PATTERN.test(trimmed)) {
    return '用户名需为 3–32 位字母、数字或下划线'
  }
  if (password.length < AUTH_MIN_PASSWORD_LENGTH) {
    return '密码至少 8 位'
  }
  return null
}

export function getFetchErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback

  const e = error as {
    data?: {
      message?: string
      error?: { message?: string }
      data?: { error?: { message?: string } }
    }
    statusMessage?: string
    message?: string
  }

  const nested = e.data?.data?.error?.message
    ?? e.data?.error?.message
    ?? e.data?.message
  if (nested) return nested

  if (e.statusMessage && e.statusMessage !== 'Bad Request') {
    return e.statusMessage
  }

  return fallback
}

export type AuthActionResult = { ok: true } | { ok: false, error: string }

export function useAuth() {
  const status = useState<AuthStatus>('auth-status', () => 'checking')
  const user = useState<AuthUser | null>('auth-user', () => null)
  const authStatus = useState<AuthStatusResponse | null>('auth-status-response', () => null)

  const isChecking = computed(() => status.value === 'checking')
  const isAuthenticated = computed(() => status.value === 'authenticated')
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function fetchStatus(): Promise<AuthStatusResponse> {
    const data = await $fetch<AuthStatusResponse>('/api/auth/status', {
      credentials: 'include'
    })
    authStatus.value = data
    return data
  }

  async function checkSession() {
    status.value = 'checking'
    try {
      const data = await fetchStatus()
      if (data.user) {
        user.value = data.user
        status.value = 'authenticated'
        return true
      }
      user.value = null
      status.value = 'unauthenticated'
      return false
    } catch {
      user.value = null
      status.value = 'unauthenticated'
      return false
    }
  }

  function markUnauthenticated() {
    status.value = 'unauthenticated'
    user.value = null
  }

  async function login(
    credentials: { username: string, password: string }
      | { secret: string }
  ): Promise<{ ok: boolean, needsMigration?: boolean, error?: string }> {
    try {
      const result = await $fetch<{
        success: boolean
        needsMigration?: boolean
        user?: AuthUser
      }>('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        body: credentials
      })
      if (result.needsMigration) {
        return { ok: true, needsMigration: true }
      }
      if (result.user) {
        user.value = result.user
      }
      status.value = 'authenticated'
      await fetchStatus()
      return { ok: true }
    } catch (error: unknown) {
      return {
        ok: false,
        error: getFetchErrorMessage(error, '登录失败，请检查用户名和密码')
      }
    }
  }

  async function register(
    username: string,
    password: string
  ): Promise<AuthActionResult> {
    const validationError = validateAuthInput(username, password)
    if (validationError) {
      return { ok: false, error: validationError }
    }

    try {
      const result = await $fetch<{ success: boolean, user: AuthUser }>(
        '/api/auth/register',
        {
          method: 'POST',
          credentials: 'include',
          body: { username: username.trim(), password }
        }
      )
      user.value = result.user
      status.value = 'authenticated'
      await fetchStatus()
      return { ok: true }
    } catch (error: unknown) {
      return {
        ok: false,
        error: getFetchErrorMessage(error, '注册失败，请检查输入')
      }
    }
  }

  async function setup(input: {
    username: string
    password: string
    allowRegistration: boolean
  }): Promise<AuthActionResult> {
    const validationError = validateAuthInput(input.username, input.password)
    if (validationError) {
      return { ok: false, error: validationError }
    }

    try {
      const result = await $fetch<{ success: boolean, user: AuthUser }>(
        '/api/setup',
        {
          method: 'POST',
          credentials: 'include',
          body: {
            username: input.username.trim(),
            password: input.password,
            allowRegistration: input.allowRegistration
          }
        }
      )
      user.value = result.user
      status.value = 'authenticated'
      await fetchStatus()
      return { ok: true }
    } catch (error: unknown) {
      return {
        ok: false,
        error: getFetchErrorMessage(error, '初始化失败，请检查输入')
      }
    }
  }

  async function migrate(input: {
    username: string
    password: string
    allowRegistration: boolean
  }): Promise<AuthActionResult> {
    const validationError = validateAuthInput(input.username, input.password)
    if (validationError) {
      return { ok: false, error: validationError }
    }

    try {
      const result = await $fetch<{ success: boolean, user: AuthUser }>(
        '/api/auth/migrate',
        {
          method: 'POST',
          credentials: 'include',
          body: {
            username: input.username.trim(),
            password: input.password,
            allowRegistration: input.allowRegistration
          }
        }
      )
      user.value = result.user
      status.value = 'authenticated'
      await fetchStatus()
      return { ok: true }
    } catch (error: unknown) {
      return {
        ok: false,
        error: getFetchErrorMessage(error, '迁移失败，请检查输入')
      }
    }
  }

  async function changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<AuthActionResult> {
    if (newPassword.length < AUTH_MIN_PASSWORD_LENGTH) {
      return { ok: false, error: '新密码至少 8 位' }
    }

    try {
      await $fetch('/api/auth/password', {
        method: 'PATCH',
        credentials: 'include',
        body: { currentPassword, newPassword }
      })
      return { ok: true }
    } catch (error: unknown) {
      return {
        ok: false,
        error: getFetchErrorMessage(error, '修改密码失败')
      }
    }
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // 忽略登出失败
    } finally {
      status.value = 'unauthenticated'
      user.value = null
      authStatus.value = null
    }
  }

  function handleAuthError(error: unknown) {
    if (isUnauthorizedError(error)) {
      markUnauthenticated()
    }
  }

  return {
    status,
    user,
    authStatus,
    isChecking,
    isAuthenticated,
    isAdmin,
    checkSession,
    fetchStatus,
    markUnauthenticated,
    login,
    register,
    setup,
    migrate,
    changePassword,
    logout,
    handleAuthError,
    getFetchErrorMessage
  }
}

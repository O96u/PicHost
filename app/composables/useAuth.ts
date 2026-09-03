import type { LoginVerificationPayload } from '~/types/auth'

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

export type UserRole = 'admin' | 'user'

export interface AuthUser {
  id: number
  username: string
  role: UserRole
}

export interface LoginVerificationPublicConfig {
  method: 'slider' | 'turnstile' | 'cap'
  turnstileSiteKey?: string
  capApiEndpoint?: string
}

export interface AuthStatusResponse {
  initialized: boolean
  allowRegistration: boolean
  legacyMode: boolean
  needsMigration: boolean
  loginVerification: LoginVerificationPublicConfig
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

export type AuthValidationErrorKey = 'invalidUsername' | 'invalidPassword'

export function validateAuthInput(username: string, password: string): AuthValidationErrorKey | null {
  const trimmed = username.trim()
  if (!AUTH_USERNAME_PATTERN.test(trimmed)) {
    return 'invalidUsername'
  }
  if (password.length < AUTH_MIN_PASSWORD_LENGTH) {
    return 'invalidPassword'
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

export type { LoginVerificationPayload }

function buildVerificationBody(verification: LoginVerificationPayload): Record<string, unknown> {
  if (verification.method === 'slider') {
    return {
      captchaId: verification.captchaId,
      captchaPosition: verification.captchaPosition
    }
  }
  if (verification.method === 'turnstile') {
    return { turnstileToken: verification.turnstileToken }
  }
  return { capToken: verification.capToken }
}

export function useAuth() {
  const { t } = useI18n()
  const status = useState<AuthStatus>('auth-status', () => 'checking')
  const user = useState<AuthUser | null>('auth-user', () => null)
  const authStatus = useState<AuthStatusResponse | null>('auth-status-response', () => null)
  /** 是否已完成至少一次会话校验（用于避免路由切换时反复全屏 loading） */
  const hasValidatedOnce = useState('auth-validated-once', () => false)

  const isChecking = computed(() => status.value === 'checking' && !hasValidatedOnce.value)
  const isAuthenticated = computed(() => status.value === 'authenticated')
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function fetchStatus(): Promise<AuthStatusResponse> {
    const data = await $fetch<AuthStatusResponse>('/api/auth/status', {
      credentials: 'include'
    })
    authStatus.value = data
    return data
  }

  async function checkSession(options?: { force?: boolean }) {
    const silent = !options?.force && hasValidatedOnce.value
    if (!silent) {
      status.value = 'checking'
    }
    try {
      const data = await fetchStatus()
      hasValidatedOnce.value = true
      if (data.user) {
        user.value = data.user
        status.value = 'authenticated'
        return true
      }
      user.value = null
      status.value = 'unauthenticated'
      return false
    } catch {
      hasValidatedOnce.value = true
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
      | { secret: string },
    verification: LoginVerificationPayload
  ): Promise<{ ok: boolean, needsMigration?: boolean, error?: string }> {
    try {
      const result = await $fetch<{
        success: boolean
        needsMigration?: boolean
        user?: AuthUser
      }>('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        body: {
          ...credentials,
          ...buildVerificationBody(verification)
        }
      })
      if (result.needsMigration) {
        return { ok: true, needsMigration: true }
      }
      if (result.user) {
        user.value = result.user
      }
      status.value = 'authenticated'
      hasValidatedOnce.value = true
      await fetchStatus()
      return { ok: true }
    } catch (error: unknown) {
      return {
        ok: false,
        error: getFetchErrorMessage(error, t('auth.loginFailed'))
      }
    }
  }

  async function register(
    username: string,
    password: string,
    verification: LoginVerificationPayload
  ): Promise<AuthActionResult> {
    const validationError = validateAuthInput(username, password)
    if (validationError) {
      return { ok: false, error: t(`auth.errors.${validationError}`) }
    }

    try {
      const result = await $fetch<{ success: boolean, user: AuthUser }>(
        '/api/auth/register',
        {
          method: 'POST',
          credentials: 'include',
          body: {
            username: username.trim(),
            password,
            ...buildVerificationBody(verification)
          }
        }
      )
      user.value = result.user
      status.value = 'authenticated'
      hasValidatedOnce.value = true
      await fetchStatus()
      return { ok: true }
    } catch (error: unknown) {
      return {
        ok: false,
        error: getFetchErrorMessage(error, t('auth.registerFailed'))
      }
    }
  }

  async function setup(input: {
    username: string
    password: string
    allowRegistration: boolean
    domainSeparation?: boolean
    siteBaseUrl?: string
    imageBaseUrl?: string
  }): Promise<AuthActionResult> {
    const validationError = validateAuthInput(input.username, input.password)
    if (validationError) {
      return { ok: false, error: t(`auth.errors.${validationError}`) }
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
            allowRegistration: input.allowRegistration,
            domainSeparation: input.domainSeparation,
            siteBaseUrl: input.siteBaseUrl,
            imageBaseUrl: input.imageBaseUrl
          }
        }
      )
      user.value = result.user
      status.value = 'authenticated'
      hasValidatedOnce.value = true
      await fetchStatus()
      return { ok: true }
    } catch (error: unknown) {
      return {
        ok: false,
        error: getFetchErrorMessage(error, t('auth.setupFailed'))
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
      return { ok: false, error: t(`auth.errors.${validationError}`) }
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
      hasValidatedOnce.value = true
      await fetchStatus()
      return { ok: true }
    } catch (error: unknown) {
      return {
        ok: false,
        error: getFetchErrorMessage(error, t('auth.migrateFailed'))
      }
    }
  }

  async function changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<AuthActionResult> {
    if (newPassword.length < AUTH_MIN_PASSWORD_LENGTH) {
      return { ok: false, error: t('password.tooShort') }
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
        error: getFetchErrorMessage(error, t('password.changeFailed'))
      }
    }
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // 忽略登出失败
    } finally {
      status.value = 'unauthenticated'
      user.value = null
      hasValidatedOnce.value = true
    }
    try {
      await fetchStatus()
    } catch {
      // 保留既有公开配置（loginVerification 等）
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

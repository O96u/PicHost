export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

export function isUnauthorizedError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'statusCode' in error
    && (error as { statusCode: number }).statusCode === 401
}

export function useAdminAuth() {
  const status = useState<AuthStatus>('auth-status', () => 'checking')

  const isChecking = computed(() => status.value === 'checking')
  const isAuthenticated = computed(() => status.value === 'authenticated')

  async function checkSession() {
    status.value = 'checking'
    try {
      await $fetch('/api/auth/me', { credentials: 'include' })
      status.value = 'authenticated'
      return true
    } catch {
      status.value = 'unauthenticated'
      return false
    }
  }

  function markUnauthenticated() {
    status.value = 'unauthenticated'
  }

  async function login(secret: string, turnstileToken?: string | null): Promise<boolean> {
    try {
      await $fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        body: {
          secret,
          ...(turnstileToken ? { turnstileToken } : {})
        }
      })
      status.value = 'authenticated'
      return true
    } catch {
      return false
    }
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // 忽略登出失败
    } finally {
      status.value = 'unauthenticated'
    }
  }

  function handleAuthError(error: unknown) {
    if (isUnauthorizedError(error)) {
      markUnauthenticated()
    }
  }

  return {
    status,
    isChecking,
    isAuthenticated,
    checkSession,
    markUnauthenticated,
    login,
    logout,
    handleAuthError
  }
}

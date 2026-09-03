interface TurnstileVerifyResult {
  success?: boolean
}

export async function verifyTurnstileToken(
  secret: string,
  token: string,
  remoteIp?: string
): Promise<boolean> {
  if (!secret || !token) return false

  const params = new URLSearchParams({
    secret,
    response: token
  })
  if (remoteIp) {
    params.set('remoteip', remoteIp)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
      signal: controller.signal
    })
    const result = await response.json() as TurnstileVerifyResult
    return result.success === true
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

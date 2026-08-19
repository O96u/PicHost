import type { H3Event } from 'h3'
import { getTurnstileSecret, getTurnstileSiteKey } from './env'

interface TurnstileVerifyResponse {
  success: boolean
}

export function isTurnstileEnabled(event: H3Event): boolean {
  return Boolean(getTurnstileSiteKey(event) && getTurnstileSecret(event))
}

export async function verifyTurnstileToken(
  event: H3Event,
  token: string | undefined
): Promise<boolean> {
  if (!isTurnstileEnabled(event)) {
    return import.meta.dev
  }

  if (!token) {
    return false
  }

  const secret = getTurnstileSecret(event)
  const remoteip = getHeader(event, 'cf-connecting-ip')
    ?? getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()

  const body = new URLSearchParams({
    secret,
    response: token
  })

  if (remoteip) {
    body.set('remoteip', remoteip)
  }

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      }
    )

    const result = await response.json() as TurnstileVerifyResponse
    return result.success === true
  } catch {
    return false
  }
}

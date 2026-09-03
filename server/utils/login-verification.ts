import type { H3Event } from 'h3'
import { createApiError } from './api-error'
import {
  getCapApiEndpointConfigured,
  getCapSecret,
  getLoginVerificationMethod,
  getTurnstileSecretKey,
  getTurnstileSiteKeyConfigured
} from './env'
import { verifyLoginCaptcha } from './login-captcha'
import { clientIp } from './logger'
import { verifyCapToken } from './verify-cap'
import { verifyTurnstileToken } from './verify-turnstile'

export interface VerificationBody {
  captchaId?: string
  captchaPosition?: number
  turnstileToken?: string
  capToken?: string
}

export async function verifyLoginVerification(
  event: H3Event,
  body: VerificationBody
): Promise<void> {
  const method = getLoginVerificationMethod(event)

  if (method === 'slider') {
    const id = body.captchaId?.trim() ?? ''
    const position = Number(body.captchaPosition)
    if (!id || !verifyLoginCaptcha(id, position)) {
      createApiError(event, 'INVALID_REQUEST', '请先完成滑块验证', 400)
    }
    return
  }

  if (method === 'turnstile') {
    if (!getTurnstileSiteKeyConfigured(event) || !getTurnstileSecretKey(event)) {
      createApiError(event, 'INVALID_REQUEST', '人机验证未正确配置', 400)
    }
    const token = body.turnstileToken?.trim() ?? ''
    const ok = await verifyTurnstileToken(
      getTurnstileSecretKey(event),
      token,
      clientIp(event)
    )
    if (!ok) {
      createApiError(event, 'INVALID_REQUEST', '请先完成人机验证', 400)
    }
    return
  }

  if (!getCapApiEndpointConfigured(event) || !getCapSecret(event)) {
    createApiError(event, 'INVALID_REQUEST', '人机验证未正确配置', 400)
  }
  const token = body.capToken?.trim() ?? ''
  const ok = await verifyCapToken(
    getCapApiEndpointConfigured(event),
    getCapSecret(event),
    token
  )
  if (!ok) {
    createApiError(event, 'INVALID_REQUEST', '请先完成人机验证', 400)
  }
}

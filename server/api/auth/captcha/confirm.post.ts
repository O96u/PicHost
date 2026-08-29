import { createApiError } from '../../../utils/api-error'
import { confirmLoginCaptcha } from '../../../utils/login-captcha'

interface ConfirmBody {
  id?: string
  captchaPosition?: number
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ConfirmBody>(event)
  const id = body?.id?.trim() ?? ''
  const position = Number(body?.captchaPosition)

  if (!id || !confirmLoginCaptcha(id, position)) {
    createApiError(event, 'INVALID_REQUEST', '滑块未对齐，请重试', 400)
  }

  return { success: true }
})

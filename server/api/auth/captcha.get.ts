import { createLoginCaptchaChallenge } from '../../utils/login-captcha'

export default defineEventHandler(() => {
  const { id, svg } = createLoginCaptchaChallenge()
  return { id, svg }
})

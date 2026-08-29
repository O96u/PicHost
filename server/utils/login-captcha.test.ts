import { describe, expect, it } from 'vitest'
import {
  __peekLoginCaptchaTargetForTests,
  __resetLoginCaptchaStoreForTests,
  confirmLoginCaptcha,
  createLoginCaptchaChallenge,
  verifyLoginCaptcha
} from './login-captcha'

describe('login-captcha', () => {
  it('requires confirm before login verify', () => {
    __resetLoginCaptchaStoreForTests()
    const { id } = createLoginCaptchaChallenge()
    const target = __peekLoginCaptchaTargetForTests(id)!
    expect(verifyLoginCaptcha(id, target)).toBe(false)
    expect(confirmLoginCaptcha(id, target)).toBe(true)
    expect(verifyLoginCaptcha(id, target)).toBe(true)
    expect(verifyLoginCaptcha(id, target)).toBe(false)
  })

  it('rejects position outside tolerance', () => {
    __resetLoginCaptchaStoreForTests()
    const { id } = createLoginCaptchaChallenge()
    const target = __peekLoginCaptchaTargetForTests(id)!
    expect(confirmLoginCaptcha(id, target + 10)).toBe(false)
  })
})

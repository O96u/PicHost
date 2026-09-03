export type LoginVerificationMethod = 'slider' | 'turnstile' | 'cap'

export interface LoginVerificationPublicConfig {
  method: LoginVerificationMethod
  turnstileSiteKey?: string
  capApiEndpoint?: string
}

export type LoginVerificationPayload = {
  method: 'slider'
  captchaId: string
  captchaPosition: number
} | {
  method: 'turnstile'
  turnstileToken: string
} | {
  method: 'cap'
  capToken: string
}

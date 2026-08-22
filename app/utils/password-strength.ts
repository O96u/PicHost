export const PASSWORD_MIN_LENGTH = 8

export interface PasswordCriteria {
  minLength: boolean
  mixedCase: boolean
  hasNumber: boolean
  hasSpecial: boolean
}

export type PasswordStrengthLabel = '弱' | '中' | '强'

export function analyzePassword(password: string): {
  criteria: PasswordCriteria
  score: number
  label: PasswordStrengthLabel
  isValid: boolean
} {
  const criteria: PasswordCriteria = {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    mixedCase: /[a-z]/.test(password) && /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^a-zA-Z0-9]/.test(password)
  }

  const score = Object.values(criteria).filter(Boolean).length
  const label: PasswordStrengthLabel
    = score <= 1 ? '弱' : score <= 3 ? '中' : '强'

  return {
    criteria,
    score,
    label,
    isValid: criteria.minLength
  }
}

export function isPasswordValid(password: string): boolean {
  return analyzePassword(password).isValid
}

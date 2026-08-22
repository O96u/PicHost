import { describe, expect, it } from 'vitest'
import { hashPassword, isValidPassword, isValidUsername, verifyPassword } from './auth'

describe('auth password', () => {
  it('hashes and verifies a password', () => {
    const hash = hashPassword('test-password-123')
    expect(hash.startsWith('scrypt$')).toBe(true)
    expect(verifyPassword('test-password-123', hash)).toBe(true)
    expect(verifyPassword('wrong-password', hash)).toBe(false)
  })

  it('rejects invalid passwords', () => {
    expect(isValidPassword('short')).toBe(false)
    expect(isValidPassword('long-enough')).toBe(true)
  })

  it('validates usernames', () => {
    expect(isValidUsername('ab')).toBe(false)
    expect(isValidUsername('user_1')).toBe(true)
    expect(isValidUsername('bad name')).toBe(false)
  })
})

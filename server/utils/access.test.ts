import { describe, expect, it } from 'vitest'
import { createLegacySessionToken } from './access'

describe('createLegacySessionToken', () => {
  it('returns a stable hex digest for the same secret', async () => {
    const first = await createLegacySessionToken('test-secret')
    const second = await createLegacySessionToken('test-secret')
    expect(first).toBe(second)
    expect(first).toMatch(/^[0-9a-f]{64}$/)
  })

  it('changes when the secret changes', async () => {
    const a = await createLegacySessionToken('secret-a')
    const b = await createLegacySessionToken('secret-b')
    expect(a).not.toBe(b)
  })
})

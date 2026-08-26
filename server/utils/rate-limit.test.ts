import { describe, expect, it, vi } from 'vitest'

vi.mock('./logger', () => ({
  clientIp: (event: { __ip?: string }) => event.__ip ?? '127.0.0.1'
}))

import { checkUploadRateLimit } from './rate-limit'

function mockEvent(ip = '127.0.0.1', authToken = '') {
  return {
    __ip: ip,
    node: {
      req: {
        headers: {
          ...(authToken ? { 'auth-token': authToken } : {})
        }
      }
    }
  } as unknown as Parameters<typeof checkUploadRateLimit>[0]
}

describe('checkUploadRateLimit', () => {
  it('allows requests under the IP limit', () => {
    const event = mockEvent('10.0.0.1')
    expect(() => checkUploadRateLimit(event)).not.toThrow()
  })

  it('limits repeated uploads by IP', () => {
    const event = mockEvent('10.0.0.3')
    for (let i = 0; i < 60; i++) {
      checkUploadRateLimit(event)
    }
    expect(() => checkUploadRateLimit(event)).toThrow()
  })

  it('limits repeated API token uploads', () => {
    const token = 'token-a'
    for (let i = 0; i < 120; i++) {
      checkUploadRateLimit(mockEvent(`10.0.${i % 200}`), token)
    }
    expect(() => checkUploadRateLimit(mockEvent('10.0.250'), token)).toThrow()
  })
})

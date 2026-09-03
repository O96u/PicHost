import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { verifyTurnstileToken } from './verify-turnstile'
import { verifyCapToken } from './verify-cap'

describe('verify-turnstile', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns true when siteverify succeeds', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ success: true })
    } as Response)

    await expect(verifyTurnstileToken('secret', 'token', '1.2.3.4')).resolves.toBe(true)
  })

  it('returns false when siteverify fails', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ success: false })
    } as Response)

    await expect(verifyTurnstileToken('secret', 'token')).resolves.toBe(false)
  })

  it('returns false when token is missing', async () => {
    await expect(verifyTurnstileToken('secret', '')).resolves.toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('verify-cap', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts to endpoint siteverify and returns true on success', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ success: true })
    } as Response)

    const ok = await verifyCapToken(
      'https://cap.example.com/site-key/',
      'secret',
      'token'
    )
    expect(ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      'https://cap.example.com/site-key/siteverify',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('returns false on network error', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network'))

    await expect(verifyCapToken(
      'https://cap.example.com/site-key/',
      'secret',
      'token'
    )).resolves.toBe(false)
  })
})

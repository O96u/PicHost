import { describe, expect, it } from 'vitest'
import { isRefererAllowed } from './serve-image'

describe('isRefererAllowed', () => {
  const allowedHosts = new Set(['pic.example.com', 'blog.example.com'])

  it('allows missing referer', () => {
    expect(isRefererAllowed(null, allowedHosts)).toBe(true)
  })

  it('allows referer from an allowed host', () => {
    expect(isRefererAllowed('https://blog.example.com/post/1', allowedHosts)).toBe(true)
    expect(isRefererAllowed('https://PIC.EXAMPLE.COM/img.webp', allowedHosts)).toBe(true)
  })

  it('blocks referer from unknown hosts', () => {
    expect(isRefererAllowed('https://evil.example.com/hotlink', allowedHosts)).toBe(false)
  })

  it('rejects malformed referer URLs', () => {
    expect(isRefererAllowed('not-a-url', allowedHosts)).toBe(false)
  })
})

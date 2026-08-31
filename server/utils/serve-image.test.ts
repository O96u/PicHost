import { describe, expect, it, vi, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import { isHotlinkBlocked, isRefererAllowed } from './serve-image'
import { getSetting, SETTINGS_ALLOWED_REFERER_HOSTS } from './db'

vi.mock('./db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./db')>()
  return {
    ...actual,
    getSetting: vi.fn()
  }
})

vi.stubGlobal('getRequestURL', () => new URL('https://pic.example.com'))

vi.stubGlobal('useRuntimeConfig', () => ({
  apiUploadToken: '',
  siteBaseUrl: '',
  imageBaseUrl: ''
}))

function mockEvent(): H3Event {
  return {
    node: { req: {}, res: {} },
    context: {}
  } as H3Event
}

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

describe('isHotlinkBlocked', () => {
  afterEach(() => {
    vi.clearAllMocks()
    delete process.env.ALLOWED_REFERER_HOSTS
  })

  it('does not block external referers when protection is not configured', () => {
    vi.mocked(getSetting).mockReturnValue(null)
    const event = mockEvent()
    expect(isHotlinkBlocked(event, 'https://blog.example.com/post')).toBe(false)
  })

  it('does not block external referers when db explicitly cleared', () => {
    process.env.ALLOWED_REFERER_HOSTS = 'blog.example.com'
    vi.mocked(getSetting).mockImplementation(key =>
      key === SETTINGS_ALLOWED_REFERER_HOSTS ? '' : null
    )
    const event = mockEvent()
    expect(isHotlinkBlocked(event, 'https://forum.example.com/thread')).toBe(false)
  })

  it('blocks external referers when protection is configured', () => {
    vi.mocked(getSetting).mockImplementation(key =>
      key === SETTINGS_ALLOWED_REFERER_HOSTS ? 'blog.example.com' : null
    )
    const event = mockEvent()
    expect(isHotlinkBlocked(event, 'https://evil.example.com/hotlink')).toBe(true)
    expect(isHotlinkBlocked(event, 'https://blog.example.com/post')).toBe(false)
  })

  it('still allows missing referer when protection is configured', () => {
    vi.mocked(getSetting).mockImplementation(key =>
      key === SETTINGS_ALLOWED_REFERER_HOSTS ? 'blog.example.com' : null
    )
    const event = mockEvent()
    expect(isHotlinkBlocked(event, null)).toBe(false)
  })
})

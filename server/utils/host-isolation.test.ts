import { describe, expect, it } from 'vitest'
import type { H3Event } from 'h3'
import { shouldBlockImageHostRequest } from './host-isolation'

function mockEvent(): H3Event {
  return {
    node: { req: {}, res: {} },
    context: {}
  } as H3Event
}

describe('shouldBlockImageHostRequest', () => {
  const imageHost = 'pic.example.com'
  const siteHost = 'admin.example.com'

  it('does not block when separation is inactive', () => {
    const event = mockEvent()
    expect(shouldBlockImageHostRequest(event, {
      separationActive: false,
      requestHost: imageHost,
      method: 'GET',
      pathname: '/settings'
    })).toBe(false)
  })

  it('blocks non-image paths on image host', () => {
    const event = mockEvent()
    expect(shouldBlockImageHostRequest(event, {
      separationActive: true,
      imageHost,
      requestHost: imageHost,
      method: 'GET',
      pathname: '/settings'
    })).toBe(true)
  })

  it('allows image paths on image host', () => {
    const event = mockEvent()
    expect(shouldBlockImageHostRequest(event, {
      separationActive: true,
      imageHost,
      requestHost: imageHost,
      method: 'GET',
      pathname: '/images/2026/08/demo.webp'
    })).toBe(false)
  })

  it('blocks POST on image host even for image paths', () => {
    const event = mockEvent()
    expect(shouldBlockImageHostRequest(event, {
      separationActive: true,
      imageHost,
      requestHost: imageHost,
      method: 'POST',
      pathname: '/images/2026/08/demo.webp'
    })).toBe(true)
  })

  it('does not block site host admin paths', () => {
    const event = mockEvent()
    expect(shouldBlockImageHostRequest(event, {
      separationActive: true,
      imageHost,
      requestHost: siteHost,
      method: 'GET',
      pathname: '/api/images'
    })).toBe(false)
  })
})

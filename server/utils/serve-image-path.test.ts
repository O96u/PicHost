import { describe, expect, it } from 'vitest'
import { requestPathToImageKey } from './serve-image'

describe('requestPathToImageKey hide folder', () => {
  it('resolves bare filename to default folder flat key', () => {
    expect(requestPathToImageKey('/demo.webp', { hideFolder: true }))
      .toBe('images/demo.webp')
  })

  it('resolves hidden date path to default folder key', () => {
    expect(requestPathToImageKey('/2026/08/demo.webp', { hideFolder: true }))
      .toBe('images/2026/08/demo.webp')
  })

  it('still accepts full key when hide folder is enabled', () => {
    expect(requestPathToImageKey('/images/2026/08/demo.webp', { hideFolder: true }))
      .toBe('images/2026/08/demo.webp')
    expect(requestPathToImageKey('/images/demo.webp', { hideFolder: true }))
      .toBe('images/demo.webp')
  })

  it('does not resolve short paths when hide folder is disabled', () => {
    expect(requestPathToImageKey('/2026/08/demo.webp', { hideFolder: false }))
      .toBeNull()
    expect(requestPathToImageKey('/demo.webp', { hideFolder: false }))
      .toBeNull()
  })

  it('accepts flat full key when hide folder is disabled', () => {
    expect(requestPathToImageKey('/images/demo.webp', { hideFolder: false }))
      .toBe('images/demo.webp')
  })
})

import { describe, expect, it } from 'vitest'
import { requestPathToImageKey } from './serve-image'

describe('requestPathToImageKey hide folder', () => {
  it('resolves hidden date path to default folder key', () => {
    expect(requestPathToImageKey('/2026/08/demo.webp', { hideFolder: true }))
      .toBe('images/2026/08/demo.webp')
  })

  it('still accepts full key when hide folder is enabled', () => {
    expect(requestPathToImageKey('/images/2026/08/demo.webp', { hideFolder: true }))
      .toBe('images/2026/08/demo.webp')
  })

  it('does not resolve hidden path when hide folder is disabled', () => {
    expect(requestPathToImageKey('/2026/08/demo.webp', { hideFolder: false }))
      .toBeNull()
  })
})

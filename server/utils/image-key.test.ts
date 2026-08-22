import { describe, expect, it } from 'vitest'
import { validateImageKey } from './image-key'

describe('validateImageKey', () => {
  it('accepts valid keys', () => {
    expect(validateImageKey('images/2026/08/abc123.webp')).toBe(true)
    expect(validateImageKey('twikoo/2025/01/photo.jpg')).toBe(true)
  })

  it('rejects path traversal and malformed keys', () => {
    expect(validateImageKey('')).toBe(false)
    expect(validateImageKey('/images/2026/08/a.webp')).toBe(false)
    expect(validateImageKey('images/2026/08/../secret.webp')).toBe(false)
    expect(validateImageKey('images//2026/08/a.webp')).toBe(false)
    expect(validateImageKey('api/2026/08/a.webp')).toBe(false)
    expect(validateImageKey('images/26/8/a.webp')).toBe(false)
    expect(validateImageKey('images/2026/08/a.txt')).toBe(false)
  })
})

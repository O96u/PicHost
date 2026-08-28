import { describe, expect, it } from 'vitest'
import { validateImageKey } from './image-key'

describe('image index key validation', () => {
  it('accepts standard image keys used in index', () => {
    expect(validateImageKey('images/2026/03/abc.webp')).toBe(true)
    expect(validateImageKey('images/file/111.webp')).toBe(true)
    expect(validateImageKey('images/2026/08/28/123.webp')).toBe(true)
    expect(validateImageKey('images/abc.webp')).toBe(true)
  })

  it('rejects legacy top-level keys and path traversal', () => {
    expect(validateImageKey('../secret')).toBe(false)
    expect(validateImageKey('images/../../etc/passwd')).toBe(false)
    expect(validateImageKey('twikoo/2026/03/abc.webp')).toBe(false)
    expect(validateImageKey('blog/abc.webp')).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { generateImageKey, validateImageKey } from './image-key'

describe('validateImageKey', () => {
  it('accepts valid date-layout keys', () => {
    expect(validateImageKey('images/2026/08/abc123.webp')).toBe(true)
  })

  it('accepts valid flat-layout keys', () => {
    expect(validateImageKey('images/abc123.webp')).toBe(true)
  })

  it('accepts migrated nested paths under images/', () => {
    expect(validateImageKey('images/file/111.webp')).toBe(true)
    expect(validateImageKey('images/2026/08/28/123.webp')).toBe(true)
    expect(validateImageKey('images/twikoo/2025/01/photo.jpg')).toBe(true)
  })

  it('rejects non-images top-level and path traversal', () => {
    expect(validateImageKey('')).toBe(false)
    expect(validateImageKey('/images/2026/08/a.webp')).toBe(false)
    expect(validateImageKey('images/2026/08/../secret.webp')).toBe(false)
    expect(validateImageKey('images//2026/08/a.webp')).toBe(false)
    expect(validateImageKey('blog/2026/08/a.webp')).toBe(false)
    expect(validateImageKey('twikoo/photo.jpg')).toBe(false)
    expect(validateImageKey('images/2026/08/a.txt')).toBe(false)
  })
})

describe('generateImageKey', () => {
  const date = new Date('2026-08-15T12:00:00Z')

  it('generates date-layout keys by default', () => {
    const key = generateImageKey('image/webp', date)
    expect(key).toMatch(/^images\/2026\/08\/[A-Za-z0-9]{12}\.webp$/)
    expect(validateImageKey(key)).toBe(true)
  })

  it('generates flat-layout keys when requested', () => {
    const key = generateImageKey('image/webp', date, 'flat')
    expect(key).toMatch(/^images\/[A-Za-z0-9]{12}\.webp$/)
    expect(validateImageKey(key)).toBe(true)
  })

  it('uses 12-character random IDs', () => {
    const key = generateImageKey('image/webp', date, 'flat')
    const id = key.split('/')[1]?.replace('.webp', '') ?? ''
    expect(id.length).toBe(12)
  })
})

import { describe, expect, it } from 'vitest'
import { generateImageKey, sortFolderNames, validateImageKey } from './image-key'

describe('validateImageKey', () => {
  it('accepts valid date-layout keys', () => {
    expect(validateImageKey('images/2026/08/abc123.webp')).toBe(true)
    expect(validateImageKey('twikoo/2025/01/photo.jpg')).toBe(true)
  })

  it('accepts valid flat-layout keys', () => {
    expect(validateImageKey('images/abc123.webp')).toBe(true)
    expect(validateImageKey('twikoo/photo.jpg')).toBe(true)
  })

  it('sorts images first then alphabetically', () => {
    expect(sortFolderNames(['blog', 'images', 'twikoo'])).toEqual(['images', 'blog', 'twikoo'])
    expect(sortFolderNames(['blog'])).toEqual(['images', 'blog'])
  })

  it('rejects path traversal and malformed keys', () => {
    expect(validateImageKey('')).toBe(false)
    expect(validateImageKey('/images/2026/08/a.webp')).toBe(false)
    expect(validateImageKey('images/2026/08/../secret.webp')).toBe(false)
    expect(validateImageKey('images//2026/08/a.webp')).toBe(false)
    expect(validateImageKey('api/2026/08/a.webp')).toBe(false)
    expect(validateImageKey('images/26/8/a.webp')).toBe(false)
    expect(validateImageKey('images/2026/08/a.txt')).toBe(false)
    expect(validateImageKey('images/2026/a.webp')).toBe(false)
  })
})

describe('generateImageKey', () => {
  const date = new Date('2026-08-15T12:00:00Z')

  it('generates date-layout keys by default', () => {
    const key = generateImageKey('image/webp', date, 'images')
    expect(key).toMatch(/^images\/2026\/08\/[A-Za-z0-9]+\.webp$/)
    expect(validateImageKey(key)).toBe(true)
  })

  it('generates flat-layout keys when requested', () => {
    const key = generateImageKey('image/webp', date, 'images', 'flat')
    expect(key).toMatch(/^images\/[A-Za-z0-9]+\.webp$/)
    expect(validateImageKey(key)).toBe(true)
  })
})

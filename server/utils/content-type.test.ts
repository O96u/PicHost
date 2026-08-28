import { describe, expect, it } from 'vitest'
import { contentTypeFromKey } from './content-type'

describe('contentTypeFromKey', () => {
  it('infers image types from extensions', () => {
    expect(contentTypeFromKey('images/a.webp')).toBe('image/webp')
    expect(contentTypeFromKey('images/file/111.webp')).toBe('image/webp')
    expect(contentTypeFromKey('images/2026/08/28/123.webp')).toBe('image/webp')
    expect(contentTypeFromKey('images/photo.JPG')).toBe('image/jpeg')
  })

  it('falls back to octet-stream for unknown extensions', () => {
    expect(contentTypeFromKey('images/file.dat')).toBe('application/octet-stream')
  })
})

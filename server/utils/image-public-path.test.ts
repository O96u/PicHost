import { describe, expect, it } from 'vitest'
import { isHiddenImageDatePath, toPublicImagePath } from './image-public-path'

describe('toPublicImagePath', () => {
  it('returns key unchanged when hideFolder is false', () => {
    expect(toPublicImagePath('images/2026/08/a.webp', false)).toBe('images/2026/08/a.webp')
  })

  it('strips the first path segment when hideFolder is true', () => {
    expect(toPublicImagePath('images/2026/08/a.webp', true)).toBe('2026/08/a.webp')
    expect(toPublicImagePath('blog/2026/08/a.webp', true)).toBe('2026/08/a.webp')
  })
})

describe('isHiddenImageDatePath', () => {
  it('accepts YYYY/MM/file paths', () => {
    expect(isHiddenImageDatePath('2026/08/demo.webp')).toBe(true)
  })

  it('rejects folder-prefixed paths', () => {
    expect(isHiddenImageDatePath('images/2026/08/demo.webp')).toBe(false)
  })
})

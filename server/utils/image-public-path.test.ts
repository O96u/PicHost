import { describe, expect, it } from 'vitest'
import {
  isBareImageFilename,
  isHiddenImageDatePath,
  toPublicImagePath
} from './image-public-path'

describe('toPublicImagePath', () => {
  it('returns key unchanged when hideFolder is false', () => {
    expect(toPublicImagePath('images/2026/08/a.webp', false)).toBe('images/2026/08/a.webp')
    expect(toPublicImagePath('images/a.webp', false)).toBe('images/a.webp')
  })

  it('returns basename when hideFolder is true', () => {
    expect(toPublicImagePath('images/2026/08/a.webp', true)).toBe('a.webp')
    expect(toPublicImagePath('blog/2026/08/a.webp', true)).toBe('a.webp')
    expect(toPublicImagePath('images/a.webp', true)).toBe('a.webp')
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

describe('isBareImageFilename', () => {
  it('accepts bare filenames', () => {
    expect(isBareImageFilename('demo.webp')).toBe(true)
  })

  it('rejects paths with directories', () => {
    expect(isBareImageFilename('2026/08/demo.webp')).toBe(false)
    expect(isBareImageFilename('images/demo.webp')).toBe(false)
  })
})

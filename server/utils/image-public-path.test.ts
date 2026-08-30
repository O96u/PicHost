import { describe, expect, it } from 'vitest'
import {
  isBareImageFilename,
  isHiddenImageDatePath,
  storageKeyToPublicPath,
  toPublicImagePath,
  toStorageKeyFromPublicPath
} from './image-public-path'

describe('toPublicImagePath', () => {
  it('strips internal images/ prefix when hideFolder is false', () => {
    expect(toPublicImagePath('images/2026/08/a.webp', false)).toBe('2026/08/a.webp')
    expect(toPublicImagePath('images/a.webp', false)).toBe('a.webp')
    expect(toPublicImagePath('images/blog/a.webp', false)).toBe('blog/a.webp')
  })

  it('returns basename when hideFolder is true', () => {
    expect(toPublicImagePath('images/2026/08/a.webp', true)).toBe('a.webp')
    expect(toPublicImagePath('images/blog/2026/08/a.webp', true)).toBe('a.webp')
    expect(toPublicImagePath('images/a.webp', true)).toBe('a.webp')
  })
})

describe('storageKeyToPublicPath', () => {
  it('removes images/ prefix only', () => {
    expect(storageKeyToPublicPath('images/2026/08/a.webp')).toBe('2026/08/a.webp')
  })
})

describe('toStorageKeyFromPublicPath', () => {
  it('maps public relative paths to storage keys', () => {
    expect(toStorageKeyFromPublicPath('2026/08/a.webp')).toBe('images/2026/08/a.webp')
    expect(toStorageKeyFromPublicPath('blog/a.webp')).toBe('images/blog/a.webp')
    expect(toStorageKeyFromPublicPath('a.webp')).toBe('images/a.webp')
  })

  it('accepts legacy full storage keys', () => {
    expect(toStorageKeyFromPublicPath('images/2026/08/a.webp')).toBe('images/2026/08/a.webp')
  })

  it('rejects invalid paths', () => {
    expect(toStorageKeyFromPublicPath('')).toBeNull()
    expect(toStorageKeyFromPublicPath('../../../etc/passwd')).toBeNull()
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

import { describe, expect, it } from 'vitest'
import {
  detectMimeFromSignature,
  validateFileSignature
} from './file-signature'

function bytes(values: number[]): Uint8Array {
  return Uint8Array.from(values)
}

describe('file signature detection', () => {
  it('detects JPEG', () => {
    const jpeg = bytes([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10])
    expect(detectMimeFromSignature(jpeg)).toBe('image/jpeg')
    expect(validateFileSignature('image/jpeg', jpeg)).toBe(true)
  })

  it('detects PNG', () => {
    const png = bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00])
    expect(detectMimeFromSignature(png)).toBe('image/png')
    expect(validateFileSignature('image/png', png)).toBe(true)
  })

  it('detects WebP', () => {
    const webp = bytes([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50
    ])
    expect(detectMimeFromSignature(webp)).toBe('image/webp')
    expect(validateFileSignature('image/webp', webp)).toBe(true)
  })

  it('rejects mismatched mime and bytes', () => {
    const png = bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00])
    expect(validateFileSignature('image/jpeg', png)).toBe(false)
  })
})

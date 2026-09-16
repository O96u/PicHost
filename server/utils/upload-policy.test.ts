import { describe, expect, it } from 'vitest'

import {
  DEFAULT_UPLOAD_MAX_FILE_SIZE_MB,
  normalizeAllowedMimeTypes,
  parseLoginRateMax,
  parsePreserveOriginalUpload,
  parseUploadMaxFileSizeMb,
  parseUploadRateIpMax,
  serializeAllowedMimeTypes,
  serializePreserveOriginalUpload
} from './upload-policy'

describe('upload-policy parsers', () => {
  it('parses upload max file size mb', () => {
    expect(parseUploadMaxFileSizeMb('10')).toBe(10)
    expect(parseUploadMaxFileSizeMb('0')).toBeNull()
    expect(parseUploadMaxFileSizeMb('101')).toBeNull()
  })

  it('normalizes allowed mime types', () => {
    expect(normalizeAllowedMimeTypes('image/png, image/jpeg, image/png')).toEqual([
      'image/png',
      'image/jpeg'
    ])
    expect(normalizeAllowedMimeTypes('image/bmp')).toEqual([])
  })

  it('serializes allowed mime types in canonical order', () => {
    expect(serializeAllowedMimeTypes(['image/webp', 'image/jpeg'])).toBe('image/jpeg,image/webp')
  })

  it('parses rate limit values', () => {
    expect(parseUploadRateIpMax('60')).toBe(60)
    expect(parseLoginRateMax('10')).toBe(10)
    expect(parseUploadRateIpMax('0')).toBeNull()
  })

  it('defaults max file size mb constant matches legacy 10MB', () => {
    expect(DEFAULT_UPLOAD_MAX_FILE_SIZE_MB).toBe(10)
  })

  it('parses preserve original upload flag', () => {
    expect(parsePreserveOriginalUpload('true')).toBe(true)
    expect(parsePreserveOriginalUpload('0')).toBe(false)
    expect(parsePreserveOriginalUpload('')).toBeNull()
    expect(serializePreserveOriginalUpload(true)).toBe('true')
  })
})

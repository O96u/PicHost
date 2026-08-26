import { describe, expect, it } from 'vitest'
import { buildObjectKey, parseS3Config, validateS3Config } from './s3'

describe('S3 backend helpers', () => {
  it('buildObjectKey joins prefix and key', () => {
    expect(buildObjectKey('pichost', 'images/2026/01/a.webp')).toBe(
      'pichost/images/2026/01/a.webp'
    )
    expect(buildObjectKey(undefined, 'images/a.webp')).toBe('images/a.webp')
    expect(buildObjectKey('/pichost/', 'images/a.webp')).toBe('pichost/images/a.webp')
  })

  it('parseS3Config requires endpoint, region and bucket', () => {
    expect(parseS3Config('{}')).toBeNull()
    expect(parseS3Config(JSON.stringify({
      endpoint: 'https://example.r2.cloudflarestorage.com',
      region: 'auto',
      bucket: 'pics'
    }))).toEqual({
      endpoint: 'https://example.r2.cloudflarestorage.com',
      region: 'auto',
      bucket: 'pics',
      prefix: undefined,
      forcePathStyle: false
    })
  })

  it('validateS3Config rejects invalid endpoint', () => {
    expect(validateS3Config({
      endpoint: 'not-a-url',
      region: 'auto',
      bucket: 'pics'
    })).toBeTruthy()
    expect(validateS3Config({
      endpoint: 'https://example.com',
      region: 'auto',
      bucket: ''
    })).toBeTruthy()
    expect(validateS3Config({
      endpoint: 'https://example.com',
      region: 'auto',
      bucket: 'pics'
    })).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import {
  generateStorageBackendId,
  resolveObjectStorageIdPrefix
} from './storage-backends'

describe('resolveObjectStorageIdPrefix', () => {
  it('uses explicit provider when given', () => {
    expect(resolveObjectStorageIdPrefix(
      { endpoint: 'https://example.com' },
      'r2'
    )).toBe('r2')
    expect(resolveObjectStorageIdPrefix(
      { endpoint: 'https://example.com' },
      'aws'
    )).toBe('s3')
  })

  it('detects provider from endpoint', () => {
    expect(resolveObjectStorageIdPrefix({
      endpoint: 'https://abc123.r2.cloudflarestorage.com'
    })).toBe('r2')
    expect(resolveObjectStorageIdPrefix({
      endpoint: 'https://cos.ap-guangzhou.myqcloud.com'
    })).toBe('cos')
    expect(resolveObjectStorageIdPrefix({
      endpoint: 'https://oss-cn-hangzhou.aliyuncs.com'
    })).toBe('oss')
    expect(resolveObjectStorageIdPrefix({
      endpoint: 'https://s3.us-east-1.amazonaws.com'
    })).toBe('s3')
  })
})

describe('generateStorageBackendId', () => {
  it('uses provider-specific prefix', () => {
    expect(generateStorageBackendId('r2')).toMatch(/^r2-[0-9a-f]{8}$/)
    expect(generateStorageBackendId('s3')).toMatch(/^s3-[0-9a-f]{8}$/)
  })
})

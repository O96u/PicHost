import { describe, expect, it } from 'vitest'
import { buildBackendCapacity } from './storage-capacity'

describe('buildBackendCapacity', () => {
  it('calculates quota-based capacity for s3 backends', async () => {
    const quotaBytes = 10 * 1024 ** 3
    const capacity = await buildBackendCapacity('s3-test', 's3', 72_390, quotaBytes)
    expect(capacity.source).toBe('quota')
    expect(capacity.totalBytes).toBe(quotaBytes)
    expect(capacity.usedBytes).toBe(72_390)
    expect(capacity.freeBytes).toBe(quotaBytes - 72_390)
    expect(capacity.percent).toBeGreaterThanOrEqual(0)
  })

  it('allows usage percent to exceed 100 when over quota', async () => {
    const quotaBytes = 1024
    const capacity = await buildBackendCapacity('s3-test', 's3', 2048, quotaBytes)
    expect(capacity.percent).toBe(200)
    expect(capacity.freeBytes).toBe(0)
  })

  it('reads disk stats for local backend when available', async () => {
    const capacity = await buildBackendCapacity('local', 'local', 1024, null)
    if (capacity.source === 'disk') {
      expect(capacity.totalBytes).toBeGreaterThan(0)
      expect(capacity.freeBytes).not.toBeNull()
      expect(capacity.percent).not.toBeNull()
    } else {
      expect(capacity.usedBytes).toBe(1024)
    }
  })
})

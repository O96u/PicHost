import { describe, expect, it } from 'vitest'
import { shouldAutoDeleteImage } from './auto-delete'
import type { StoredImage } from './storage'

function image(userId: number | null, uploadedAt: string): StoredImage {
  return {
    key: 'images/2026/01/a.webp',
    originalName: 'a.webp',
    uploadedAt,
    contentType: 'image/webp',
    size: 100,
    mtimeMs: 0,
    userId
  }
}

const nowMs = Date.parse('2026-09-15T00:00:00.000Z')
const enabledAt = '2026-08-01T00:00:00.000Z'
const adminIds = new Set([1])

describe('shouldAutoDeleteImage', () => {
  it('deletes user images by their own policy after enabled', () => {
    const userPolicies = new Map([[2, { days: 30, enabledAt }]])
    const uploadedAt = '2026-07-01T00:00:00.000Z'
    expect(shouldAutoDeleteImage(
      image(2, uploadedAt),
      { days: 0, enabledAt: null },
      adminIds,
      userPolicies,
      nowMs
    )).toBe(false)
    expect(shouldAutoDeleteImage(
      image(2, '2026-08-05T00:00:00.000Z'),
      { days: 0, enabledAt: null },
      adminIds,
      userPolicies,
      nowMs
    )).toBe(true)
  })

  it('does not delete other users images', () => {
    const userPolicies = new Map([[2, { days: 30, enabledAt }]])
    expect(shouldAutoDeleteImage(
      image(3, '2026-07-01T00:00:00.000Z'),
      { days: 0, enabledAt: null },
      adminIds,
      userPolicies,
      nowMs
    )).toBe(false)
  })

  it('applies admin global policy only to admin or legacy images', () => {
    const globalPolicy = { days: 30, enabledAt }
    const userPolicies = new Map<number, { days: number, enabledAt: string | null }>()

    expect(shouldAutoDeleteImage(
      image(2, '2026-07-01T00:00:00.000Z'),
      globalPolicy,
      adminIds,
      userPolicies,
      nowMs
    )).toBe(false)

    expect(shouldAutoDeleteImage(
      image(1, '2026-07-01T00:00:00.000Z'),
      globalPolicy,
      adminIds,
      userPolicies,
      nowMs
    )).toBe(false)

    expect(shouldAutoDeleteImage(
      image(1, '2026-08-05T00:00:00.000Z'),
      globalPolicy,
      adminIds,
      userPolicies,
      nowMs
    )).toBe(true)

    expect(shouldAutoDeleteImage(
      image(null, '2026-08-05T00:00:00.000Z'),
      globalPolicy,
      adminIds,
      userPolicies,
      nowMs
    )).toBe(true)
  })

  it('keeps recent images', () => {
    const userPolicies = new Map([[2, { days: 30, enabledAt }]])
    expect(shouldAutoDeleteImage(
      image(2, '2026-09-10T00:00:00.000Z'),
      { days: 0, enabledAt: null },
      adminIds,
      userPolicies,
      nowMs
    )).toBe(false)
  })
})

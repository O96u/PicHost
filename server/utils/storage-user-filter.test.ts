import { describe, expect, it } from 'vitest'
import type { StoredImageMeta } from './storage'

function matchesUserFilter(
  meta: StoredImageMeta,
  userFilter: number | 'admin'
): boolean {
  if (userFilter === 'admin') return true
  const ownerId = meta.userId ?? null
  if (ownerId === null) return false
  return ownerId === userFilter
}

describe('image user filter', () => {
  it('admin sees all images including system uploads', () => {
    expect(matchesUserFilter({ userId: null } as StoredImageMeta, 'admin')).toBe(true)
    expect(matchesUserFilter({ userId: 2 } as StoredImageMeta, 'admin')).toBe(true)
  })

  it('regular user sees only own images', () => {
    expect(matchesUserFilter({ userId: 2 } as StoredImageMeta, 2)).toBe(true)
    expect(matchesUserFilter({ userId: 3 } as StoredImageMeta, 2)).toBe(false)
    expect(matchesUserFilter({ userId: null } as StoredImageMeta, 2)).toBe(false)
  })
})

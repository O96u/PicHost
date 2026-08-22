import { describe, expect, it } from 'vitest'
import { validateImageKey } from './image-key'

/**
 * Mirrors assertImageOwnership rules (access.ts) for documentation + regression.
 */
function canOperateImage(
  actor: { type: 'user', id: number, role: 'user' | 'admin' }
    | { type: 'user-token', id: number }
    | { type: 'global-token' },
  ownerId: number | null
): boolean {
  if (actor.type === 'global-token') return true
  if (actor.type === 'user-token') {
    return ownerId === actor.id
  }
  if (actor.role === 'admin') return true
  return ownerId !== null && ownerId === actor.id
}

describe('image ownership rules', () => {
  it('regular user can only operate own images', () => {
    const user1 = { type: 'user' as const, id: 1, role: 'user' as const }
    expect(canOperateImage(user1, 1)).toBe(true)
    expect(canOperateImage(user1, 2)).toBe(false)
    expect(canOperateImage(user1, null)).toBe(false)
  })

  it('admin can operate any image', () => {
    const admin = { type: 'user' as const, id: 1, role: 'admin' as const }
    expect(canOperateImage(admin, 2)).toBe(true)
    expect(canOperateImage(admin, null)).toBe(true)
  })

  it('user API token is scoped to owner', () => {
    const token = { type: 'user-token' as const, id: 2 }
    expect(canOperateImage(token, 2)).toBe(true)
    expect(canOperateImage(token, 1)).toBe(false)
    expect(canOperateImage(token, null)).toBe(false)
  })

  it('global API token can operate any image', () => {
    const token = { type: 'global-token' as const }
    expect(canOperateImage(token, 1)).toBe(true)
    expect(canOperateImage(token, null)).toBe(true)
  })
})

describe('path traversal hardening', () => {
  it('rejects keys that could escape data dir', () => {
    const attacks = [
      'images/2026/08/../secret.webp',
      'images/../../../etc/passwd',
      'images//2026/08/a.webp',
      '/images/2026/08/a.webp',
      'images/2026/08/%2e%2e/other.webp'
    ]
    for (const key of attacks) {
      expect(validateImageKey(key), key).toBe(false)
    }
  })
})

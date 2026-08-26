import { describe, expect, it } from 'vitest'
import { LOCAL_BACKEND_ID } from '../storage-backends'

describe('storage resolver constants', () => {
  it('uses stable local backend id', () => {
    expect(LOCAL_BACKEND_ID).toBe('local')
  })
})

describe('default backend routing', () => {
  it('returns local when no env override and local is default', async () => {
    const original = process.env.STORAGE_BACKEND
    delete process.env.STORAGE_BACKEND

    const { setDefaultBackend, LOCAL_BACKEND_ID } = await import('../storage-backends')
    setDefaultBackend(LOCAL_BACKEND_ID)

    const { getActiveBackend } = await import('./resolver')
    const backend = await getActiveBackend()
    expect(backend.type).toBe('local')

    if (original !== undefined) {
      process.env.STORAGE_BACKEND = original
    }
  })
})

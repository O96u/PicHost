import { describe, expect, it, vi, afterEach } from 'vitest'
import { findImageKeyByDatePath, findImageKeyByFilename } from './image-index'
import { requestPathToImageKey } from './serve-image'

vi.mock('./image-index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./image-index')>()
  return {
    ...actual,
    findImageKeyByFilename: vi.fn(actual.findImageKeyByFilename),
    findImageKeyByDatePath: vi.fn(actual.findImageKeyByDatePath)
  }
})

describe('requestPathToImageKey hide folder', () => {
  afterEach(() => {
    vi.mocked(findImageKeyByFilename).mockReset()
    vi.mocked(findImageKeyByDatePath).mockReset()
  })

  it('resolves bare filename via index when hide folder is enabled', () => {
    vi.mocked(findImageKeyByFilename).mockReturnValue('images/2026/08/demo.webp')
    expect(requestPathToImageKey('/demo.webp', { hideFolder: true }))
      .toBe('images/2026/08/demo.webp')
  })

  it('does not guess flat images/name when hide folder is enabled', () => {
    vi.mocked(findImageKeyByFilename).mockReturnValue(null)
    expect(requestPathToImageKey('/demo.webp', { hideFolder: true })).toBeNull()
  })

  it('resolves hidden date path to default folder key', () => {
    expect(requestPathToImageKey('/2026/08/demo.webp', { hideFolder: true }))
      .toBe('images/2026/08/demo.webp')
  })

  it('still accepts full key when hide folder is enabled', () => {
    expect(requestPathToImageKey('/images/2026/08/demo.webp', { hideFolder: true }))
      .toBe('images/2026/08/demo.webp')
    expect(requestPathToImageKey('/images/demo.webp', { hideFolder: true }))
      .toBe('images/demo.webp')
  })

  it('resolves public paths when hide folder is disabled', () => {
    expect(requestPathToImageKey('/2026/08/demo.webp', { hideFolder: false }))
      .toBe('images/2026/08/demo.webp')
    expect(requestPathToImageKey('/blog/demo.webp', { hideFolder: false }))
      .toBe('images/blog/demo.webp')
    expect(requestPathToImageKey('/demo.webp', { hideFolder: false }))
      .toBe('images/demo.webp')
  })

  it('accepts legacy full key when hide folder is disabled', () => {
    expect(requestPathToImageKey('/images/demo.webp', { hideFolder: false }))
      .toBe('images/demo.webp')
  })
})

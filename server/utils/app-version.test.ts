import { describe, expect, it } from 'vitest'
import { isVersionNewer, normalizeVersionTag, parseVersionParts } from './app-version'

describe('app-version', () => {
  it('normalizes tag prefixes', () => {
    expect(normalizeVersionTag('v1.1.2')).toBe('1.1.2')
    expect(normalizeVersionTag('V2.0.0')).toBe('2.0.0')
  })

  it('parses dotted versions', () => {
    expect(parseVersionParts('1.10.3')).toEqual([1, 10, 3])
  })

  it('detects newer versions', () => {
    expect(isVersionNewer('1.2.0', '1.1.2')).toBe(true)
    expect(isVersionNewer('1.1.2', '1.1.2')).toBe(false)
    expect(isVersionNewer('1.1.1', '1.1.2')).toBe(false)
    expect(isVersionNewer('2.0.0', '1.9.9')).toBe(true)
  })
})

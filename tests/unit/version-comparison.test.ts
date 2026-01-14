import { describe, expect, it } from 'vitest'
import {
  compareVersions,
  isVersionGreater,
  isVersionGreaterOrEqual,
} from '@/utils/version-comparison'

describe('compareVersions', () => {
  it('returns 0 for equal versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('2.1.3', '2.1.3')).toBe(0)
  })

  it('returns 1 when first version is greater', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBe(1)
    expect(compareVersions('1.1.0', '1.0.0')).toBe(1)
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1)
  })

  it('returns -1 when first version is less', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBe(-1)
    expect(compareVersions('1.0.0', '1.1.0')).toBe(-1)
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1)
  })

  it('handles versions with different part counts', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0)
    expect(compareVersions('1.0.0', '1.0')).toBe(0)
    expect(compareVersions('1.1', '1.0.1')).toBe(1)
  })
})

describe('isVersionGreater', () => {
  it('returns true when v1 > v2', () => {
    expect(isVersionGreater('1.2.0', '1.1.0')).toBe(true)
    expect(isVersionGreater('2.0.0', '1.9.9')).toBe(true)
  })

  it('returns false when v1 <= v2', () => {
    expect(isVersionGreater('1.0.0', '1.0.0')).toBe(false)
    expect(isVersionGreater('1.0.0', '1.1.0')).toBe(false)
  })
})

describe('isVersionGreaterOrEqual', () => {
  it('returns true when v1 >= v2', () => {
    expect(isVersionGreaterOrEqual('1.2.0', '1.1.0')).toBe(true)
    expect(isVersionGreaterOrEqual('1.1.0', '1.1.0')).toBe(true)
  })

  it('returns false when v1 < v2', () => {
    expect(isVersionGreaterOrEqual('1.0.0', '1.1.0')).toBe(false)
  })
})

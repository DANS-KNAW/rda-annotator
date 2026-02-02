import { describe, expect, it } from 'vitest'
import { isBlockedUrl } from '@/utils/url-blocklist'

describe('isBlockedUrl', () => {
  it('blocks exact hostname + path prefix match', () => {
    expect(isBlockedUrl('https://orcid.org/oauth/authorize')).toBe(true)
  })

  it('blocks URL with query parameters', () => {
    expect(isBlockedUrl('https://orcid.org/oauth/authorize?client_id=abc&redirect_uri=https://example.com')).toBe(true)
  })

  it('blocks URL with trailing path segments', () => {
    expect(isBlockedUrl('https://orcid.org/oauth/authorize/extra')).toBe(true)
  })

  it('blocks subdomain match', () => {
    expect(isBlockedUrl('https://sandbox.orcid.org/oauth/authorize')).toBe(true)
  })

  it('does not block different path on same domain', () => {
    expect(isBlockedUrl('https://orcid.org/my-orcid')).toBe(false)
  })

  it('does not block different domain', () => {
    expect(isBlockedUrl('https://example.com/oauth/authorize')).toBe(false)
  })

  it('does not block partial hostname match', () => {
    expect(isBlockedUrl('https://notorcid.org/oauth/authorize')).toBe(false)
  })

  it('handles about:blank gracefully', () => {
    expect(isBlockedUrl('about:blank')).toBe(false)
  })

  it('handles empty string gracefully', () => {
    expect(isBlockedUrl('')).toBe(false)
  })

  it('allows normal URLs', () => {
    expect(isBlockedUrl('https://www.wikipedia.org/')).toBe(false)
    expect(isBlockedUrl('https://example.com')).toBe(false)
  })
})

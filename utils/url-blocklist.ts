/**
 * URL patterns where the content script should NOT inject.
 * Each entry specifies a hostname and optional path prefix.
 */
const BLOCKED_URL_PATTERNS: Array<{
  hostname: string
  pathPrefix?: string
}> = [
  { hostname: 'orcid.org', pathPrefix: '/oauth/authorize' },
]

/**
 * Check if a URL matches any blocked pattern.
 * Returns true if the content script should NOT run on this page.
 */
export function isBlockedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return BLOCKED_URL_PATTERNS.some((pattern) => {
      const hostnameMatch
        = parsed.hostname === pattern.hostname
          || parsed.hostname.endsWith(`.${pattern.hostname}`)
      if (!hostnameMatch)
        return false
      if (pattern.pathPrefix) {
        return parsed.pathname.startsWith(pattern.pathPrefix)
      }
      return true
    })
  }
  catch {
    return false
  }
}

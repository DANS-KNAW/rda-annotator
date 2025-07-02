/**
 * Returns true if this instance of the Hypothesis client is one distributed in
 * a browser extension, false if it's one embedded in a website.
 *
 * @NOTE This can be removed as we will only have the extension for RDA
 */
export function isBrowserExtension(url: string): boolean {
  return !(url.startsWith("http://") || url.startsWith("https://"));
}

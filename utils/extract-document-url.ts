/**
 * Extract the actual document URL from a tab URL.
 * This is used in the sidebar to get the real PDF URL when the tab is showing our PDF viewer.
 *
 * Similar to getDocumentURL() but works with tab URLs instead of window.location.
 */
export function extractDocumentURL(tabUrl: string): string {
  try {
    const urlObj = new URL(tabUrl)

    // Check if this is our PDF.js viewer by looking for the ?file= parameter
    const fileParam = urlObj.searchParams.get('file')
    if (fileParam && urlObj.pathname.includes('/pdfjs/web/viewer.html')) {
      // This is our PDF viewer, return the original PDF URL
      return fileParam
    }
  }
  catch (error) {
    console.warn('[RDA] Failed to parse tab URL:', error)
  }

  // Not in our PDF viewer, return the URL as-is
  return tabUrl
}

/**
 * Get the actual document URL, handling the case where we're in our PDF.js viewer.
 *
 * When viewing a PDF in our custom viewer, the browser URL is:
 *   chrome-extension://.../pdfjs/web/viewer.html?file=<original-pdf-url>
 *
 * But we want to use the original PDF URL for annotations, not the extension URL.
 */
export function getDocumentURL(): string {
  const currentURL = window.location.href;

  try {
    const urlObj = new URL(currentURL);

    // Check if we're in our PDF.js viewer by looking for the ?file= parameter
    const fileParam = urlObj.searchParams.get("file");
    if (fileParam && urlObj.pathname.includes("/pdfjs/web/viewer.html")) {
      // We're in our PDF viewer, return the original PDF URL
      return fileParam;
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[RDA] Failed to parse URL:", error);
    }
  }

  // Not in our PDF viewer, return the current URL as-is
  return currentURL;
}

/**
 * Check if we're currently in our custom PDF.js viewer
 */
export function isInPDFViewer(): boolean {
  const currentURL = window.location.href;

  try {
    const urlObj = new URL(currentURL);

    // Check if URL is an extension URL and matches our extension ID
    const extensionId = browser.runtime.id;
    const isOurExtension =
      urlObj.protocol === "chrome-extension:" &&
      urlObj.hostname === extensionId;

    // Check if it's our PDF viewer page
    const isPDFViewerPath = urlObj.pathname.includes("/pdfjs/web/viewer.html");
    const hasFileParam = urlObj.searchParams.has("file");

    return isOurExtension && isPDFViewerPath && hasFileParam;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[RDA] Failed to check PDF viewer status:", error);
    }
    return false;
  }
}

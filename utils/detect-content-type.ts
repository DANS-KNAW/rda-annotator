import { isInPDFViewer } from "./document-url";

export type PDFContentType = { type: "PDF" };
export type HTMLContentType = { type: "HTML" };

/** Details of the detected content type. */
export type ContentTypeInfo = PDFContentType | HTMLContentType;

/**
 * Detect the type of content in the current document.
 *
 * @param document_ - Document to query
 */
export function detectContentType(
  document_ = document
): ContentTypeInfo | null {
  function detectChromePDFViewer(): PDFContentType | null {
    // Check for embed element with PDF MIME type
    if (document_.querySelector('embed[type="application/pdf"]')) {
      return { type: "PDF" };
    }

    // Detect Chrome's PDF viewer using out-of-process iframes (OOPIF)
    if (typeof (globalThis as any).chrome !== "undefined") {
      const chromeApi = (globalThis as any).chrome;
      // @ts-ignore - chrome.dom is Chrome-specific API
      const bodyShadow = chromeApi.dom?.openOrClosedShadowRoot?.(
        document_.body
      );
      if (
        bodyShadow &&
        bodyShadow.querySelector('iframe[type="application/pdf"]')
      ) {
        return { type: "PDF" };
      }
    }

    return null;
  }

  function detectFirefoxPDFViewer(): PDFContentType | null {
    if (document_.baseURI.indexOf("resource://pdf.js") === 0) {
      return { type: "PDF" };
    }
    return null;
  }

  function detectCustomPDFJSViewer(): PDFContentType | null {
    if (isInPDFViewer()) {
      return { type: "PDF" };
    }
    return null;
  }

  function detectExistingPDFJSViewer(): PDFContentType | null {
    // Check if page already has PDF.js loaded (like embedded viewers)
    // This is important for pages like Zenodo that use their own PDF.js
    if ((window as any).PDFViewerApplication !== undefined) {
      return { type: "PDF" };
    }
    return null;
  }

  const detectFns = [
    detectChromePDFViewer,
    detectFirefoxPDFViewer,
    detectCustomPDFJSViewer,
    detectExistingPDFJSViewer,
  ];

  for (let i = 0; i < detectFns.length; i++) {
    const typeInfo = detectFns[i]();
    if (typeInfo) {
      return typeInfo;
    }
  }

  return { type: "HTML" };
}

/**
 * Check if a URL points to a direct PDF file (not a preview/embed page).
 */
export function isPDFURL(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    // Exclude common preview/embed/viewer paths that return HTML
    const excludedPathPatterns = [
      "/preview/",
      "/viewer/",
      "/embed/",
      "/view/",
      "/display/",
    ];

    for (const pattern of excludedPathPatterns) {
      if (pathname.includes(pattern)) {
        return false;
      }
    }

    if (pathname.endsWith(".pdf")) {
      return true;
    }

    const contentType = urlObj.searchParams.get("content-type");
    if (contentType && contentType.includes("application/pdf")) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

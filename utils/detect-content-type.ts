import { isInPDFViewer } from "./document-url";

export type PDFContentType = { type: "PDF" };
export type HTMLContentType = { type: "HTML" };

/** Details of the detected content type. */
export type ContentTypeInfo = PDFContentType | HTMLContentType;

async function waitForPDFJS(win: Window = window): Promise<boolean> {
  const startTime = Date.now();
  const globalTimeout = 15000;

  while (Date.now() - startTime < globalTimeout) {
    if ((win as any).PDFViewerApplication !== undefined) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const app = (win as any).PDFViewerApplication;
  if (!app) {
    return false;
  }

  if (app.initialized) {
    return true;
  }

  if (app.initializedPromise) {
    try {
      await Promise.race([
        app.initializedPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 15000)
        ),
      ]);
      return true;
    } catch {
      return !!app.initialized;
    }
  }

  const doc = win.document;
  return new Promise<boolean>((resolve) => {
    const onViewerLoaded = () => {
      if (app.initializedPromise) {
        app.initializedPromise
          .then(() => resolve(true))
          .catch(() => resolve(!!app.initialized));
      } else {
        resolve(!!app.initialized);
      }
    };

    doc.addEventListener("webviewerloaded", onViewerLoaded, { once: true });

    setTimeout(() => {
      doc.removeEventListener("webviewerloaded", onViewerLoaded);
      resolve(!!app.initialized);
    }, 15000);
  });
}

/**
 * Detect the type of content in the current document.
 *
 * @param document_ - Document to query
 * @param win - Window context to check (for iframe support)
 */
export function detectContentType(
  document_ = document,
  win: Window = window
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
    if (isInPDFViewer(win)) {
      return { type: "PDF" };
    }
    return null;
  }

  function detectExistingPDFJSViewer(): PDFContentType | null {
    // Check if page already has PDF.js loaded (like embedded viewers)
    // This is important for pages like Zenodo that use their own PDF.js
    if ((win as any).PDFViewerApplication !== undefined) {
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

export async function detectContentTypeAsync(
  document_ = document,
  win: Window = window
): Promise<ContentTypeInfo | null> {
  const immediate = detectContentType(document_, win);
  if (immediate?.type === "PDF") {
    return immediate;
  }

  const url = win.location.href.toLowerCase();
  if (
    url.includes("/preview/") ||
    url.includes("viewer.html") ||
    url.includes(".pdf")
  ) {
    const found = await waitForPDFJS(win);
    if (found) {
      return { type: "PDF" };
    }
  }

  return immediate;
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

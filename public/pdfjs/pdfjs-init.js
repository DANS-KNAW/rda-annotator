/**
 * PDF.js Initialization Script for RDA Annotator
 *
 * This script runs inside the PDF.js viewer page and waits for the viewer to be ready,
 * then manually loads the content script since extension pages don't auto-inject.
 */

(async function () {
  try {
    // Wait for PDF.js viewer to be loaded
    await new Promise((resolve) => {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", resolve);
      } else {
        resolve();
      }
    });

    // Wait for the webviewerloaded event from PDF.js
    await new Promise((resolve) => {
      if (window.PDFViewerApplication?.initialized) {
        resolve();
      } else {
        document.addEventListener("webviewerloaded", () => {
          if (window.PDFViewerApplication?.initializedPromise) {
            window.PDFViewerApplication.initializedPromise.then(resolve);
          } else {
            resolve();
          }
        });
      }
    });

    const marker = document.createElement("meta");
    marker.setAttribute("data-rda-pdf-viewer", "true");
    document.head.appendChild(marker);

    const script = document.createElement("script");
    script.type = "module";
    script.src = "/content-scripts/content.js";
    script.onerror = (error) => {
      console.error("[RDA PDF.js Init] Failed to load content script:", error);
    };
    document.head.appendChild(script);
  } catch (error) {
    console.error("[RDA PDF.js Init] Error during initialization:", error);
  }
})();

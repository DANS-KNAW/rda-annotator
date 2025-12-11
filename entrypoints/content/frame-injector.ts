import { ContentScriptContext } from "#imports";
import { detectContentTypeAsync } from "@/utils/detect-content-type";
import { AnnotationManager } from "./annotation-manager";
import { createAnnotatorPopup } from "./annotator-popup";
import { waitForPDFReady } from "@/utils/anchoring/pdf";
import { isDev } from "@/utils/is-dev";

/**
 * Frame Injector
 *
 * Injects the RDA annotator (without sidebar) into same-origin iframes.
 * Handles both HTML and PDF frames.
 *
 */

interface FrameGuestInstance {
  annotationManager: AnnotationManager;
  annotatorPopup: Awaited<ReturnType<typeof createAnnotatorPopup>> | null;
  cleanup: () => void;
}

/**
 * Wait for frame document to be ready
 */
async function waitForFrameReady(frame: HTMLIFrameElement): Promise<boolean> {
  return new Promise((resolve) => {
    const doc = frame.contentDocument;
    if (!doc) {
      resolve(false);
      return;
    }

    if (doc.readyState === "complete" || doc.readyState === "interactive") {
      resolve(true);
      return;
    }

    const onLoad = () => {
      frame.removeEventListener("load", onLoad);
      resolve(true);
    };

    frame.addEventListener("load", onLoad);

    // Timeout after 10 seconds
    setTimeout(() => {
      frame.removeEventListener("load", onLoad);
      resolve(false);
    }, 10000);
  });
}

/**
 * Check if frame already has RDA injected
 */
function hasRDAInjected(frame: HTMLIFrameElement): boolean {
  try {
    const doc = frame.contentDocument;
    if (!doc) return false;
    return doc.querySelector("[data-rda-injected]") !== null;
  } catch {
    return false;
  }
}

/**
 * Inject the annotator into a frame as a "guest"
 */
export async function injectIntoFrame(
  frame: HTMLIFrameElement,
  ctx: ContentScriptContext
): Promise<FrameGuestInstance | null> {
  // Check if already injected
  if (hasRDAInjected(frame)) {
    return null;
  }

  // Wait for frame to be ready
  const ready = await waitForFrameReady(frame);
  if (!ready) {
    if (isDev) {
      console.warn("[RDA Frame Injector] Frame not ready, skipping");
    }
    return null;
  }

  const frameDoc = frame.contentDocument;
  const frameWindow = frame.contentWindow;

  if (!frameDoc || !frameWindow) {
    if (isDev) {
      console.warn(
        "[RDA Frame Injector] Cannot access frame document or window"
      );
    }
    return null;
  }

  // Register frame URL IMMEDIATELY - sidebar can fetch annotations right away
  // This is independent of PDF readiness - just a URL query to Elasticsearch
  const frameUrl = frameWindow.location.href;
  console.log("[RDA Frame Injector] Registering frame URL:", frameUrl);
  frameWindow.parent.postMessage(
    {
      type: "rda:registerFrameUrl",
      url: frameUrl,
      source: "frame-injector",
    },
    "*"
  );
  console.log("[RDA Frame Injector] Posted registerFrameUrl message to parent");

  const contentType = await detectContentTypeAsync(frameDoc);

  // For PDFs, check if PDF.js is ready in the FRAME window (not host window)
  // Don't fail if not ready - AnnotationManager will handle retry logic
  if (contentType?.type === "PDF") {
    try {
      const isReady = await waitForPDFReady(frameWindow);
      if (!isReady && isDev) {
        console.log(
          "[RDA Frame Injector] PDF.js not ready yet, AnnotationManager will retry"
        );
      }
    } catch (error) {
      if (isDev) {
        console.warn(
          "[RDA Frame Injector] Error checking PDF ready, continuing anyway:",
          error
        );
      }
    }
  }

  const marker = frameDoc.createElement("meta");
  marker.setAttribute("data-rda-injected", "true");
  marker.setAttribute("data-rda-frame-type", "guest");
  marker.setAttribute("data-rda-content-type", contentType?.type || "HTML");
  frameDoc.head.appendChild(marker);

  const annotationManager = new AnnotationManager({
    rootElement: frameDoc.body,
    documentUrl: frameUrl,
    isPDF: contentType?.type === "PDF",
    isGuestFrame: true,
    onHighlightClick: async (annotationIds) => {
      frameWindow.parent.postMessage(
        {
          type: "rda:showAnnotations",
          annotationIds,
          source: "frame-injector",
        },
        "*"
      );
    },
    onHighlightHover: async (annotationIds) => {
      frameWindow.parent.postMessage(
        {
          type: "rda:hoverAnnotations",
          annotationIds,
          source: "frame-injector",
        },
        "*"
      );
    },
  });

  // Load annotations for this frame
  await annotationManager.loadAnnotations();

  // Set highlights visible
  annotationManager.setHighlightsVisible(true);

  return {
    annotationManager,
    annotatorPopup: null,
    cleanup: () => {
      annotationManager.destroy();
    },
  };
}

/**
 * Anchor status type matching AnnotationManager.getAnchorStatus() return type
 */
interface AnchorStatus {
  anchored: string[];
  pending: string[];
  orphaned: string[];
  recovered: string[];
}

/**
 * Frame Injector class that monitors frames and injects the annotator
 */
export class FrameInjector {
  private injectedFrames = new Map<HTMLIFrameElement, FrameGuestInstance>();
  private ctx: ContentScriptContext;

  constructor(ctx: ContentScriptContext) {
    this.ctx = ctx;
  }

  /**
   * Inject into a specific frame
   */
  async injectFrame(frame: HTMLIFrameElement): Promise<void> {
    // Check if already injected
    if (this.injectedFrames.has(frame)) {
      return;
    }

    const instance = await injectIntoFrame(frame, this.ctx);
    if (instance) {
      this.injectedFrames.set(frame, instance);
    }
  }

  /**
   * Remove injection from a frame
   */
  removeFrame(frame: HTMLIFrameElement): void {
    const instance = this.injectedFrames.get(frame);
    if (instance) {
      instance.cleanup();
      this.injectedFrames.delete(frame);
    }
  }

  /**
   * Get anchor statuses from all same-origin guest frames (direct access)
   */
  getAllGuestStatuses(): AnchorStatus[] {
    const statuses: AnchorStatus[] = [];
    for (const [, instance] of this.injectedFrames) {
      statuses.push(instance.annotationManager.getAnchorStatus());
    }
    return statuses;
  }

  /**
   * Reload annotations in all same-origin guest frames (direct access)
   */
  async reloadAllGuestAnnotations(): Promise<void> {
    for (const [, instance] of this.injectedFrames) {
      await instance.annotationManager.loadAnnotations();
    }
  }

  /**
   * Clean up all injected frames
   */
  destroy(): void {
    for (const [, instance] of this.injectedFrames) {
      instance.cleanup();
    }
    this.injectedFrames.clear();
  }
}

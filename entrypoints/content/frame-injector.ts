import { ContentScriptContext } from "#imports";
import { detectContentType } from "@/utils/detect-content-type";
import { AnnotationManager } from "./annotation-manager";
import { createAnnotatorPopup } from "./annotator-popup";

/**
 * Frame Injector
 *
 * Injects the RDA annotator (without sidebar) into same-origin iframes.
 * Handles both HTML and PDF frames.
 *
 */

interface FrameGuestInstance {
  annotationManager: AnnotationManager;
  annotatorPopup: Awaited<ReturnType<typeof createAnnotatorPopup>>;
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
    console.log("[RDA Frame Injector] Already injected, skipping");
    return null;
  }

  // Wait for frame to be ready
  const ready = await waitForFrameReady(frame);
  if (!ready) {
    console.warn("[RDA Frame Injector] Frame not ready, skipping");
    return null;
  }

  const frameDoc = frame.contentDocument;
  if (!frameDoc) {
    console.warn("[RDA Frame Injector] Cannot access frame document");
    return null;
  }

  // Detect content type
  const contentType = detectContentType(frameDoc);
  console.log("[RDA Frame Injector] Frame content type:", contentType);

  // Mark as injected
  const marker = frameDoc.createElement("meta");
  marker.setAttribute("data-rda-injected", "true");
  marker.setAttribute("data-rda-frame", "guest");
  frameDoc.head.appendChild(marker);

  // Create annotation manager for this frame
  const annotationManager = new AnnotationManager({
    rootElement: frameDoc.body,
    onHighlightClick: async (annotationIds) => {
      // Send message to parent frame to show annotations
      window.postMessage(
        {
          type: "rda:showAnnotations",
          annotationIds,
          source: "frame",
        },
        "*"
      );
    },
    onHighlightHover: async (annotationIds) => {
      // Send hover state to parent
      window.postMessage(
        {
          type: "rda:hoverAnnotations",
          annotationIds,
          source: "frame",
        },
        "*"
      );
    },
  });

  // Create annotator popup for this frame
  const annotatorPopup = await createAnnotatorPopup({
    ctx,
    onAnnotate: async () => {
      window.postMessage(
        {
          type: "rda:openSidebar",
          source: "frame",
        },
        "*"
      );
    },
    onCreateTemporaryHighlight: async (range) => {
      await annotationManager.createTemporaryHighlight(range);
    },
  });

  // Mount the annotator popup
  annotatorPopup.mount();

  // Load annotations for this frame
  await annotationManager.loadAnnotations();

  // Set highlights visible
  annotationManager.setHighlightsVisible(true);

  console.log("[RDA Frame Injector] Successfully injected into frame");

  return {
    annotationManager,
    annotatorPopup,
    cleanup: () => {
      annotationManager.destroy();
      annotatorPopup.remove();
    },
  };
}

/**
 * Frame Injector class that monitors frames and injects the annotator
 */
export class FrameInjector {
  private injectedFrames = new WeakMap<HTMLIFrameElement, FrameGuestInstance>();
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
   * Clean up all injected frames
   */
  destroy(): void {
    // Cannot iterate WeakMap, so nothing to do here
    // Individual frames will clean up when garbage collected
  }
}

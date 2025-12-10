import { onMessage, sendMessage } from "@/utils/messaging";
import { createHost } from "./host";
import { FrameObserver } from "./frame-observer";
import { AnnotationManager } from "./annotation-manager";
import { FrameInjector } from "./frame-injector";
import { detectContentType } from "@/utils/detect-content-type";
import { waitForPDFReady } from "@/utils/anchoring/pdf";
import { getDocumentURL } from "@/utils/document-url";
import { createAnnotatorPopup } from "./annotator-popup";

// Declare global window property for atomic injection guard
declare global {
  interface Window {
    __RDA_CONTENT_SCRIPT_INITIALIZED__?: boolean;
  }
}

interface AnchorStatus {
  anchored: string[];
  pending: string[];
  orphaned: string[];
  recovered: string[];
}

/**
 * Merge multiple anchor statuses into one, deduplicating IDs.
 * An annotation successfully anchored in ANY frame is not considered orphaned.
 * This prevents false orphans from frames with same URL but different content
 * (e.g., srcdoc iframes that inherit parent URL but have ad content).
 */
function mergeAnchorStatuses(statuses: AnchorStatus[]): AnchorStatus {
  const anchored = [...new Set(statuses.flatMap((s) => s.anchored))];
  const recovered = [...new Set(statuses.flatMap((s) => s.recovered))];
  const pending = [...new Set(statuses.flatMap((s) => s.pending))];
  const allOrphaned = [...new Set(statuses.flatMap((s) => s.orphaned))];

  // Filter out orphaned IDs that were successfully anchored in any frame
  const successfullyAnchored = new Set([...anchored, ...recovered]);
  const orphaned = allOrphaned.filter((id) => !successfullyAnchored.has(id));

  return { anchored, pending, orphaned, recovered };
}

/**
 * Request anchor statuses from ALL iframes via postMessage
 * This includes both same-origin and cross-origin frames that have their own
 * content script (via allFrames:true) and manage their own AnnotationManager.
 * Returns statuses from frames that respond within timeout.
 */
async function requestAllFrameStatuses(): Promise<AnchorStatus[]> {
  return new Promise((resolve) => {
    const statuses: AnchorStatus[] = [];
    const pendingFrames = new Set<Window>();

    // Find ALL iframes - both same-origin and cross-origin
    // Same-origin frames with allFrames:true have their own content script
    // and need to be queried via postMessage just like cross-origin ones
    const frames = document.querySelectorAll("iframe");
    frames.forEach((frame) => {
      if (frame.contentWindow) {
        pendingFrames.add(frame.contentWindow);
      }
    });

    if (pendingFrames.size === 0) {
      resolve([]);
      return;
    }

    const handler = (event: MessageEvent) => {
      if (event.data.type === "rda:anchorStatusResponse" && event.data.status) {
        statuses.push(event.data.status);
        pendingFrames.delete(event.source as Window);
        if (pendingFrames.size === 0) {
          window.removeEventListener("message", handler);
          resolve(statuses);
        }
      }
    };
    window.addEventListener("message", handler);

    pendingFrames.forEach((win) => {
      win.postMessage({ type: "rda:requestAnchorStatus" }, "*");
    });

    setTimeout(() => {
      window.removeEventListener("message", handler);
      resolve(statuses);
    }, 500);
  });
}

/**
 * Broadcast a message to all cross-origin frames
 */
function broadcastToCrossOriginFrames(message: { type: string }): void {
  const frames = document.querySelectorAll("iframe");
  frames.forEach((frame) => {
    try {
      if (!frame.contentDocument && frame.contentWindow) {
        frame.contentWindow.postMessage(message, "*");
      }
    } catch {
      // Security error means cross-origin
      if (frame.contentWindow) {
        frame.contentWindow.postMessage(message, "*");
      }
    }
  });
}

export default defineContentScript({
  matches: ["*://*/*"],
  allFrames: true,
  matchAboutBlank: true,
  runAt: "document_end",

  async main(ctx) {
    const isTopFrame = window.self === window.top;

    // Atomic injection guard using synchronous window property
    // This prevents race conditions where multiple content script instances
    // could pass the DOM marker check before any marker is created
    if (window.__RDA_CONTENT_SCRIPT_INITIALIZED__) {
      if (import.meta.env.DEV) {
        console.warn("[RDA Boot] Already injected (window flag), skipping");
      }
      return;
    }
    window.__RDA_CONTENT_SCRIPT_INITIALIZED__ = true;

    // Also check DOM marker as secondary guard (for edge cases like page restore)
    if (document.querySelector("[data-rda-injected]")) {
      if (import.meta.env.DEV) {
        console.warn("[RDA Boot] Already injected (DOM marker), skipping");
      }
      return;
    }

    // Mark as injected in DOM for debugging/inspection
    const marker = document.createElement("meta");
    marker.setAttribute("data-rda-injected", "true");
    marker.setAttribute("data-rda-frame-type", isTopFrame ? "host" : "guest");
    document.head.appendChild(marker);

    const contentType = detectContentType();

    // Also check URL for PDF hints (in case PDF.js hasn't loaded yet)
    const url = window.location.href.toLowerCase();
    const urlLooksLikePDF =
      url.includes("/preview/") ||
      url.includes("viewer.html") ||
      url.endsWith(".pdf") ||
      url.includes(".pdf?");

    const isPDF = contentType?.type === "PDF" || urlLooksLikePDF;
    marker.setAttribute("data-rda-content-type", isPDF ? "PDF" : "HTML");

    let host: Awaited<ReturnType<typeof createHost>> | null = null;
    let annotationManager: AnnotationManager | null = null;
    let frameInjector: FrameInjector | null = null;
    let guestAnnotatorPopup: Awaited<
      ReturnType<typeof import("./annotator-popup").createAnnotatorPopup>
    > | null = null;

    if (isTopFrame) {
      // Send host URL directly to background
      sendMessage("registerFrameUrl", { url: getDocumentURL() }).catch(
        () => {}
      );

      window.addEventListener("message", async (event) => {
        if (event.data.type === "rda:showAnnotations") {
          if (!host) return;

          if (!host.isMounted.sidebar) {
            await host.mount();
          }
          await host.openSidebar();

          try {
            await sendMessage("showAnnotationsFromHighlight", {
              annotationIds: event.data.annotationIds,
            });
          } catch (error) {
            console.error(
              "[RDA Host] Failed to show annotations from frame:",
              error
            );
          }
        } else if (event.data.type === "rda:hoverAnnotations") {
          try {
            await sendMessage("hoverAnnotations", {
              annotationIds: event.data.annotationIds,
            }).catch(() => {
              // Sidebar might not be ready yet, ignore
            });
          } catch (error) {
            console.error(
              "[RDA Host] Failed to forward hover from frame:",
              error
            );
          }
        } else if (event.data.type === "rda:openSidebar") {
          if (!host) return;

          if (!host.isMounted.sidebar) {
            await host.mount();
          }
          await host.openSidebar();
        } else if (event.data.type === "rda:scrollToAnnotation") {
          if (annotationManager && event.data.annotationId) {
            await annotationManager.scrollToAnnotation(event.data.annotationId);
          }
        } else if (event.data.type === "rda:anchorStatusUpdate") {
          // Forward anchor status updates from guest frames to the sidebar
          try {
            await sendMessage("anchorStatusUpdate", {
              annotationId: event.data.annotationId,
              status: event.data.status,
            });
          } catch (error) {
            // Sidebar might not be ready yet, ignore
          }
        }
      });

      frameInjector = new FrameInjector(ctx);
      annotationManager = new AnnotationManager({
        // Handle clicks on highlights - open sidebar and show annotation(s)
        onHighlightClick: async (annotationIds) => {
          if (!host) return;

          if (!host.isMounted.sidebar) {
            await host.mount();
          }

          await host.openSidebar();

          try {
            await sendMessage("showAnnotationsFromHighlight", {
              annotationIds,
            });
          } catch (error) {
            console.error(
              "[RDA] Failed to show annotations from highlight:",
              error
            );
          }
        },

        onHighlightHover: async (annotationIds) => {
          try {
            await sendMessage("hoverAnnotations", { annotationIds }).catch(
              () => {
                // Sidebar might not be ready yet, ignore
              }
            );
          } catch (error) {
            console.error("[RDA] Failed to send hover state:", error);
          }
        },
        isPDF,
      });

      host = await createHost({
        ctx,
        onCreateTemporaryHighlight: async (range) => {
          if (annotationManager) {
            await annotationManager.createTemporaryHighlight(range);
          }
        },
        onMountStateChange: (isMounted) => {
          if (annotationManager) {
            annotationManager.setHighlightsVisible(isMounted);
          }
        },
      });

      try {
        const state = await sendMessage("getExtensionState", undefined);
        if (state.enabled) {
          await host.mount();
          annotationManager.setHighlightsVisible(true);

          // Only load annotations when extension is enabled and mounted
          if (isPDF) {
            waitForPDFReady()
              .then(() => {
                if (annotationManager) {
                  annotationManager.loadAnnotations();
                }
              })
              .catch(() => {
                // PDF.js failed to load, still try to load annotations
                // They'll be orphaned but user can see them in sidebar
                if (annotationManager) {
                  annotationManager.loadAnnotations();
                }
              });
          } else {
            annotationManager.loadAnnotations();
          }
        }
      } catch (error) {
        console.error("Failed to get extension state:", error);
      }

      const frameObserver = new FrameObserver(ctx, async (frame) => {
        // Inject annotator into the frame
        if (frameInjector) {
          try {
            await frameInjector.injectFrame(frame);
          } catch (error) {
            console.error("[RDA Boot] Failed to inject into frame:", error);
          }
        }
      });
      frameObserver.start();

      // Wrap message listeners in try-catch to prevent duplicate listener errors from breaking
      try {
        onMessage("toggleSidebar", async (message) => {
          if (!host || !annotationManager) return;

          if (message?.data?.action === "toggle") {
            const wasUnmounted =
              !host.isMounted.sidebar && !host.isMounted.annotator;
            await host.toggle();
            const isMounted =
              host.isMounted.sidebar && host.isMounted.annotator;
            annotationManager.setHighlightsVisible(isMounted);

            if (isMounted && wasUnmounted) {
              await new Promise((resolve) => setTimeout(resolve, 100));
              await annotationManager.loadAnnotations();

              if (frameInjector) {
                await frameInjector.reloadAllGuestAnnotations();
              }
              broadcastToCrossOriginFrames({ type: "rda:reloadAnnotations" });
            }
          } else if (message?.data?.action === "mount") {
            const wasUnmounted =
              !host.isMounted.sidebar && !host.isMounted.annotator;
            await host.mount();
            annotationManager.setHighlightsVisible(true);

            if (wasUnmounted) {
              await new Promise((resolve) => setTimeout(resolve, 100));
              await annotationManager.loadAnnotations();

              if (frameInjector) {
                await frameInjector.reloadAllGuestAnnotations();
              }
              broadcastToCrossOriginFrames({ type: "rda:reloadAnnotations" });
            }
          }
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[RDA] Listener for "toggleSidebar" already registered');
        }
      }

      try {
        onMessage("scrollToAnnotation", async (message) => {
          if (!annotationManager || !message.data) return;
          await annotationManager.scrollToAnnotation(message.data.annotationId);
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(
            '[RDA] Listener for "scrollToAnnotation" already registered'
          );
        }
      }

      try {
        onMessage("removeTemporaryHighlight", async () => {
          if (!annotationManager) return;
          annotationManager.removeTemporaryHighlight();
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(
            '[RDA] Listener for "removeTemporaryHighlight" already registered'
          );
        }
      }

      try {
        onMessage("reloadAnnotations", async () => {
          if (annotationManager) {
            await annotationManager.loadAnnotations();
          }

          if (frameInjector) {
            await frameInjector.reloadAllGuestAnnotations();
          }

          broadcastToCrossOriginFrames({ type: "rda:reloadAnnotations" });
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(
            '[RDA] Listener for "reloadAnnotations" already registered'
          );
        }
      }

      try {
        onMessage("requestAnchorStatus", async () => {
          const defaultStatus: AnchorStatus = {
            anchored: [],
            pending: [],
            orphaned: [],
            recovered: [],
          };

          const hostStatus =
            annotationManager?.getAnchorStatus() || defaultStatus;
          const sameOriginStatuses = frameInjector?.getAllGuestStatuses() || [];
          const allFrameStatuses = await requestAllFrameStatuses();

          return mergeAnchorStatuses([
            hostStatus,
            ...sameOriginStatuses,
            ...allFrameStatuses,
          ]);
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(
            '[RDA] Listener for "requestAnchorStatus" already registered'
          );
        }
      }
    } else {
      const frameUrl = getDocumentURL();

      // Send URL directly to background (not via host postMessage)
      sendMessage("registerFrameUrl", { url: frameUrl }).catch(() => {
        // Retry once if background not ready (edge case)
        setTimeout(() => {
          sendMessage("registerFrameUrl", { url: frameUrl }).catch(() => {});
        }, 100);
      });

      annotationManager = new AnnotationManager({
        onHighlightClick: async (annotationIds) => {
          // Notify parent frame to show annotations
          window.parent.postMessage(
            {
              type: "rda:showAnnotations",
              annotationIds,
              source: "guest-frame",
            },
            "*"
          );
        },
        onHighlightHover: async (annotationIds) => {
          // Notify parent frame of hover state
          window.parent.postMessage(
            {
              type: "rda:hoverAnnotations",
              annotationIds,
              source: "guest-frame",
            },
            "*"
          );
        },
        isPDF,
        isGuestFrame: true,
      });

      guestAnnotatorPopup = await createAnnotatorPopup({
        ctx,
        onAnnotate: async () => {
          window.parent.postMessage(
            {
              type: "rda:openSidebar",
              source: "guest-frame",
            },
            "*"
          );
        },
        onCreateTemporaryHighlight: async (range) => {
          if (annotationManager) {
            await annotationManager.createTemporaryHighlight(range);
          }
        },
      });

      try {
        const state = await sendMessage("getExtensionState", undefined);
        if (state.enabled) {
          guestAnnotatorPopup.mount();
          annotationManager.setHighlightsVisible(true);
        }
      } catch (error) {
        console.error("[RDA Guest] Failed to get extension state:", error);
      }

      if (isPDF) {
        waitForPDFReady()
          .then(() => {
            if (annotationManager) {
              annotationManager.loadAnnotations();
            }
          })
          .catch(() => {
            // PDF.js failed to load, still try to load annotations
            if (annotationManager) {
              annotationManager.loadAnnotations();
            }
          });
      } else {
        annotationManager.loadAnnotations();
      }

      // Listen for messages from parent frame
      window.addEventListener("message", async (event) => {
        if (event.data.type === "rda:scrollToAnnotation" && annotationManager) {
          await annotationManager.scrollToAnnotation(event.data.annotationId);
        } else if (
          event.data.type === "rda:requestAnchorStatus" &&
          annotationManager
        ) {
          const status = annotationManager.getAnchorStatus();
          window.parent.postMessage(
            {
              type: "rda:anchorStatusResponse",
              status,
              source: "guest-frame",
            },
            "*"
          );
        } else if (
          event.data.type === "rda:reloadAnnotations" &&
          annotationManager
        ) {
          await annotationManager.loadAnnotations();
        }
      });
    }

    ctx.onInvalidated(() => {
      if (host) {
        host.destroy();
      }
      if (annotationManager) {
        annotationManager.destroy();
      }
      if (frameInjector) {
        frameInjector.destroy();
      }
      if (guestAnnotatorPopup) {
        guestAnnotatorPopup.remove();
      }
    });
  },
});

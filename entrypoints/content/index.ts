import { onMessage, sendMessage } from "@/utils/messaging";
import { createHost } from "./host";
import { FrameObserver } from "./frame-observer";
import { AnnotationManager } from "./annotation-manager";
import { FrameInjector } from "./frame-injector";
import { detectContentType } from "@/utils/detect-content-type";
import { waitForPDFReady } from "@/utils/anchoring/pdf";
import { getDocumentURL } from "@/utils/document-url";
import { createAnnotatorPopup } from "./annotator-popup";

export default defineContentScript({
  matches: ["*://*/*"],
  allFrames: true,
  matchAboutBlank: true,
  runAt: "document_end",

  async main(ctx) {
    const isTopFrame = window.self === window.top;
    const frameInfo = {
      isTop: isTopFrame,
      url: window.location.href,
      origin: window.location.origin,
    };

    // Check if already injected
    if (document.querySelector("[data-rda-injected]")) {
      if (import.meta.env.DEV) {
        console.warn("[RDA Boot] Already injected, skipping");
      }
      return;
    }

    // Mark as injected
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

    // Track URLs from all frames (host + guests)
    const frameUrls: Set<string> = new Set();

    if (isTopFrame) {
      frameUrls.add(getDocumentURL());
      sendMessage("frameUrlsChanged", { urls: Array.from(frameUrls) }).catch(
        () => {
          // Sidebar might not be ready yet, that's ok
        }
      );

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
        }
      } catch (error) {
        console.error("Failed to get extension state:", error);
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
            // They'll be orphaned but user can see them in sidebar
            if (annotationManager) {
              annotationManager.loadAnnotations();
            }
          });
      } else {
        annotationManager.loadAnnotations();
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

      // Listen for messages from guest frames (iframes)
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
        } else if (event.data.type === "rda:registerFrameUrl") {
          if (event.data.url) {
            frameUrls.add(event.data.url);
            try {
              await sendMessage("frameUrlsChanged", {
                urls: Array.from(frameUrls),
              });
            } catch (error) {
              // Sidebar might not be ready yet, that's ok
            }
          }
        }
      });

      onMessage("toggleSidebar", async (message) => {
        if (!host || !annotationManager) return;

        if (message?.data?.action === "toggle") {
          const wasUnmounted =
            !host.isMounted.sidebar && !host.isMounted.annotator;
          await host.toggle();
          const isMounted = host.isMounted.sidebar && host.isMounted.annotator;
          annotationManager.setHighlightsVisible(isMounted);

          if (isMounted && wasUnmounted) {
            await annotationManager.loadAnnotations();
            try {
              await sendMessage("frameUrlsChanged", {
                urls: Array.from(frameUrls),
              });
            } catch (error) {
              // Ignore if sidebar not ready
            }
          }
        } else if (message?.data?.action === "mount") {
          const wasUnmounted =
            !host.isMounted.sidebar && !host.isMounted.annotator;
          await host.mount();
          annotationManager.setHighlightsVisible(true);

          if (wasUnmounted) {
            await annotationManager.loadAnnotations();
            try {
              await sendMessage("frameUrlsChanged", {
                urls: Array.from(frameUrls),
              });
            } catch (error) {
              // Ignore if sidebar not ready
            }
          }
        }
      });

      onMessage("scrollToAnnotation", async (message) => {
        if (!annotationManager || !message.data) return;
        await annotationManager.scrollToAnnotation(message.data.annotationId);
      });

      onMessage("removeTemporaryHighlight", async () => {
        if (!annotationManager) return;
        annotationManager.removeTemporaryHighlight();
      });

      onMessage("reloadAnnotations", async () => {
        if (!annotationManager) return;
        await annotationManager.loadAnnotations();
      });

      onMessage("getFrameUrls", async () => {
        return { urls: Array.from(frameUrls) };
      });
    } else {
      const frameUrl = getDocumentURL();
      window.parent.postMessage(
        {
          type: "rda:registerFrameUrl",
          url: frameUrl,
          source: "guest-frame",
        },
        "*"
      );

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

import { onMessage, sendMessage } from "@/utils/messaging";
import { createHost } from "./host";
import { FrameObserver } from "./frame-observer";
import { AnnotationManager } from "./annotation-manager";
import { FrameInjector } from "./frame-injector";
import { detectContentTypeAsync } from "@/utils/detect-content-type";
import { waitForPDFReady } from "@/utils/anchoring/pdf";

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

    console.log("[RDA Boot] Initializing in frame:", frameInfo);

    // Check if already injected
    if (document.querySelector("[data-rda-injected]")) {
      console.log("[RDA Boot] Already injected, skipping");
      return;
    }

    // Mark as injected
    const marker = document.createElement("meta");
    marker.setAttribute("data-rda-injected", "true");
    marker.setAttribute("data-rda-frame-type", isTopFrame ? "host" : "guest");
    document.head.appendChild(marker);

    // Detect content type (async to wait for PDF.js if needed)
    const contentType = await detectContentTypeAsync();
    console.log("[RDA Boot] Content type:", contentType);
    marker.setAttribute("data-rda-content-type", contentType?.type || "HTML");

    if (contentType?.type === "PDF") {
      try {
        const isReady = await waitForPDFReady();
        if (!isReady) {
          console.warn(
            "[RDA Boot] PDF.js not available, skipping annotation loading"
          );
          return;
        }
      } catch (error) {
        console.error("[RDA Boot] Failed to wait for PDF ready:", error);
        return;
      }
    }

    let host: Awaited<ReturnType<typeof createHost>> | null = null;
    let annotationManager: AnnotationManager | null = null;
    let frameInjector: FrameInjector | null = null;

    if (isTopFrame) {
      console.log("[RDA Boot] Initializing Host (main frame)");

      // Create frame injector to handle child frames
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

      await annotationManager.loadAnnotations();

      try {
        const state = await sendMessage("getExtensionState", undefined);
        if (state.enabled) {
          await host.mount();
          annotationManager.setHighlightsVisible(true);
        }
      } catch (error) {
        console.error("Failed to get extension state:", error);
      }

      const frameObserver = new FrameObserver(ctx, async (frame) => {
        console.log("[RDA Boot] Frame detected:", {
          src: frame.src,
          id: frame.id,
          name: frame.name,
        });

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

      onMessage("toggleSidebar", async (message) => {
        if (!host || !annotationManager) return;

        if (message?.data?.action === "toggle") {
          await host.toggle();
          const isMounted = host.isMounted.sidebar && host.isMounted.annotator;
          annotationManager.setHighlightsVisible(isMounted);
        } else if (message?.data?.action === "mount") {
          await host.mount();
          annotationManager.setHighlightsVisible(true);
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
    } else {
      console.log("[RDA Boot] Initializing Guest (child frame)");

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
      });

      await annotationManager.loadAnnotations();

      annotationManager.setHighlightsVisible(true);

      // Listen for messages from parent frame
      window.addEventListener("message", async (event) => {
        if (event.data.type === "rda:scrollToAnnotation" && annotationManager) {
          await annotationManager.scrollToAnnotation(event.data.annotationId);
        }
      });

      console.log("[RDA Boot] Guest initialized successfully");
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
    });
  },
});

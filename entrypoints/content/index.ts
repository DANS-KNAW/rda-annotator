import { onMessage, sendMessage } from "@/utils/messaging";
import { createHost } from "./host";
import { FrameObserver } from "./frame-observer";
import { AnnotationManager } from "./annotation-manager";

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

    if (document.querySelector("[data-rda-injected]")) {
      return;
    }

    const marker = document.createElement("meta");
    marker.setAttribute("data-rda-injected", "true");
    document.head.appendChild(marker);

    let host: Awaited<ReturnType<typeof createHost>> | null = null;
    let annotationManager: AnnotationManager | null = null;

    if (isTopFrame) {
      annotationManager = new AnnotationManager();

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

      const frameObserver = new FrameObserver(ctx, (frame) => {
        console.log("[RDA Boot] Frame detected:", {
          src: frame.src,
          id: frame.id,
          name: frame.name,
        });
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
      console.log("[RDA Boot] Child frame support not yet implemented");
    }

    ctx.onInvalidated(() => {
      if (host) {
        host.destroy();
      }
      if (annotationManager) {
        annotationManager.destroy();
      }
    });
  },
});

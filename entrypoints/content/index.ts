import { onMessage } from "@/utils/messaging";
import { createHost } from "./host";
import { FrameObserver } from "./frame-observer";

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

    if (isTopFrame) {
      host = await createHost(ctx);

      const frameObserver = new FrameObserver(ctx, (frame) => {
        console.log("[RDA Boot] Frame detected:", {
          src: frame.src,
          id: frame.id,
          name: frame.name,
        });
        // TODO: In future, inject Guest into discovered frames
      });
      frameObserver.start();

      // Listen for background script commands
      onMessage("toggleSidebar", async (message) => {
        if (!host) return;

        if (message?.data?.action === "toggle") {
          await host.toggle();
        } else if (message?.data?.action === "mount") {
          await host.mount();
        }
      });
    } else {
      console.log("[RDA Boot] Initializing Guest (child frame)");
      // In child frames, just create the annotator without sidebar
      // For now, we'll skip this - log only
      console.log("[RDA Boot] Child frame support not yet implemented");
    }

    // Cleanup on context invalidation
    ctx.onInvalidated(() => {
      if (host) {
        host.destroy();
      }
    });
  },
});

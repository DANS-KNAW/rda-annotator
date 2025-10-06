import { onMessage } from "@/utils/messaging";
import createSidebar from "./sidebar";
import createAnnotatorPopup from "./annotator-popup";

export default defineContentScript({
  matches: ["*://*/*"],
  allFrames: true,
  matchAboutBlank: true,
  async main(ctx) {
    let isOpen = false;

    const sidebarShadow = await createSidebar({ ctx, isOpen: isOpen });

    let mounted = false;

    const toggle = async (mount?: boolean) => {
      if (mounted && mount === true) {
        return;
      }

      if (!mounted && mount === false) {
        return;
      }

      if (mount === true && !mounted) {
        annotatorPopup.mount();
        sidebarShadow.mount();
        mounted = true;
      }

      if (mount === false && mounted) {
        annotatorPopup.remove();
        sidebarShadow.remove();
        mounted = false;
        isOpen = false;
      }
    };

    const openSidebar = () => {
      if (sidebarShadow.shadowHost) {
        isOpen = true;
        sidebarShadow.shadowHost.classList.add("open");
        // Update button icon if it exists
        const shadowRoot = sidebarShadow.shadowHost.shadowRoot;
        if (shadowRoot) {
          const button = shadowRoot.getElementById("toggle-button");
          if (button) {
            button.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="chevron-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            `;
          }
        }
      }
    };

    const annotatorPopup = await createAnnotatorPopup({
      ctx,
      onAnnotate: async () => {
        if (!mounted) {
          await toggle(true);
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // Open the sidebar (slide it out)
        openSidebar();
      },
    });

    // In content script
    onMessage("toggleSidebar", async (message) => {
      if (message?.data?.action === "toggle") {
        await toggle(!mounted ? true : false);
      }

      if (message?.data?.action === "mount") {
        await toggle(true);
      }
    });
  },
});

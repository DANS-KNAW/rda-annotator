import { ContentScriptContext } from "#imports";
import { createSidebar } from "./sidebar";
import { createAnnotatorPopup } from "./annotator-popup";

export async function createHost(ctx: ContentScriptContext) {
  let sidebarMounted = false;
  let annotatorMounted = false;
  let sidebarOpen = false;

  const sidebar = await createSidebar({ ctx });
  sidebar.mount();
  sidebarMounted = true;

  console.log("[RDA Host] Sidebar pre-loaded (hidden)");

  const annotatorPopup = await createAnnotatorPopup({
    ctx,
    onAnnotate: async () => {
      if (!sidebarMounted) {
        await mount();
      }
      await openSidebar();
    },
  });

  async function mount() {
    if (sidebarMounted && annotatorMounted) {
      console.log("[RDA Host] Already mounted");
      return;
    }

    console.log("[RDA Host] Mounting components");

    if (!sidebarMounted) {
      sidebar.mount();
      sidebarMounted = true;
    }
    if (!annotatorMounted) {
      annotatorPopup.mount();
      annotatorMounted = true;
    }

    console.log("[RDA Host] Mount complete");
  }

  async function unmount() {
    if (!sidebarMounted && !annotatorMounted) {
      console.log("[RDA Host] Not mounted");
      return;
    }

    console.log("[RDA Host] Unmounting components");

    annotatorPopup.remove();
    sidebar.remove();

    annotatorMounted = false;
    sidebarMounted = false;
    sidebarOpen = false;
    console.log("[RDA Host] Unmount complete");
  }

  async function toggle() {
    if (sidebarMounted && annotatorMounted) {
      await unmount();
    } else {
      await mount();
    }
  }

  async function openSidebar() {
    if (!sidebarMounted) {
      console.warn("[RDA Host] Cannot open sidebar - not mounted");
      return;
    }

    console.log("[RDA Host] Opening sidebar");
    sidebarOpen = true;

    if (sidebar.shadowHost) {
      sidebar.shadowHost.classList.add("open");

      const shadowRoot = sidebar.shadowHost.shadowRoot;
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
  }

  function destroy() {
    console.log("[RDA Host] Destroying host");
    if (sidebarMounted || annotatorMounted) {
      unmount();
    }
  }

  return {
    mount,
    unmount,
    toggle,
    openSidebar,
    destroy,
    get isMounted() {
      return {
        sidebar: sidebarMounted,
        annotator: annotatorMounted,
      };
    },
    get isSidebarOpen() {
      return sidebarOpen;
    },
  };
}

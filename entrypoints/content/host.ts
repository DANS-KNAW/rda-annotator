import { ContentScriptContext } from "#imports";
import { createSidebar } from "./sidebar";
import { createAnnotatorPopup } from "./annotator-popup";

export async function createHost(ctx: ContentScriptContext) {
  let sidebarMounted = false;
  let annotatorMounted = false;
  let sidebarOpen = false;

  const sidebar = await createSidebar({ ctx });
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
      return;
    }

    if (!sidebarMounted) {
      sidebar.mount();
      sidebarMounted = true;
    }
    if (!annotatorMounted) {
      annotatorPopup.mount();
      annotatorMounted = true;
    }
  }

  async function unmount() {
    if (!sidebarMounted && !annotatorMounted) {
      return;
    }

    annotatorPopup.remove();
    sidebar.remove();

    annotatorMounted = false;
    sidebarMounted = false;
    sidebarOpen = false;
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

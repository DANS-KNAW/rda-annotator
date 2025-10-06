import { ContentScriptContext } from "#imports";
import { EXTENSION_NAME, SIDEBAR_WIDTH, TOGGLE_TAB_WIDTH } from "./constant";

interface SidebarProps {
  isOpen: boolean;
  ctx: ContentScriptContext;
}

export default async function createSidebar({ ctx, isOpen }: SidebarProps) {
  const sidebarShadow = await createShadowRootUi(ctx, {
    name: `${EXTENSION_NAME}-sidebar`,
    position: "inline",
    anchor: "body",
    mode: "closed",

    onMount(_, shadowRoot, shadowHost) {
      const container = document.createElement("div");
      container.id = "sidebar-container";
      shadowRoot.replaceChildren(container);

      const toggleButton = document.createElement("button");
      toggleButton.id = "toggle-button";
      toggleButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="chevron-icon">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        `;
      container.appendChild(toggleButton);

      const contentWrapper = document.createElement("div");
      contentWrapper.id = "content-wrapper";
      container.appendChild(contentWrapper);

      const sheet = new CSSStyleSheet();
      sheet.replaceSync(`
          :host {
            position: fixed;
            top: 0; 
            right: -${SIDEBAR_WIDTH}px;
            z-index: 2147483647;
            width: ${SIDEBAR_WIDTH + TOGGLE_TAB_WIDTH}px;
            height: 100vh;
            box-sizing: border-box;
            transition: right 0.3s ease-in-out;
          }

          :host(.open) {
            right: 0;
          }

          #sidebar-container {
            width: 100%;
            height: 100%;
            position: relative;
          }

          #toggle-button {
            position: absolute;
            left: 0;
            top: 20px;
            transform: translateY(-50%);
            width: ${TOGGLE_TAB_WIDTH}px;
            height: 40px;
            background: #467d2c;
            color: white;
            border: none;
            border-radius: 6px 0 0 6px;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1;
            transition: background 0.2s;
            padding: 0;
          }

          #toggle-button:hover {
            background: #2563eb;
          }

          .chevron-icon {
            width: 32px;
            height: 32px;
          }

          #content-wrapper {
            width: 100%;
            height: 100%;
            padding-left: ${TOGGLE_TAB_WIDTH}px;
            box-sizing: border-box;
          }
        `);
      shadowRoot.adoptedStyleSheets = [sheet];

      toggleButton.addEventListener("click", () => {
        isOpen = !isOpen;
        shadowHost.classList.toggle("open", isOpen);
        toggleButton.innerHTML = isOpen
          ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="chevron-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="chevron-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>`;
      });

      if (isOpen) {
        shadowHost.classList.add("open");
        toggleButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="chevron-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          `;
      }

      const shadowFrame = createIframeUi(ctx, {
        page: "/sidebar.html",
        position: "inline",
        anchor: contentWrapper,

        onMount(wrapper, iframe) {
          wrapper.style.width = "100%";
          wrapper.style.height = "100vh";

          iframe.width = "100%";
          iframe.height = "100%";
          iframe.style.border = "none";
        },
      });

      shadowFrame.mount();
    },
  });

  return sidebarShadow;
}

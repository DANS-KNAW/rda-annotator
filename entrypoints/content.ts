import { onMessage, sendMessage } from "@/utils/messaging";

const EXTENSION_NAME = "rda-annotator";
const SIDEBAR_WIDTH = 400;
const TOGGLE_TAB_WIDTH = 30;

export default defineContentScript({
  matches: ["*://*/*"],
  allFrames: true,
  matchAboutBlank: true,
  async main(ctx) {
    let isOpen = false;

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
            right: -${SIDEBAR_WIDTH - 10}px;
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

    let mounted = false;
    let currentSelection: Selection | null = null;

    // Store event handlers for cleanup
    let mouseUpHandler: ((e: MouseEvent) => void) | null = null;
    let mouseDownHandler: ((e: MouseEvent) => void) | null = null;

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

    // Create annotator popup UI
    const annotatorPopup = await createShadowRootUi(ctx, {
      name: `${EXTENSION_NAME}-popup`,
      position: "inline",
      anchor: "body",
      mode: "closed",

      onMount(_, shadowRoot, shadowHost) {
        const container = document.createElement("div");
        container.id = "annotator-popup";
        shadowRoot.replaceChildren(container);

        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
          :host {
            position: absolute;
            z-index: 2147483646;
            display: none;
          }

          #annotator-popup {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            padding: 4px;
          }

          button {
            background: #467d2c;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            white-space: nowrap;
            transition: background 0.2s;
          }

          button:hover {
            background: #2563eb;
          }

          button:active {
            background: #1d4ed8;
          }
        `);
        shadowRoot.adoptedStyleSheets = [sheet];

        const button = document.createElement("button");
        button.textContent = "Annotate text";
        button.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAnnotateClick();
        });
        container.appendChild(button);

        // Set up document event listeners
        mouseUpHandler = (e: MouseEvent) => {
          setTimeout(() => {
            handleTextSelection();
          }, 10);
        };

        mouseDownHandler = (e: MouseEvent) => {
          if (
            annotatorPopup.shadowHost &&
            !annotatorPopup.shadowHost.contains(e.target as Node)
          ) {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) {
              hideAnnotatorPopup();
            }
          }
        };

        document.addEventListener("mouseup", mouseUpHandler);
        document.addEventListener("mousedown", mouseDownHandler);
      },

      onRemove() {
        // Clean up event listeners
        if (mouseUpHandler) {
          document.removeEventListener("mouseup", mouseUpHandler);
          mouseUpHandler = null;
        }
        if (mouseDownHandler) {
          document.removeEventListener("mousedown", mouseDownHandler);
          mouseDownHandler = null;
        }

        // Clear current selection
        currentSelection = null;
      },
    });

    const showAnnotatorPopup = (x: number, y: number) => {
      if (annotatorPopup.shadowHost) {
        const host = annotatorPopup.shadowHost as HTMLElement;
        host.style.display = "block";
        host.style.left = `${x}px`;
        host.style.top = `${y}px`;
      }
    };

    const hideAnnotatorPopup = () => {
      if (annotatorPopup.shadowHost) {
        const host = annotatorPopup.shadowHost as HTMLElement;
        host.style.display = "none";
      }
    };

    const handleAnnotateClick = async () => {
      if (currentSelection) {
        const selectedText = currentSelection.toString();

        if (!mounted) {
          await toggle();
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // Open the sidebar (slide it out)
        openSidebar();

        sendMessage("createAnnotation", {
          selectedText: selectedText.trim(),
          url: window.location.href,
        });

        hideAnnotatorPopup();
        window.getSelection()?.removeAllRanges();
      }
    };

    const handleTextSelection = () => {
      const selection = window.getSelection();

      if (
        !selection ||
        selection.isCollapsed ||
        selection.toString().trim().length === 0
      ) {
        hideAnnotatorPopup();
        currentSelection = null;
        return;
      }

      currentSelection = selection;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Position popup below the selection
      const x = rect.left + rect.width / 2 - 60; // Center the button
      const y = rect.bottom + window.scrollY + 8;

      showAnnotatorPopup(x, y);
    };

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

import { onMessage } from "@/utils/messaging";

const EXTENSION_NAME = "rda-annotator";
const SIDEBAR_WIDTH = 400;

export default defineContentScript({
  matches: ["*://*/*"],
  async main(ctx) {
    const sidebarShadow = await createShadowRootUi(ctx, {
      name: `${EXTENSION_NAME}-sidebar`,
      position: "inline",
      anchor: "body",
      mode: "closed",

      onMount(_, shadowRoot, shadowHost) {
        const div = document.createElement("div");
        shadowRoot.replaceChildren(div);

        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
          :host {
            position: fixed;
            top: 0; 
            right: 0;
            z-index: 2147483647;

            width: ${SIDEBAR_WIDTH}px;
            height: 100vh;
            
            box-sizing: border-box;
          }
        `);
        shadowRoot.adoptedStyleSheets = [sheet];

        const shadowFrame = createIframeUi(ctx, {
          page: "/sidebar.html",
          position: "inline",
          anchor: div,

          onMount(wrapper, iframe) {
            wrapper.style.width = `${SIDEBAR_WIDTH}px`;
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

    const toggle = async () => {
      if (mounted) {
        sidebarShadow.remove();
        mounted = false;
      } else {
        sidebarShadow.mount();
        mounted = true;
      }
    };

    onMessage("toggleSidebar", () => {
      toggle();
    });
  },
});

const EXTENSION_NAME = "rda-annotator";
const SIDEBAR_WIDTH = 400;

// We use rem unit for more conisistent sizing across different browsers.
// This assumes the default font size is 16px.
const widthRem = SIDEBAR_WIDTH / 16;

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

            width: ${widthRem}rem;
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
            wrapper.style.width = `${widthRem}rem`;
            wrapper.style.height = "100vh";

            iframe.width = "100%";
            iframe.height = "100%";
            iframe.style.border = "none";
          },
        });

        shadowFrame.mount();
      },
    });

    sidebarShadow.mount();
  },
});

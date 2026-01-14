import type { ContentScriptContext } from '#imports'
import { EXTENSION_NAME, SIDEBAR_WIDTH, TOGGLE_TAB_WIDTH } from './constant'

interface SidebarProps {
  ctx: ContentScriptContext
}

export async function createSidebar({ ctx }: SidebarProps) {
  const anchorElement = document.body || document.documentElement

  if (!anchorElement) {
    console.error('[RDA Sidebar] Cannot mount: no anchor element available')
    throw new Error('No suitable anchor element for sidebar')
  }

  const sidebarShadow = await createShadowRootUi(ctx, {
    name: `${EXTENSION_NAME}-sidebar`,
    position: 'inline',
    anchor: anchorElement,
    mode: 'closed',

    onMount(_, shadowRoot, shadowHost) {
      if (import.meta.env.DEV) {
        console.log('[RDA Sidebar] Mounted')
      }

      const container = document.createElement('div')
      container.id = 'sidebar-container'
      shadowRoot.replaceChildren(container)

      const toggleButton = document.createElement('button')
      toggleButton.id = 'toggle-button'
      toggleButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="chevron-icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      `
      container.appendChild(toggleButton)

      const contentWrapper = document.createElement('div')
      contentWrapper.id = 'content-wrapper'
      container.appendChild(contentWrapper)

      // Use <style> element instead of adoptedStyleSheets for Firefox compatibility
      const styleElement = document.createElement('style')
      styleElement.textContent = `
        :host {
          position: fixed;
          top: 0; 
          right: 0;
          z-index: 2147483647;
          width: ${SIDEBAR_WIDTH + TOGGLE_TAB_WIDTH}px;
          height: 100vh;
          box-sizing: border-box;
          transform: translateX(${SIDEBAR_WIDTH}px);
          transition: transform 0.3s ease-in-out;
        }

        :host(.open) {
          transform: translateX(0);
        }

        #sidebar-container {
          width: 100%;
          height: 100%;
          position: relative;
        }

        #toggle-button {
          position: absolute;
          left: 0;
          top: 0px;
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
      `
      shadowRoot.appendChild(styleElement)

      // Toggle button handler
      toggleButton.addEventListener('click', () => {
        const isOpen = shadowHost.classList.contains('open')
        shadowHost.classList.toggle('open')

        toggleButton.innerHTML = isOpen
          ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="chevron-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="chevron-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>`
      })

      // Create iframe with sidebar content
      const shadowFrame = createIframeUi(ctx, {
        page: '/sidebar.html',
        position: 'inline',
        anchor: contentWrapper,

        onMount(wrapper, iframe) {
          // Set wrapper dimensions (WXT's wrapper around the iframe)
          wrapper.style.width = '100%'
          wrapper.style.height = '100vh'

          // Set iframe dimensions
          iframe.style.width = '100%'
          iframe.style.height = '100%'
          iframe.style.border = 'none'
          iframe.style.display = 'block'
        },
      })

      shadowFrame.mount()
    },

    onRemove() {
      if (import.meta.env.DEV) {
        console.log('[RDA Sidebar] Removed')
      }
    },
  })

  return sidebarShadow
}

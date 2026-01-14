import type { ContentScriptContext } from '#imports'

export type FrameCallback = (frame: HTMLIFrameElement) => void
export type FrameLoadCallback = (frame: HTMLIFrameElement, url: string) => void

export class FrameObserver {
  private observer: MutationObserver | null = null
  private ctx: ContentScriptContext
  private onFrameDiscovered: FrameCallback
  private onFrameLoad?: FrameLoadCallback
  private discoveredFrames = new WeakSet<HTMLIFrameElement>()
  private frameLoadHandlers = new WeakMap<HTMLIFrameElement, () => void>()

  constructor(
    ctx: ContentScriptContext,
    onFrameDiscovered: FrameCallback,
    onFrameLoad?: FrameLoadCallback,
  ) {
    this.ctx = ctx
    this.onFrameDiscovered = onFrameDiscovered
    this.onFrameLoad = onFrameLoad
  }

  start() {
    this.scanExistingFrames()

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element

              if (element.tagName === 'IFRAME') {
                this.handleFrame(element as HTMLIFrameElement)
              }

              const iframes = element.querySelectorAll('iframe')
              iframes.forEach((iframe) => {
                this.handleFrame(iframe as HTMLIFrameElement)
              })
            }
          })
        }
      }
    })

    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    })

    this.ctx.onInvalidated(() => {
      this.stop()
    })
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }

  private scanExistingFrames() {
    const existingFrames = document.querySelectorAll('iframe')

    existingFrames.forEach((frame) => {
      this.handleFrame(frame as HTMLIFrameElement)
    })
  }

  private handleFrame(frame: HTMLIFrameElement) {
    if (this.discoveredFrames.has(frame)) {
      return
    }

    this.discoveredFrames.add(frame)

    try {
      // Check if frame is accessible (same-origin)
      const _test = frame.contentWindow?.location.href
    }
    catch {
      // Cross-origin frame, can't access directly
    }

    // Add load event listener to detect iframe navigation
    if (this.onFrameLoad) {
      const loadHandler = () => {
        try {
          const url = frame.contentWindow?.location.href || ''
          if (import.meta.env.DEV) {
            console.debug(`[FrameObserver] Frame loaded:`, url)
          }
          this.onFrameLoad?.(frame, url)
        }
        catch {
          // Cross-origin frame, can't access
        }
      }
      frame.addEventListener('load', loadHandler)
      this.frameLoadHandlers.set(frame, loadHandler)
    }

    this.onFrameDiscovered(frame)
  }
}

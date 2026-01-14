interface PageState {
  pageIndex: number
  textLayerReady: boolean
  renderingDone: boolean
}

type PageReadyCallback = (pageIndex: number) => void
type PageDestroyedCallback = (pageIndex: number) => void

interface PDFViewerApplication {
  pdfViewer: {
    pagesCount: number
    eventBus?: EventBus
    viewer?: HTMLElement
    getPageView: (index: number) => PDFPageView | undefined
  }
  eventBus?: EventBus
}

interface EventBus {
  on: (event: string, handler: (data: any) => void) => void
  off: (event: string, handler: (data: any) => void) => void
}

interface PDFPageView {
  div: HTMLElement
  renderingState?: number
  textLayer?: {
    div?: HTMLElement
    textLayerDiv?: HTMLElement
    renderingDone?: boolean
  }
}

const RenderingStates = {
  INITIAL: 0,
  RUNNING: 1,
  PAUSED: 2,
  FINISHED: 3,
}

export interface PDFPageStateManager {
  initialize: () => void
  destroy: () => void
  isPageTextLayerReady: (pageIndex: number) => boolean
  getReadyPages: () => number[]
  onPageTextLayerReady: (callback: PageReadyCallback) => () => void
  onPageDestroyed: (callback: PageDestroyedCallback) => () => void
}

class PDFPageStateManagerImpl implements PDFPageStateManager {
  private pageStates: Map<number, PageState> = new Map()
  private textLayerReadyCallbacks: Set<PageReadyCallback> = new Set()
  private pageDestroyedCallbacks: Set<PageDestroyedCallback> = new Set()
  private eventBus: EventBus | null = null
  private boundHandlers: {
    textLayerRendered?: (data: any) => void
    pageRendered?: (data: any) => void
    pageDestroy?: (data: any) => void
    pagesDestroy?: () => void
  } = {}

  private initialized = false

  initialize(): void {
    if (this.initialized)
      return

    const app = this.getPDFViewerApplication()
    if (!app) {
      if (import.meta.env.DEV) {
        console.warn('[PDFPageStateManager] PDFViewerApplication not found')
      }
      return
    }

    // Get eventBus from app or pdfViewer
    this.eventBus = app.eventBus || app.pdfViewer?.eventBus || null

    if (!this.eventBus) {
      if (import.meta.env.DEV) {
        console.warn(
          '[PDFPageStateManager] No eventBus found, falling back to polling',
        )
      }
      this.setupPollingFallback()
      this.initialized = true
      return
    }

    this.setupEventListeners()
    this.scanExistingPages()
    this.initialized = true

    if (import.meta.env.DEV) {
      console.debug('[PDFPageStateManager] Initialized with eventBus')
    }
  }

  destroy(): void {
    if (!this.initialized)
      return

    if (this.eventBus) {
      if (this.boundHandlers.textLayerRendered) {
        this.eventBus.off(
          'textlayerrendered',
          this.boundHandlers.textLayerRendered,
        )
      }
      if (this.boundHandlers.pageRendered) {
        this.eventBus.off('pagerendered', this.boundHandlers.pageRendered)
      }
      if (this.boundHandlers.pageDestroy) {
        this.eventBus.off('pagedestroy', this.boundHandlers.pageDestroy)
      }
      if (this.boundHandlers.pagesDestroy) {
        this.eventBus.off('pagesdestroy', this.boundHandlers.pagesDestroy)
      }
    }

    this.pageStates.clear()
    this.textLayerReadyCallbacks.clear()
    this.pageDestroyedCallbacks.clear()
    this.boundHandlers = {}
    this.eventBus = null
    this.initialized = false

    if (import.meta.env.DEV) {
      console.debug('[PDFPageStateManager] Destroyed')
    }
  }

  isPageTextLayerReady(pageIndex: number): boolean {
    const state = this.pageStates.get(pageIndex)
    if (state?.textLayerReady)
      return true

    // Double-check by inspecting actual DOM state
    const ready = this.checkPageTextLayerReady(pageIndex)
    if (ready && state) {
      state.textLayerReady = true
    }
    return ready
  }

  getReadyPages(): number[] {
    const ready: number[] = []
    for (const [pageIndex, state] of this.pageStates) {
      if (state.textLayerReady) {
        ready.push(pageIndex)
      }
    }
    return ready
  }

  onPageTextLayerReady(callback: PageReadyCallback): () => void {
    this.textLayerReadyCallbacks.add(callback)
    return () => {
      this.textLayerReadyCallbacks.delete(callback)
    }
  }

  onPageDestroyed(callback: PageDestroyedCallback): () => void {
    this.pageDestroyedCallbacks.add(callback)
    return () => {
      this.pageDestroyedCallbacks.delete(callback)
    }
  }

  private getPDFViewerApplication(): PDFViewerApplication | null {
    return (window as any).PDFViewerApplication || null
  }

  private setupEventListeners(): void {
    if (!this.eventBus)
      return

    // textlayerrendered fires when text layer DOM is complete
    this.boundHandlers.textLayerRendered = (data: any) => {
      const pageIndex = data.pageNumber - 1 // PDF.js uses 1-based page numbers
      this.handleTextLayerRendered(pageIndex)
    }
    this.eventBus.on('textlayerrendered', this.boundHandlers.textLayerRendered)

    // pagerendered fires when canvas rendering completes (backup signal)
    this.boundHandlers.pageRendered = (data: any) => {
      const pageIndex = data.pageNumber - 1
      this.handlePageRendered(pageIndex)
    }
    this.eventBus.on('pagerendered', this.boundHandlers.pageRendered)

    // pagedestroy fires when a page is cleaned up (e.g., scrolled away in virtualized rendering)
    this.boundHandlers.pageDestroy = (data: any) => {
      const pageIndex = data.pageNumber - 1
      this.handlePageDestroyed(pageIndex)
    }
    this.eventBus.on('pagedestroy', this.boundHandlers.pageDestroy)

    // pagesdestroy fires when all pages are being destroyed (document close/change)
    this.boundHandlers.pagesDestroy = () => {
      this.handleAllPagesDestroyed()
    }
    this.eventBus.on('pagesdestroy', this.boundHandlers.pagesDestroy)
  }

  private setupPollingFallback(): void {
    // For PDF.js versions without eventBus, poll for text layer completion
    const pollInterval = setInterval(() => {
      if (!this.initialized) {
        clearInterval(pollInterval)
        return
      }

      const app = this.getPDFViewerApplication()
      if (!app?.pdfViewer)
        return

      for (let i = 0; i < app.pdfViewer.pagesCount; i++) {
        const wasReady = this.pageStates.get(i)?.textLayerReady || false
        if (!wasReady && this.checkPageTextLayerReady(i)) {
          this.handleTextLayerRendered(i)
        }
      }
    }, 200)
  }

  private scanExistingPages(): void {
    const app = this.getPDFViewerApplication()
    if (!app?.pdfViewer)
      return

    for (let i = 0; i < app.pdfViewer.pagesCount; i++) {
      const ready = this.checkPageTextLayerReady(i)
      this.pageStates.set(i, {
        pageIndex: i,
        textLayerReady: ready,
        renderingDone: ready,
      })

      // If already ready, notify callbacks
      if (ready) {
        this.notifyTextLayerReady(i)
      }
    }

    if (import.meta.env.DEV) {
      const readyCount = this.getReadyPages().length
      console.debug(
        `[PDFPageStateManager] Scanned ${app.pdfViewer.pagesCount} pages, ${readyCount} ready`,
      )
    }
  }

  private checkPageTextLayerReady(pageIndex: number): boolean {
    const app = this.getPDFViewerApplication()
    if (!app?.pdfViewer)
      return false

    const pageView = app.pdfViewer.getPageView(pageIndex)
    if (!pageView)
      return false

    // Check rendering state
    if (pageView.renderingState !== RenderingStates.FINISHED) {
      return false
    }

    // Check text layer existence and completion
    const textLayer = pageView.textLayer
    if (!textLayer)
      return false

    // Check renderingDone property (preferred)
    if (textLayer.renderingDone !== undefined) {
      return textLayer.renderingDone
    }

    // Fallback: check for .endOfContent marker
    const div = textLayer.div || textLayer.textLayerDiv
    if (!div)
      return false

    return div.querySelector('.endOfContent') !== null
  }

  private handleTextLayerRendered(pageIndex: number): void {
    let state = this.pageStates.get(pageIndex)
    if (!state) {
      state = { pageIndex, textLayerReady: false, renderingDone: false }
      this.pageStates.set(pageIndex, state)
    }

    // Only notify if this is a new ready state
    if (!state.textLayerReady) {
      state.textLayerReady = true
      state.renderingDone = true

      if (import.meta.env.DEV) {
        console.debug(
          `[PDFPageStateManager] Text layer ready for page ${pageIndex}`,
        )
      }

      this.notifyTextLayerReady(pageIndex)
    }
  }

  private handlePageRendered(pageIndex: number): void {
    let state = this.pageStates.get(pageIndex)
    if (!state) {
      state = { pageIndex, textLayerReady: false, renderingDone: false }
      this.pageStates.set(pageIndex, state)
    }

    state.renderingDone = true

    // Text layer might render slightly after page render, check after short delay
    if (!state.textLayerReady) {
      setTimeout(() => {
        if (this.checkPageTextLayerReady(pageIndex)) {
          this.handleTextLayerRendered(pageIndex)
        }
      }, 50)
    }
  }

  private handlePageDestroyed(pageIndex: number): void {
    const state = this.pageStates.get(pageIndex)
    if (state) {
      state.textLayerReady = false
      state.renderingDone = false
    }

    if (import.meta.env.DEV) {
      console.debug(`[PDFPageStateManager] Page ${pageIndex} destroyed`)
    }

    this.notifyPageDestroyed(pageIndex)
  }

  private handleAllPagesDestroyed(): void {
    const destroyedPages = Array.from(this.pageStates.keys())

    for (const pageIndex of destroyedPages) {
      this.handlePageDestroyed(pageIndex)
    }

    this.pageStates.clear()
  }

  private notifyTextLayerReady(pageIndex: number): void {
    for (const callback of this.textLayerReadyCallbacks) {
      try {
        callback(pageIndex)
      }
      catch (error) {
        console.error(
          '[PDFPageStateManager] Error in textLayerReady callback:',
          error,
        )
      }
    }
  }

  private notifyPageDestroyed(pageIndex: number): void {
    for (const callback of this.pageDestroyedCallbacks) {
      try {
        callback(pageIndex)
      }
      catch (error) {
        console.error(
          '[PDFPageStateManager] Error in pageDestroyed callback:',
          error,
        )
      }
    }
  }
}

let instance: PDFPageStateManager | null = null

export function createPDFPageStateManager(): PDFPageStateManager {
  if (!instance) {
    instance = new PDFPageStateManagerImpl()
  }
  return instance
}

export function destroyPDFPageStateManager(): void {
  if (instance) {
    instance.destroy()
    instance = null
  }
}

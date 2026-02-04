import type { AnnotationHit } from '@/types/elastic-search-document.interface'
import type { PDFPageStateManager } from '@/utils/anchoring/pdf'
import type { Highlight } from '@/utils/highlighter'
import { anchor } from '@/utils/anchoring'
import {
  createPDFPageStateManager,
  destroyPDFPageStateManager,
  getPageIndexFromSelectors,
  isPDFDocument,
  isPlaceholderRange,
  verifyAnnotationTextOnPage,
} from '@/utils/anchoring/pdf'
import { getDocumentURL } from '@/utils/document-url'
import { searchAnnotationsByUrl } from '@/utils/elasticsearch-fetch'
import {

  highlightRange,
  removeHighlight,
  setHighlightFocused,
} from '@/utils/highlighter'
import { getAnnotationIdsAtPoint } from '@/utils/highlights-at-point'
import { injectHighlightStyles } from '@/utils/inject-highlight-styles'
import { sendMessage } from '@/utils/messaging'
import { scrollElementIntoView } from '@/utils/scroll'

export type AnchorStatus = 'anchored' | 'pending' | 'orphaned' | 'recovered'

interface AnchoredAnnotation {
  annotation: AnnotationHit
  highlight: Highlight | null
  range: Range
}

export class AnnotationManager {
  private annotations: Map<string, AnchoredAnnotation> = new Map()
  private orphanedAnnotationIds: Set<string> = new Set()
  private pendingAnnotationIds: Set<string> = new Set()
  private recoveredAnnotationIds: Set<string> = new Set()
  private orphanedAnnotations: Map<string, AnnotationHit> = new Map()
  private retryAttempts: Map<string, number> = new Map()
  private currentFocused: string | null = null
  private temporaryHighlight: Highlight | null = null
  private onHighlightClick?: (annotationIds: string[]) => void
  private onHighlightHover?: (annotationIds: string[]) => void
  private rootElement: HTMLElement
  private targetDocument: Document

  // PDF page state management (event-driven)
  private pdfPageStateManager?: PDFPageStateManager
  private pageReadyUnsubscribe?: () => void
  private pageDestroyedUnsubscribe?: () => void

  // Anchor retry settings
  private readonly MAX_TIMED_RETRIES = 5
  private readonly INITIAL_RETRY_DELAY_MS = 500
  private readonly MAX_RETRY_DELAY_MS = 8000

  // Debounced status updates
  private pendingStatusUpdates: Map<string, AnchorStatus> = new Map()
  private statusUpdateTimer: number | null = null
  private readonly STATUS_UPDATE_DEBOUNCE_MS = 10
  private isPDFHint: boolean = false

  private customDocumentUrl?: string

  private highlightObserver: MutationObserver | null = null
  private reanchorDebounceTimer: number | null = null
  private readonly REANCHOR_DEBOUNCE_MS = 500

  // Content observation for orphaned re-anchoring (non-PDF)
  private contentObserver: MutationObserver | null = null
  private orphanedReanchorTimer: number | null = null
  private lastTextContentLength: number = 0
  private orphanRetryCooldowns: Map<string, number> = new Map()

  // Lighter retry settings for non-PDF (vs PDF's 5 retries)
  private readonly NON_PDF_MAX_RETRIES = 3
  private readonly NON_PDF_INITIAL_DELAY_MS = 500
  private readonly NON_PDF_MAX_DELAY_MS = 2000
  private readonly ORPHANED_REANCHOR_DEBOUNCE_MS = 500
  private readonly ORPHAN_RETRY_COOLDOWN_MS = 2000

  // Guest frame detection - guest frames use postMessage for status updates
  private isGuestFrame: boolean = false

  constructor(options?: {
    onHighlightClick?: (annotationIds: string[]) => void
    onHighlightHover?: (annotationIds: string[]) => void
    rootElement?: HTMLElement
    isPDF?: boolean
    documentUrl?: string
    isGuestFrame?: boolean
  }) {
    this.rootElement = options?.rootElement || document.body
    this.targetDocument = this.rootElement.ownerDocument || document
    injectHighlightStyles(this.targetDocument)
    this.onHighlightClick = options?.onHighlightClick
    this.onHighlightHover = options?.onHighlightHover
    this.isPDFHint = options?.isPDF ?? false
    this.customDocumentUrl = options?.documentUrl
    this.isGuestFrame = options?.isGuestFrame ?? false
    this.setupEventListeners()
    this.setupHighlightObserver()
    this.setupContentObserver()
    this.lastTextContentLength = this.rootElement.textContent?.length ?? 0
  }

  /**
   * Setup document-level event listeners for highlight interactions.
   */
  private setupEventListeners(): void {
    let lastHoveredIds: string[] = []
    let hoverTimeout: number | null = null

    // Handle clicks on highlights
    this.targetDocument.addEventListener('mouseup', (event) => {
      // Don't select annotations if user is making a text selection
      const selection = this.targetDocument.defaultView?.getSelection()
      if (selection && !selection.isCollapsed) {
        return
      }

      const annotationIds = getAnnotationIdsAtPoint(
        event.clientX,
        event.clientY,
        this.targetDocument,
      )
      if (annotationIds.length > 0 && this.onHighlightClick) {
        this.onHighlightClick(annotationIds)
      }
    })

    // Throttled hover detection using mousemove
    const handleMouseMove = (event: MouseEvent) => {
      if (hoverTimeout) {
        return // Still in throttle period
      }

      hoverTimeout = window.setTimeout(() => {
        hoverTimeout = null
      }, 50) // Throttle to every 50ms

      const annotationIds = getAnnotationIdsAtPoint(
        event.clientX,
        event.clientY,
        this.targetDocument,
      )

      // Only send message if hover state changed
      const idsChanged
        = annotationIds.length !== lastHoveredIds.length
          || !annotationIds.every(id => lastHoveredIds.includes(id))

      if (idsChanged && this.onHighlightHover) {
        lastHoveredIds = annotationIds
        this.onHighlightHover(annotationIds)
      }
    }

    this.targetDocument.addEventListener('mousemove', handleMouseMove)

    // Clear hover when mouse leaves the window
    this.targetDocument.addEventListener('mouseleave', () => {
      if (lastHoveredIds.length > 0 && this.onHighlightHover) {
        lastHoveredIds = []
        this.onHighlightHover([])
      }
    })
  }

  /**
   * Setup MutationObserver to detect when something removes highlight elements.
   * When highlights are removed, schedules re-anchoring after a debounce period.
   */
  private setupHighlightObserver(): void {
    this.highlightObserver = new MutationObserver((mutations) => {
      let highlightsRemoved = false

      for (const mutation of mutations) {
        for (const node of mutation.removedNodes) {
          if (
            node.nodeName === 'RDA-HIGHLIGHT'
            || (node instanceof Element && node.querySelector('rda-highlight'))
          ) {
            highlightsRemoved = true
            break
          }
        }
        if (highlightsRemoved)
          break
      }

      if (highlightsRemoved) {
        this.scheduleReanchor()
      }
    })

    this.highlightObserver.observe(this.rootElement, {
      childList: true,
      subtree: true,
    })
  }

  /**
   * Schedule re-anchoring with debouncing to wait for hydration to settle.
   */
  private scheduleReanchor(): void {
    if (this.reanchorDebounceTimer !== null) {
      clearTimeout(this.reanchorDebounceTimer)
    }

    this.reanchorDebounceTimer = window.setTimeout(() => {
      this.reanchorDebounceTimer = null
      this.reanchorMissingHighlights()
    }, this.REANCHOR_DEBOUNCE_MS)
  }

  /**
   * Setup MutationObserver to detect when new content is added to the DOM.
   * Used for re-anchoring orphaned annotations when dynamic content loads.
   */
  private setupContentObserver(): void {
    this.contentObserver = new MutationObserver((mutations) => {
      // Skip if no orphaned annotations to re-anchor
      if (this.orphanedAnnotations.size === 0) {
        return
      }

      let significantContentAdded = false

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          // Skip highlight elements we create (avoid infinite loops)
          if (
            node.nodeName === 'RDA-HIGHLIGHT'
            || (node instanceof Element && node.querySelector('rda-highlight'))
          ) {
            continue
          }

          // Check if added node has meaningful text content
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            const textContent = node.textContent?.trim()
            if (textContent && textContent.length > 50) {
              significantContentAdded = true
              break
            }
          }
        }
        if (significantContentAdded)
          break
      }

      // Also check delta-based detection as a fallback
      if (!significantContentAdded) {
        const currentLength = this.rootElement.textContent?.length ?? 0
        const delta = currentLength - this.lastTextContentLength
        if (delta > 50) {
          significantContentAdded = true
        }
        this.lastTextContentLength = currentLength
      }

      if (significantContentAdded) {
        this.scheduleOrphanedReanchor()
      }
    })

    this.contentObserver.observe(this.rootElement, {
      childList: true,
      subtree: true,
    })
  }

  /**
   * Schedule re-anchoring of orphaned annotations with debouncing.
   */
  private scheduleOrphanedReanchor(): void {
    if (this.orphanedReanchorTimer !== null) {
      clearTimeout(this.orphanedReanchorTimer)
    }

    this.orphanedReanchorTimer = window.setTimeout(() => {
      this.orphanedReanchorTimer = null
      this.reanchorOrphanedAnnotations()
    }, this.ORPHANED_REANCHOR_DEBOUNCE_MS)
  }

  /**
   * Check if any orphaned annotation's quote text exists in the document.
   * Used as a quick filter before attempting expensive re-anchoring.
   */
  private hasOrphanedQuoteInDocument(): boolean {
    const documentText = this.rootElement.textContent || ''
    return Array.from(this.orphanedAnnotations.values()).some((ann) => {
      const selectors = ann._source.annotation_target?.selector
      if (!selectors)
        return false
      const quote = selectors.find(s => s.type === 'TextQuoteSelector') as { exact?: string } | undefined
      return quote?.exact && documentText.includes(quote.exact)
    })
  }

  /**
   * Check if an annotation is on cooldown (was recently retried).
   */
  private isOnCooldown(annotationId: string): boolean {
    const lastAttempt = this.orphanRetryCooldowns.get(annotationId)
    if (!lastAttempt)
      return false
    return Date.now() - lastAttempt < this.ORPHAN_RETRY_COOLDOWN_MS
  }

  /**
   * Re-anchor orphaned annotations after new content was detected.
   */
  private async reanchorOrphanedAnnotations(): Promise<void> {
    if (this.orphanedAnnotations.size === 0)
      return

    // Quick check: does any quote text exist in the document?
    if (!this.hasOrphanedQuoteInDocument()) {
      if (import.meta.env.DEV) {
        console.debug(
          '[AnnotationManager] Skipping orphaned re-anchor: no quote text found in document',
        )
      }
      return
    }

    if (import.meta.env.DEV) {
      console.debug(
        `[AnnotationManager] Attempting to re-anchor ${this.orphanedAnnotations.size} orphaned annotations after DOM change`,
      )
    }

    // Copy to avoid modification during iteration
    const toReanchor = Array.from(this.orphanedAnnotations.values())

    for (const annotation of toReanchor) {
      // Skip if on cooldown
      if (this.isOnCooldown(annotation._id)) {
        continue
      }

      // Mark retry attempt time
      this.orphanRetryCooldowns.set(annotation._id, Date.now())

      await this.anchorNonPDF(annotation)
    }
  }

  /**
   * Re-anchor annotations whose highlights are no longer in the DOM.
   */
  private async reanchorMissingHighlights(): Promise<void> {
    const toReanchor: AnnotationHit[] = []

    for (const [_id, anchored] of this.annotations) {
      if (anchored.highlight) {
        const stillInDOM = anchored.highlight.elements.some(el =>
          this.targetDocument.body.contains(el),
        )
        if (!stillInDOM) {
          // Highlight removed - need to re-anchor
          removeHighlight(anchored.highlight)
          anchored.highlight = null
          toReanchor.push(anchored.annotation)
        }
      }
    }

    if (toReanchor.length === 0)
      return

    if (import.meta.env.DEV) {
      console.debug(
        `[AnnotationManager] Re-anchoring ${toReanchor.length} annotations after DOM change`,
      )
    }

    for (const annotation of toReanchor) {
      await this.anchorNonPDF(annotation)
    }
  }

  /**
   * Setup event-driven PDF page tracking using PDFPageStateManager.
   * Safe to call multiple times - will only initialize once when PDF.js is ready.
   */
  private setupPDFPageTracking(): void {
    // Already initialized - skip
    if (this.pdfPageStateManager) {
      return
    }

    // PDF.js not ready yet - can't initialize
    if (!isPDFDocument()) {
      return
    }

    this.pdfPageStateManager = createPDFPageStateManager()
    this.pdfPageStateManager.initialize()

    this.pageReadyUnsubscribe = this.pdfPageStateManager.onPageTextLayerReady(
      pageIndex => this.handlePageTextLayerReady(pageIndex),
    )

    this.pageDestroyedUnsubscribe = this.pdfPageStateManager.onPageDestroyed(
      pageIndex => this.handlePageDestroyed(pageIndex),
    )

    if (import.meta.env.DEV) {
      console.debug('[AnnotationManager] PDF page tracking initialized')
    }
  }

  /**
   * Handle text layer becoming ready for a specific page.
   * Attempts to re-anchor any pending/orphaned annotations for this page.
   */
  private async handlePageTextLayerReady(pageIndex: number): Promise<void> {
    const annotationsForPage = this.getAnnotationsForPage(pageIndex)

    if (annotationsForPage.length === 0) {
      return
    }

    if (import.meta.env.DEV) {
      console.debug(
        `[AnnotationManager] Page ${pageIndex} ready, ${annotationsForPage.length} annotations to process`,
      )
    }

    for (const { id, annotation } of annotationsForPage) {
      const anchored = this.annotations.get(id)

      // Skip if already successfully anchored with valid highlight
      if (anchored?.highlight && anchored.highlight.elements.length > 0) {
        const stillInDOM = anchored.highlight.elements.every(el =>
          document.body.contains(el),
        )
        if (stillInDOM)
          continue
      }

      await this.attemptReanchor(id, annotation)
    }
  }

  /**
   * Handle page being destroyed (e.g., scrolled away in virtualized rendering).
   * Invalidates highlights that are no longer in the DOM.
   */
  private handlePageDestroyed(pageIndex: number): void {
    const annotationsForPage = this.getAnnotationsForPage(pageIndex)

    for (const { id } of annotationsForPage) {
      const anchored = this.annotations.get(id)
      if (!anchored?.highlight)
        continue

      const stillValid = anchored.highlight.elements.every(el =>
        document.body.contains(el),
      )

      if (!stillValid) {
        removeHighlight(anchored.highlight)
        anchored.highlight = null
        // Will be re-anchored when page renders again
      }
    }
  }

  /**
   * Get all annotations (including orphaned) that belong to a specific page.
   */
  private getAnnotationsForPage(
    pageIndex: number,
  ): Array<{ id: string, annotation: AnnotationHit }> {
    const result: Array<{ id: string, annotation: AnnotationHit }> = []

    // Check anchored annotations
    for (const [id, anchored] of this.annotations) {
      const selectors
        = anchored.annotation._source.annotation_target?.selector || []
      const annotationPageIndex = getPageIndexFromSelectors(selectors)
      if (annotationPageIndex === pageIndex) {
        result.push({ id, annotation: anchored.annotation })
      }
    }

    // Check orphaned annotations
    for (const [id, annotation] of this.orphanedAnnotations) {
      if (this.annotations.has(id))
        continue // Already in anchored list
      const selectors = annotation._source.annotation_target?.selector || []
      const annotationPageIndex = getPageIndexFromSelectors(selectors)
      if (annotationPageIndex === pageIndex) {
        result.push({ id, annotation })
      }
    }

    return result
  }

  /**
   * Attempt to re-anchor an annotation. Updates status based on result.
   */
  private async attemptReanchor(
    id: string,
    annotation: AnnotationHit,
  ): Promise<boolean> {
    const existingAnchored = this.annotations.get(id)
    const wasOrphaned = this.orphanedAnnotationIds.has(id)

    // Clean up existing placeholder/highlight
    if (existingAnchored?.highlight) {
      removeHighlight(existingAnchored.highlight)
    }
    this.annotations.delete(id)

    try {
      await this.anchorAnnotation(annotation)

      // Successfully anchored
      this.pendingAnnotationIds.delete(id)
      this.orphanedAnnotationIds.delete(id)
      this.orphanedAnnotations.delete(id)
      this.retryAttempts.delete(id)

      if (wasOrphaned) {
        this.recoveredAnnotationIds.add(id)
        this.scheduleStatusUpdate(id, 'recovered')
        if (import.meta.env.DEV) {
          console.debug(
            `[AnnotationManager] Annotation ${id} recovered from orphaned state`,
          )
        }
      }
      else {
        this.scheduleStatusUpdate(id, 'anchored')
      }

      return true
    }
    catch (error) {
      // Re-anchoring failed, keep in orphaned state
      this.orphanedAnnotationIds.add(id)
      this.orphanedAnnotations.set(id, annotation)
      this.scheduleStatusUpdate(id, 'orphaned')

      if (import.meta.env.DEV) {
        console.warn(`[AnnotationManager] Re-anchor failed for ${id}:`, error)
      }

      return false
    }
  }

  getAnchorStatus(): {
    anchored: string[]
    pending: string[]
    orphaned: string[]
    recovered: string[]
  } {
    const anchored: string[] = []
    const pending: string[] = Array.from(this.pendingAnnotationIds)
    const orphaned: string[] = Array.from(this.orphanedAnnotationIds)
    const recovered: string[] = Array.from(this.recoveredAnnotationIds)

    for (const [id] of this.annotations) {
      if (
        !this.orphanedAnnotationIds.has(id)
        && !this.pendingAnnotationIds.has(id)
        && !this.recoveredAnnotationIds.has(id)
      ) {
        anchored.push(id)
      }
    }

    return { anchored, pending, orphaned, recovered }
  }

  /**
   * Schedule a status update with debouncing.
   * Multiple updates within the debounce window are batched together,
   * with the latest status for each annotation ID taking precedence.
   */
  private scheduleStatusUpdate(
    annotationId: string,
    status: AnchorStatus,
  ): void {
    this.pendingStatusUpdates.set(annotationId, status)

    if (this.statusUpdateTimer === null) {
      this.statusUpdateTimer = window.setTimeout(() => {
        this.flushStatusUpdates()
      }, this.STATUS_UPDATE_DEBOUNCE_MS)
    }
  }

  /**
   * Flush all pending status updates to the sidebar.
   * Guest frames use postMessage to communicate with the host frame,
   * which then forwards to the sidebar.
   */
  private async flushStatusUpdates(): Promise<void> {
    this.statusUpdateTimer = null
    const updates = new Map(this.pendingStatusUpdates)
    this.pendingStatusUpdates.clear()

    for (const [annotationId, status] of updates) {
      try {
        if (this.isGuestFrame) {
          // Guest frames communicate via postMessage to host frame
          window.parent.postMessage(
            {
              type: 'rda:anchorStatusUpdate',
              annotationId,
              status,
              source: 'guest-frame',
            },
            '*',
          )
        }
        else {
          // Host frame sends directly to sidebar via extension messaging
          await sendMessage('anchorStatusUpdate', { annotationId, status })
        }
      }
      catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Failed to send anchor status update:', error)
        }
      }
    }
  }

  setHighlightsVisible(visible: boolean): void {
    if (visible) {
      this.rootElement.classList.add('rda-highlights-visible')
    }
    else {
      this.rootElement.classList.remove('rda-highlights-visible')
    }
  }

  async loadAnnotations(): Promise<void> {
    this.removeTemporaryHighlight()
    this.clearAnnotations()

    try {
      this.rootElement.normalize()
    }
    catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to normalize root element:', error)
      }
    }

    try {
      const url = this.customDocumentUrl || getDocumentURL()
      const response = await searchAnnotationsByUrl(url)
      const annotations = response.hits.hits

      // Debug: Log retrieved annotations and their selector structure
      if (import.meta.env.DEV) {
        console.debug('[AnnotationManager] Loaded annotations:', {
          url,
          count: annotations.length,
          annotations: annotations.map(ann => ({
            id: ann._id,
            fragment: ann._source.fragment?.substring(0, 50),
            hasAnnotationTarget: !!ann._source.annotation_target,
            hasSelectors: !!ann._source.annotation_target?.selector?.length,
            selectorTypes: ann._source.annotation_target?.selector?.map(s => s.type) || [],
            rawAnnotationTarget: ann._source.annotation_target,
          })),
        })
      }

      // Use URL hint OR runtime check - handles race condition where
      // isPDFDocument() returns false because PDF.js hasn't loaded yet
      const shouldUseHybridRetry = this.isPDFHint || isPDFDocument()

      // Try to initialize PDF tracking now (PDF.js might be ready)
      if (shouldUseHybridRetry) {
        this.setupPDFPageTracking()
      }

      for (const annotation of annotations) {
        if (shouldUseHybridRetry) {
          // Fire-and-forget: parallel anchoring, status updates stream to sidebar
          this.anchorWithHybridRetry(annotation)
        }
        else {
          // Fire-and-forget for non-PDF with light retry strategy
          this.anchorWithLightRetry(annotation)
        }
      }
    }
    catch (error) {
      console.error('Failed to load annotations:', error)
    }
  }

  /**
   * Non-blocking anchoring for non-PDF documents.
   * Handles recovery status when a previously orphaned annotation is successfully anchored.
   */
  private async anchorNonPDF(annotation: AnnotationHit): Promise<void> {
    const wasOrphaned = this.orphanedAnnotationIds.has(annotation._id)

    try {
      await this.anchorAnnotation(annotation)

      // Clean up orphaned state on success
      this.orphanedAnnotationIds.delete(annotation._id)
      this.orphanedAnnotations.delete(annotation._id)
      this.orphanRetryCooldowns.delete(annotation._id)

      if (wasOrphaned) {
        this.recoveredAnnotationIds.add(annotation._id)
        this.scheduleStatusUpdate(annotation._id, 'recovered')

        if (import.meta.env.DEV) {
          console.debug('[AnnotationManager] Recovered orphaned annotation:', annotation._id)
        }
      }
      else {
        this.scheduleStatusUpdate(annotation._id, 'anchored')

        if (import.meta.env.DEV) {
          console.debug('[AnnotationManager] Successfully anchored:', annotation._id)
        }
      }
    }
    catch (error) {
      if (!this.annotations.has(annotation._id)) {
        this.orphanedAnnotationIds.add(annotation._id)
        this.orphanedAnnotations.set(annotation._id, annotation)
        // Only send orphaned status if not already orphaned (avoid duplicate updates)
        if (!wasOrphaned) {
          this.scheduleStatusUpdate(annotation._id, 'orphaned')
        }

        if (import.meta.env.DEV) {
          console.warn('[AnnotationManager] Failed to anchor annotation:', {
            id: annotation._id,
            fragment: annotation._source.fragment?.substring(0, 50),
            hasAnnotationTarget: !!annotation._source.annotation_target,
            hasSelectors: !!annotation._source.annotation_target?.selector?.length,
            selectorTypes: annotation._source.annotation_target?.selector?.map(s => s.type) || [],
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }
  }

  /**
   * Light retry strategy for non-PDF annotations.
   * Similar to PDF's hybrid retry but with fewer attempts.
   * Fire-and-forget - does not block caller.
   */
  private anchorWithLightRetry(annotation: AnnotationHit): void {
    const id = annotation._id

    // Mark as pending immediately so sidebar shows loading state
    this.pendingAnnotationIds.add(id)
    this.orphanedAnnotations.set(id, annotation)
    this.scheduleStatusUpdate(id, 'pending')

    // Fire initial attempt asynchronously
    this.tryInitialAnchorNonPDF(annotation)
  }

  /**
   * Try initial anchor attempt for non-PDF, then start timed retries if needed.
   */
  private async tryInitialAnchorNonPDF(annotation: AnnotationHit): Promise<void> {
    const id = annotation._id

    try {
      await this.anchorAnnotation(annotation)
      const anchored = this.annotations.get(id)

      if (anchored?.highlight) {
        // Successfully anchored with real highlight
        this.pendingAnnotationIds.delete(id)
        this.orphanedAnnotations.delete(id)
        this.scheduleStatusUpdate(id, 'anchored')
        return
      }
    }
    catch {
      // Initial attempt failed - start timed retries
    }

    // Start timed retries in background
    this.runNonPDFTimedRetries(annotation, 0, this.NON_PDF_INITIAL_DELAY_MS)
  }

  /**
   * Run timed retries for non-PDF annotations with exponential backoff.
   * Content observer provides event-driven retry independently.
   */
  private async runNonPDFTimedRetries(
    annotation: AnnotationHit,
    attempts: number,
    delay: number,
  ): Promise<void> {
    const id = annotation._id

    while (attempts < this.NON_PDF_MAX_RETRIES) {
      // Check if already successfully anchored (by content observer)
      const anchored = this.annotations.get(id)
      if (anchored?.highlight && anchored.highlight.elements.length > 0) {
        return // Already done
      }

      attempts++
      this.retryAttempts.set(id, attempts)
      await this.sleep(delay)
      delay = Math.min(delay * 2, this.NON_PDF_MAX_DELAY_MS)

      try {
        // Clean up any existing entry
        const existing = this.annotations.get(id)
        if (existing) {
          if (existing.highlight) {
            removeHighlight(existing.highlight)
          }
          this.annotations.delete(id)
        }

        await this.anchorAnnotation(annotation)

        const newAnchored = this.annotations.get(id)
        if (newAnchored?.highlight) {
          // Successfully anchored
          this.pendingAnnotationIds.delete(id)
          this.orphanedAnnotations.delete(id)
          this.retryAttempts.delete(id)
          this.scheduleStatusUpdate(id, 'anchored')
          return
        }
      }
      catch {
        // Continue retrying
      }
    }

    // Timed retries exhausted - mark as orphaned
    // Content observer will continue providing recovery opportunities
    this.pendingAnnotationIds.delete(id)
    this.orphanedAnnotationIds.add(id)
    this.retryAttempts.delete(id)
    this.scheduleStatusUpdate(id, 'orphaned')

    if (import.meta.env.DEV) {
      console.debug(
        `[AnnotationManager] Non-PDF annotation ${id} marked orphaned after ${this.NON_PDF_MAX_RETRIES} retries`,
      )
    }
  }

  /**
   * Hybrid retry strategy for PDF annotations.
   * Fully fire-and-forget - does not block caller.
   * Status updates stream to sidebar as anchoring progresses.
   */
  private anchorWithHybridRetry(annotation: AnnotationHit): void {
    const id = annotation._id

    // Mark as pending immediately so sidebar shows loading state
    this.pendingAnnotationIds.add(id)
    this.orphanedAnnotations.set(id, annotation)
    this.scheduleStatusUpdate(id, 'pending')

    // Fire initial attempt asynchronously
    this.tryInitialAnchor(annotation)
  }

  /**
   * Try initial anchor attempt, then start timed retries if needed.
   *
   * For PDF annotations on non-rendered pages: verifies that the text content
   * exists on the target page (using pdfPage.getTextContent() which works
   * without rendering). If verified, skips timed retries and relies entirely
   * on event-driven re-anchoring when the page renders (scrolled into view).
   * This prevents false "orphaned" status for annotations on distant pages.
   */
  private async tryInitialAnchor(annotation: AnnotationHit): Promise<void> {
    const id = annotation._id

    try {
      await this.anchorAnnotation(annotation)
      const anchored = this.annotations.get(id)

      if (anchored?.highlight) {
        // Successfully anchored with real highlight
        this.pendingAnnotationIds.delete(id)
        this.orphanedAnnotations.delete(id)
        this.scheduleStatusUpdate(id, 'anchored')
        return
      }
      // Placeholder was created - check if text exists on the target page
    }
    catch {
      // Initial attempt failed - check if text exists on the target page
    }

    // For PDF annotations: verify text exists before starting retries.
    // If text is verified, the page just hasn't rendered its text layer yet.
    // Skip timed retries and rely on event-driven re-anchoring via
    // PDFPageStateManager (fires when user scrolls to the page).
    const selectors = annotation._source.annotation_target?.selector
    if (selectors && isPDFDocument()) {
      try {
        const { verified } = await verifyAnnotationTextOnPage(selectors)
        if (verified) {
          if (import.meta.env.DEV) {
            console.debug(
              `[AnnotationManager] Text verified for ${id}, waiting for page render (event-driven)`,
            )
          }
          // Keep as pending - event-driven re-anchoring will handle it
          // when handlePageTextLayerReady fires
          return
        }
      }
      catch {
        // Verification failed - fall through to timed retries
      }
    }

    // Start timed retries in background (text not verified or non-PDF)
    this.runTimedRetries(annotation, 0, this.INITIAL_RETRY_DELAY_MS)
  }

  /**
   * Run timed retries in the background with exponential backoff.
   * Event-driven retries via handlePageTextLayerReady continue independently.
   */
  private async runTimedRetries(
    annotation: AnnotationHit,
    attempts: number,
    delay: number,
  ): Promise<void> {
    const id = annotation._id

    while (attempts < this.MAX_TIMED_RETRIES) {
      // Check if already successfully anchored (by event-driven retry)
      const anchored = this.annotations.get(id)
      if (anchored?.highlight && anchored.highlight.elements.length > 0) {
        return // Already done
      }

      attempts++
      this.retryAttempts.set(id, attempts)
      await this.sleep(delay)
      delay = Math.min(delay * 2, this.MAX_RETRY_DELAY_MS)

      try {
        // Clean up any existing placeholder
        const existing = this.annotations.get(id)
        if (existing) {
          if (existing.highlight) {
            removeHighlight(existing.highlight)
          }
          this.annotations.delete(id)
        }

        await this.anchorAnnotation(annotation)

        const newAnchored = this.annotations.get(id)
        if (newAnchored?.highlight) {
          // Successfully anchored
          this.pendingAnnotationIds.delete(id)
          this.orphanedAnnotations.delete(id)
          this.retryAttempts.delete(id)
          this.scheduleStatusUpdate(id, 'anchored')
          return
        }
      }
      catch {
        // Continue retrying
      }
    }

    // Timed retries exhausted - mark as orphaned
    // Event-driven retries via handlePageTextLayerReady will continue
    this.pendingAnnotationIds.delete(id)
    this.orphanedAnnotationIds.add(id)
    this.retryAttempts.delete(id)
    this.scheduleStatusUpdate(id, 'orphaned')

    if (import.meta.env.DEV) {
      console.debug(
        `[AnnotationManager] Annotation ${id} marked orphaned after ${this.MAX_TIMED_RETRIES} retries`,
      )
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async createTemporaryHighlight(range: Range): Promise<void> {
    this.removeTemporaryHighlight()

    try {
      this.temporaryHighlight = highlightRange(range, 'temporary')
      setHighlightFocused(this.temporaryHighlight, true)
    }
    catch (error) {
      console.error('Failed to create temporary highlight:', error)
    }
  }

  removeTemporaryHighlight(): void {
    if (this.temporaryHighlight) {
      // Collect parent nodes before removal
      const parents = new Set<Node>()
      for (const element of this.temporaryHighlight.elements) {
        if (element.parentNode) {
          parents.add(element.parentNode)
        }
      }

      removeHighlight(this.temporaryHighlight)
      this.temporaryHighlight = null

      // Normalize affected parents after removal
      for (const parent of parents) {
        if (parent.nodeType === Node.ELEMENT_NODE) {
          try {
            (parent as Element).normalize()
          }
          catch (error) {
            if (import.meta.env.DEV) {
              console.warn(
                'Failed to normalize parent after removing temporary highlight:',
                error,
              )
            }
          }
        }
      }
    }
  }

  private async anchorAnnotation(annotation: AnnotationHit): Promise<void> {
    if (
      !annotation._source.annotation_target?.selector
      || annotation._source.annotation_target.selector.length === 0
    ) {
      throw new Error('No selector found for annotation')
    }

    const range = await anchor(
      this.rootElement,
      annotation._source.annotation_target.selector,
    )

    const isPlaceholder = isPlaceholderRange(range)
    const highlight = isPlaceholder
      ? null
      : highlightRange(range, annotation._id)

    this.annotations.set(annotation._id, { annotation, highlight, range })

    // Mark as successfully anchored (status update handled by caller)
    this.orphanedAnnotationIds.delete(annotation._id)

    if (highlight) {
      highlight.elements.forEach((element) => {
        element.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          this.focusAnnotation(annotation._id)
        })
      })
    }
  }

  async scrollToAnnotation(annotationId: string): Promise<void> {
    const anchored = this.annotations.get(annotationId)
    if (!anchored) {
      return
    }

    if (!anchored.highlight) {
      const startContainer = anchored.range.startContainer
      const element
        = startContainer.nodeType === Node.ELEMENT_NODE
          ? (startContainer as HTMLElement)
          : startContainer.parentElement

      if (element) {
        await scrollElementIntoView(element, { maxDuration: 500 })

        await new Promise(resolve => setTimeout(resolve, 100))

        const reanchored = this.annotations.get(annotationId)
        if (reanchored?.highlight) {
          this.focusAnnotation(annotationId)
          const firstElement = reanchored.highlight.elements[0]
          await scrollElementIntoView(firstElement, { maxDuration: 500 })
        }
      }
      return
    }

    if (!anchored.highlight.elements.length) {
      return
    }

    this.focusAnnotation(annotationId)

    const firstElement = anchored.highlight.elements[0]
    await scrollElementIntoView(firstElement, { maxDuration: 500 })
  }

  getAnnotation(annotationId: string): AnnotationHit | null {
    const anchored = this.annotations.get(annotationId)
    return anchored ? anchored.annotation : null
  }

  getAnnotations(annotationIds: string[]): AnnotationHit[] {
    const results: AnnotationHit[] = []
    for (const id of annotationIds) {
      const annotation = this.getAnnotation(id)
      if (annotation) {
        results.push(annotation)
      }
    }
    return results
  }

  private focusAnnotation(annotationId: string): void {
    if (this.currentFocused) {
      const previousFocused = this.annotations.get(this.currentFocused)
      if (previousFocused?.highlight) {
        setHighlightFocused(previousFocused.highlight, false)
      }
    }

    const anchored = this.annotations.get(annotationId)
    if (anchored?.highlight) {
      setHighlightFocused(anchored.highlight, true)
      this.currentFocused = annotationId
    }
  }

  clearFocusedAnnotation(): void {
    if (this.currentFocused) {
      const previousFocused = this.annotations.get(this.currentFocused)
      if (previousFocused?.highlight) {
        setHighlightFocused(previousFocused.highlight, false)
      }
      this.currentFocused = null
    }
  }

  private clearAnnotations(): void {
    const parents = new Set<Node>()

    for (const { highlight } of this.annotations.values()) {
      if (highlight) {
        for (const element of highlight.elements) {
          if (element.parentNode) {
            parents.add(element.parentNode)
          }
        }
        removeHighlight(highlight)
      }
    }

    for (const parent of parents) {
      if (parent.nodeType === Node.ELEMENT_NODE) {
        (parent as Element).normalize()
      }
    }

    this.annotations.clear()
    this.currentFocused = null
  }

  destroy(): void {
    // Clean up PDF page state management
    if (this.pageReadyUnsubscribe) {
      this.pageReadyUnsubscribe()
      this.pageReadyUnsubscribe = undefined
    }
    if (this.pageDestroyedUnsubscribe) {
      this.pageDestroyedUnsubscribe()
      this.pageDestroyedUnsubscribe = undefined
    }
    if (this.pdfPageStateManager) {
      destroyPDFPageStateManager()
      this.pdfPageStateManager = undefined
    }

    if (this.highlightObserver) {
      this.highlightObserver.disconnect()
      this.highlightObserver = null
    }
    if (this.reanchorDebounceTimer !== null) {
      clearTimeout(this.reanchorDebounceTimer)
      this.reanchorDebounceTimer = null
    }

    // Clean up content observer for orphaned re-anchoring
    if (this.contentObserver) {
      this.contentObserver.disconnect()
      this.contentObserver = null
    }
    if (this.orphanedReanchorTimer !== null) {
      clearTimeout(this.orphanedReanchorTimer)
      this.orphanedReanchorTimer = null
    }

    if (this.statusUpdateTimer !== null) {
      clearTimeout(this.statusUpdateTimer)
      this.statusUpdateTimer = null
    }
    this.pendingStatusUpdates.clear()

    // Clear all state
    this.pendingAnnotationIds.clear()
    this.recoveredAnnotationIds.clear()
    this.orphanedAnnotations.clear()
    this.retryAttempts.clear()
    this.orphanRetryCooldowns.clear()

    this.removeTemporaryHighlight()
    this.clearAnnotations()
  }
}

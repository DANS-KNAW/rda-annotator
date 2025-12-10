import { anchor } from "@/utils/anchoring";
import {
  highlightRange,
  removeHighlight,
  setHighlightFocused,
  type Highlight,
} from "@/utils/highlighter";
import { scrollElementIntoView } from "@/utils/scroll";
import { searchAnnotationsByUrl } from "@/utils/elasticsearch-fetch";
import type { AnnotationHit } from "@/types/elastic-search-document.interface";
import { injectHighlightStyles } from "@/utils/inject-highlight-styles";
import { getAnnotationIdsAtPoint } from "@/utils/highlights-at-point";
import { getDocumentURL } from "@/utils/document-url";
import {
  isPDFDocument,
  isPlaceholderRange,
  getPageIndexFromSelectors,
  createPDFPageStateManager,
  destroyPDFPageStateManager,
  type PDFPageStateManager,
} from "@/utils/anchoring/pdf";
import { sendMessage } from "@/utils/messaging";

export type AnchorStatus = "anchored" | "pending" | "orphaned" | "recovered";

interface AnchoredAnnotation {
  annotation: AnnotationHit;
  highlight: Highlight | null;
  range: Range;
}

export class AnnotationManager {
  private annotations: Map<string, AnchoredAnnotation> = new Map();
  private orphanedAnnotationIds: Set<string> = new Set();
  private pendingAnnotationIds: Set<string> = new Set();
  private recoveredAnnotationIds: Set<string> = new Set();
  private orphanedAnnotations: Map<string, AnnotationHit> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private currentFocused: string | null = null;
  private temporaryHighlight: Highlight | null = null;
  private onHighlightClick?: (annotationIds: string[]) => void;
  private onHighlightHover?: (annotationIds: string[]) => void;
  private rootElement: HTMLElement;
  private targetDocument: Document;

  // PDF page state management (event-driven)
  private pdfPageStateManager?: PDFPageStateManager;
  private pageReadyUnsubscribe?: () => void;
  private pageDestroyedUnsubscribe?: () => void;

  // Anchor retry settings
  private readonly MAX_TIMED_RETRIES = 5;
  private readonly INITIAL_RETRY_DELAY_MS = 500;
  private readonly MAX_RETRY_DELAY_MS = 8000;

  // Debounced status updates
  private pendingStatusUpdates: Map<string, AnchorStatus> = new Map();
  private statusUpdateTimer: number | null = null;
  private readonly STATUS_UPDATE_DEBOUNCE_MS = 10;
  private isPDFHint: boolean = false;

  private customDocumentUrl?: string;

  private highlightObserver: MutationObserver | null = null;
  private reanchorDebounceTimer: number | null = null;
  private readonly REANCHOR_DEBOUNCE_MS = 500;

  // Guest frame detection - guest frames use postMessage for status updates
  private isGuestFrame: boolean = false;

  constructor(options?: {
    onHighlightClick?: (annotationIds: string[]) => void;
    onHighlightHover?: (annotationIds: string[]) => void;
    rootElement?: HTMLElement;
    isPDF?: boolean;
    documentUrl?: string;
    isGuestFrame?: boolean;
  }) {
    this.rootElement = options?.rootElement || document.body;
    this.targetDocument = this.rootElement.ownerDocument || document;
    injectHighlightStyles(this.targetDocument);
    this.onHighlightClick = options?.onHighlightClick;
    this.onHighlightHover = options?.onHighlightHover;
    this.isPDFHint = options?.isPDF ?? false;
    this.customDocumentUrl = options?.documentUrl;
    this.isGuestFrame = options?.isGuestFrame ?? false;
    this.setupEventListeners();
    this.setupHighlightObserver();
  }

  /**
   * Setup document-level event listeners for highlight interactions.
   */
  private setupEventListeners(): void {
    let lastHoveredIds: string[] = [];
    let hoverTimeout: number | null = null;

    // Handle clicks on highlights
    this.targetDocument.addEventListener("mouseup", (event) => {
      // Don't select annotations if user is making a text selection
      const selection = this.targetDocument.defaultView?.getSelection();
      if (selection && !selection.isCollapsed) {
        return;
      }

      const annotationIds = getAnnotationIdsAtPoint(
        event.clientX,
        event.clientY,
        this.targetDocument
      );
      if (annotationIds.length > 0 && this.onHighlightClick) {
        this.onHighlightClick(annotationIds);
      }
    });

    // Throttled hover detection using mousemove
    const handleMouseMove = (event: MouseEvent) => {
      if (hoverTimeout) {
        return; // Still in throttle period
      }

      hoverTimeout = window.setTimeout(() => {
        hoverTimeout = null;
      }, 50); // Throttle to every 50ms

      const annotationIds = getAnnotationIdsAtPoint(
        event.clientX,
        event.clientY,
        this.targetDocument
      );

      // Only send message if hover state changed
      const idsChanged =
        annotationIds.length !== lastHoveredIds.length ||
        !annotationIds.every((id) => lastHoveredIds.includes(id));

      if (idsChanged && this.onHighlightHover) {
        lastHoveredIds = annotationIds;
        this.onHighlightHover(annotationIds);
      }
    };

    this.targetDocument.addEventListener("mousemove", handleMouseMove);

    // Clear hover when mouse leaves the window
    this.targetDocument.addEventListener("mouseleave", () => {
      if (lastHoveredIds.length > 0 && this.onHighlightHover) {
        lastHoveredIds = [];
        this.onHighlightHover([]);
      }
    });
  }

  /**
   * Setup MutationObserver to detect when something removes highlight elements.
   * When highlights are removed, schedules re-anchoring after a debounce period.
   */
  private setupHighlightObserver(): void {
    this.highlightObserver = new MutationObserver((mutations) => {
      let highlightsRemoved = false;

      for (const mutation of mutations) {
        for (const node of mutation.removedNodes) {
          if (
            node.nodeName === "RDA-HIGHLIGHT" ||
            (node instanceof Element && node.querySelector("rda-highlight"))
          ) {
            highlightsRemoved = true;
            break;
          }
        }
        if (highlightsRemoved) break;
      }

      if (highlightsRemoved) {
        this.scheduleReanchor();
      }
    });

    this.highlightObserver.observe(this.rootElement, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Schedule re-anchoring with debouncing to wait for hydration to settle.
   */
  private scheduleReanchor(): void {
    if (this.reanchorDebounceTimer !== null) {
      clearTimeout(this.reanchorDebounceTimer);
    }

    this.reanchorDebounceTimer = window.setTimeout(() => {
      this.reanchorDebounceTimer = null;
      this.reanchorMissingHighlights();
    }, this.REANCHOR_DEBOUNCE_MS);
  }

  /**
   * Re-anchor annotations whose highlights are no longer in the DOM.
   */
  private async reanchorMissingHighlights(): Promise<void> {
    const toReanchor: AnnotationHit[] = [];

    for (const [id, anchored] of this.annotations) {
      if (anchored.highlight) {
        const stillInDOM = anchored.highlight.elements.some((el) =>
          this.targetDocument.body.contains(el)
        );
        if (!stillInDOM) {
          // Highlight removed - need to re-anchor
          removeHighlight(anchored.highlight);
          anchored.highlight = null;
          toReanchor.push(anchored.annotation);
        }
      }
    }

    if (toReanchor.length === 0) return;

    if (import.meta.env.DEV) {
      console.log(
        `[AnnotationManager] Re-anchoring ${toReanchor.length} annotations after DOM change`
      );
    }

    for (const annotation of toReanchor) {
      await this.anchorNonPDF(annotation);
    }
  }

  /**
   * Setup event-driven PDF page tracking using PDFPageStateManager.
   * Safe to call multiple times - will only initialize once when PDF.js is ready.
   */
  private setupPDFPageTracking(): void {
    // Already initialized - skip
    if (this.pdfPageStateManager) {
      return;
    }

    // PDF.js not ready yet - can't initialize
    if (!isPDFDocument()) {
      return;
    }

    this.pdfPageStateManager = createPDFPageStateManager();
    this.pdfPageStateManager.initialize();

    this.pageReadyUnsubscribe = this.pdfPageStateManager.onPageTextLayerReady(
      (pageIndex) => this.handlePageTextLayerReady(pageIndex)
    );

    this.pageDestroyedUnsubscribe = this.pdfPageStateManager.onPageDestroyed(
      (pageIndex) => this.handlePageDestroyed(pageIndex)
    );

    if (import.meta.env.DEV) {
      console.log("[AnnotationManager] PDF page tracking initialized");
    }
  }

  /**
   * Handle text layer becoming ready for a specific page.
   * Attempts to re-anchor any pending/orphaned annotations for this page.
   */
  private async handlePageTextLayerReady(pageIndex: number): Promise<void> {
    const annotationsForPage = this.getAnnotationsForPage(pageIndex);

    if (annotationsForPage.length === 0) {
      return;
    }

    if (import.meta.env.DEV) {
      console.log(
        `[AnnotationManager] Page ${pageIndex} ready, ${annotationsForPage.length} annotations to process`
      );
    }

    for (const { id, annotation } of annotationsForPage) {
      const anchored = this.annotations.get(id);

      // Skip if already successfully anchored with valid highlight
      if (anchored?.highlight && anchored.highlight.elements.length > 0) {
        const stillInDOM = anchored.highlight.elements.every((el) =>
          document.body.contains(el)
        );
        if (stillInDOM) continue;
      }

      await this.attemptReanchor(id, annotation);
    }
  }

  /**
   * Handle page being destroyed (e.g., scrolled away in virtualized rendering).
   * Invalidates highlights that are no longer in the DOM.
   */
  private handlePageDestroyed(pageIndex: number): void {
    const annotationsForPage = this.getAnnotationsForPage(pageIndex);

    for (const { id } of annotationsForPage) {
      const anchored = this.annotations.get(id);
      if (!anchored?.highlight) continue;

      const stillValid = anchored.highlight.elements.every((el) =>
        document.body.contains(el)
      );

      if (!stillValid) {
        removeHighlight(anchored.highlight);
        anchored.highlight = null;
        // Will be re-anchored when page renders again
      }
    }
  }

  /**
   * Get all annotations (including orphaned) that belong to a specific page.
   */
  private getAnnotationsForPage(
    pageIndex: number
  ): Array<{ id: string; annotation: AnnotationHit }> {
    const result: Array<{ id: string; annotation: AnnotationHit }> = [];

    // Check anchored annotations
    for (const [id, anchored] of this.annotations) {
      const selectors =
        anchored.annotation._source.annotation_target?.selector || [];
      const annotationPageIndex = getPageIndexFromSelectors(selectors);
      if (annotationPageIndex === pageIndex) {
        result.push({ id, annotation: anchored.annotation });
      }
    }

    // Check orphaned annotations
    for (const [id, annotation] of this.orphanedAnnotations) {
      if (this.annotations.has(id)) continue; // Already in anchored list
      const selectors = annotation._source.annotation_target?.selector || [];
      const annotationPageIndex = getPageIndexFromSelectors(selectors);
      if (annotationPageIndex === pageIndex) {
        result.push({ id, annotation });
      }
    }

    return result;
  }

  /**
   * Attempt to re-anchor an annotation. Updates status based on result.
   */
  private async attemptReanchor(
    id: string,
    annotation: AnnotationHit
  ): Promise<boolean> {
    const existingAnchored = this.annotations.get(id);
    const wasOrphaned = this.orphanedAnnotationIds.has(id);

    // Clean up existing placeholder/highlight
    if (existingAnchored?.highlight) {
      removeHighlight(existingAnchored.highlight);
    }
    this.annotations.delete(id);

    try {
      await this.anchorAnnotation(annotation);

      // Successfully anchored
      this.pendingAnnotationIds.delete(id);
      this.orphanedAnnotationIds.delete(id);
      this.orphanedAnnotations.delete(id);
      this.retryAttempts.delete(id);

      if (wasOrphaned) {
        this.recoveredAnnotationIds.add(id);
        this.scheduleStatusUpdate(id, "recovered");
        if (import.meta.env.DEV) {
          console.log(
            `[AnnotationManager] Annotation ${id} recovered from orphaned state`
          );
        }
      } else {
        this.scheduleStatusUpdate(id, "anchored");
      }

      return true;
    } catch (error) {
      // Re-anchoring failed, keep in orphaned state
      this.orphanedAnnotationIds.add(id);
      this.orphanedAnnotations.set(id, annotation);
      this.scheduleStatusUpdate(id, "orphaned");

      if (import.meta.env.DEV) {
        console.warn(`[AnnotationManager] Re-anchor failed for ${id}:`, error);
      }

      return false;
    }
  }

  getAnchorStatus(): {
    anchored: string[];
    pending: string[];
    orphaned: string[];
    recovered: string[];
  } {
    const anchored: string[] = [];
    const pending: string[] = Array.from(this.pendingAnnotationIds);
    const orphaned: string[] = Array.from(this.orphanedAnnotationIds);
    const recovered: string[] = Array.from(this.recoveredAnnotationIds);

    for (const [id] of this.annotations) {
      if (
        !this.orphanedAnnotationIds.has(id) &&
        !this.pendingAnnotationIds.has(id) &&
        !this.recoveredAnnotationIds.has(id)
      ) {
        anchored.push(id);
      }
    }

    return { anchored, pending, orphaned, recovered };
  }

  /**
   * Schedule a status update with debouncing.
   * Multiple updates within the debounce window are batched together,
   * with the latest status for each annotation ID taking precedence.
   */
  private scheduleStatusUpdate(
    annotationId: string,
    status: AnchorStatus
  ): void {
    this.pendingStatusUpdates.set(annotationId, status);

    if (this.statusUpdateTimer === null) {
      this.statusUpdateTimer = window.setTimeout(() => {
        this.flushStatusUpdates();
      }, this.STATUS_UPDATE_DEBOUNCE_MS);
    }
  }

  /**
   * Flush all pending status updates to the sidebar.
   * Guest frames use postMessage to communicate with the host frame,
   * which then forwards to the sidebar.
   */
  private async flushStatusUpdates(): Promise<void> {
    this.statusUpdateTimer = null;
    const updates = new Map(this.pendingStatusUpdates);
    this.pendingStatusUpdates.clear();

    for (const [annotationId, status] of updates) {
      try {
        if (this.isGuestFrame) {
          // Guest frames communicate via postMessage to host frame
          window.parent.postMessage(
            {
              type: "rda:anchorStatusUpdate",
              annotationId,
              status,
              source: "guest-frame",
            },
            "*"
          );
        } else {
          // Host frame sends directly to sidebar via extension messaging
          await sendMessage("anchorStatusUpdate", { annotationId, status });
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Failed to send anchor status update:", error);
        }
      }
    }
  }

  setHighlightsVisible(visible: boolean): void {
    if (visible) {
      this.rootElement.classList.add("rda-highlights-visible");
    } else {
      this.rootElement.classList.remove("rda-highlights-visible");
    }
  }

  async loadAnnotations(): Promise<void> {
    this.removeTemporaryHighlight();
    this.clearAnnotations();

    try {
      this.rootElement.normalize();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("Failed to normalize root element:", error);
      }
    }

    try {
      const url = this.customDocumentUrl || getDocumentURL();
      const response = await searchAnnotationsByUrl(url);
      const annotations = response.hits.hits;

      // Use URL hint OR runtime check - handles race condition where
      // isPDFDocument() returns false because PDF.js hasn't loaded yet
      const shouldUseHybridRetry = this.isPDFHint || isPDFDocument();

      // Try to initialize PDF tracking now (PDF.js might be ready)
      if (shouldUseHybridRetry) {
        this.setupPDFPageTracking();
      }

      for (const annotation of annotations) {
        if (shouldUseHybridRetry) {
          // Fire-and-forget: parallel anchoring, status updates stream to sidebar
          this.anchorWithHybridRetry(annotation);
        } else {
          // Fire-and-forget for non-PDF too
          this.anchorNonPDF(annotation);
        }
      }
    } catch (error) {
      console.error("Failed to load annotations:", error);
    }
  }

  /**
   * Non-blocking anchoring for non-PDF documents.
   */
  private async anchorNonPDF(annotation: AnnotationHit): Promise<void> {
    try {
      await this.anchorAnnotation(annotation);
      this.scheduleStatusUpdate(annotation._id, "anchored");
    } catch {
      if (!this.annotations.has(annotation._id)) {
        this.orphanedAnnotationIds.add(annotation._id);
        this.orphanedAnnotations.set(annotation._id, annotation);
        this.scheduleStatusUpdate(annotation._id, "orphaned");
      }
    }
  }

  /**
   * Hybrid retry strategy for PDF annotations.
   * Fully fire-and-forget - does not block caller.
   * Status updates stream to sidebar as anchoring progresses.
   */
  private anchorWithHybridRetry(annotation: AnnotationHit): void {
    const id = annotation._id;

    // Mark as pending immediately so sidebar shows loading state
    this.pendingAnnotationIds.add(id);
    this.orphanedAnnotations.set(id, annotation);
    this.scheduleStatusUpdate(id, "pending");

    // Fire initial attempt asynchronously
    this.tryInitialAnchor(annotation);
  }

  /**
   * Try initial anchor attempt, then start timed retries if needed.
   */
  private async tryInitialAnchor(annotation: AnnotationHit): Promise<void> {
    const id = annotation._id;

    try {
      await this.anchorAnnotation(annotation);
      const anchored = this.annotations.get(id);

      if (anchored?.highlight) {
        // Successfully anchored with real highlight
        this.pendingAnnotationIds.delete(id);
        this.orphanedAnnotations.delete(id);
        this.scheduleStatusUpdate(id, "anchored");
        return;
      }
      // Placeholder was created - continue with timed retries
    } catch {
      // Initial attempt failed - continue with timed retries
    }

    // Start timed retries in background
    this.runTimedRetries(annotation, 0, this.INITIAL_RETRY_DELAY_MS);
  }

  /**
   * Run timed retries in the background with exponential backoff.
   * Event-driven retries via handlePageTextLayerReady continue independently.
   */
  private async runTimedRetries(
    annotation: AnnotationHit,
    attempts: number,
    delay: number
  ): Promise<void> {
    const id = annotation._id;

    while (attempts < this.MAX_TIMED_RETRIES) {
      // Check if already successfully anchored (by event-driven retry)
      const anchored = this.annotations.get(id);
      if (anchored?.highlight && anchored.highlight.elements.length > 0) {
        return; // Already done
      }

      attempts++;
      this.retryAttempts.set(id, attempts);
      await this.sleep(delay);
      delay = Math.min(delay * 2, this.MAX_RETRY_DELAY_MS);

      try {
        // Clean up any existing placeholder
        const existing = this.annotations.get(id);
        if (existing) {
          if (existing.highlight) {
            removeHighlight(existing.highlight);
          }
          this.annotations.delete(id);
        }

        await this.anchorAnnotation(annotation);

        const newAnchored = this.annotations.get(id);
        if (newAnchored?.highlight) {
          // Successfully anchored
          this.pendingAnnotationIds.delete(id);
          this.orphanedAnnotations.delete(id);
          this.retryAttempts.delete(id);
          this.scheduleStatusUpdate(id, "anchored");
          return;
        }
      } catch {
        // Continue retrying
      }
    }

    // Timed retries exhausted - mark as orphaned
    // Event-driven retries via handlePageTextLayerReady will continue
    this.pendingAnnotationIds.delete(id);
    this.orphanedAnnotationIds.add(id);
    this.retryAttempts.delete(id);
    this.scheduleStatusUpdate(id, "orphaned");

    if (import.meta.env.DEV) {
      console.log(
        `[AnnotationManager] Annotation ${id} marked orphaned after ${this.MAX_TIMED_RETRIES} retries`
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async createTemporaryHighlight(range: Range): Promise<void> {
    this.removeTemporaryHighlight();

    try {
      this.temporaryHighlight = highlightRange(range, "temporary");
      setHighlightFocused(this.temporaryHighlight, true);
    } catch (error) {
      console.error("Failed to create temporary highlight:", error);
    }
  }

  removeTemporaryHighlight(): void {
    if (this.temporaryHighlight) {
      // Collect parent nodes before removal
      const parents = new Set<Node>();
      for (const element of this.temporaryHighlight.elements) {
        if (element.parentNode) {
          parents.add(element.parentNode);
        }
      }

      removeHighlight(this.temporaryHighlight);
      this.temporaryHighlight = null;

      // Normalize affected parents after removal
      for (const parent of parents) {
        if (parent.nodeType === Node.ELEMENT_NODE) {
          try {
            (parent as Element).normalize();
          } catch (error) {
            if (import.meta.env.DEV) {
              console.warn(
                "Failed to normalize parent after removing temporary highlight:",
                error
              );
            }
          }
        }
      }
    }
  }

  private async anchorAnnotation(annotation: AnnotationHit): Promise<void> {
    if (
      !annotation._source.annotation_target?.selector ||
      annotation._source.annotation_target.selector.length === 0
    ) {
      throw new Error("No selector found for annotation");
    }

    try {
      const range = await anchor(
        this.rootElement,
        annotation._source.annotation_target.selector
      );

      const isPlaceholder = isPlaceholderRange(range);
      const highlight = isPlaceholder
        ? null
        : highlightRange(range, annotation._id);

      this.annotations.set(annotation._id, { annotation, highlight, range });

      // Mark as successfully anchored (status update handled by caller)
      this.orphanedAnnotationIds.delete(annotation._id);

      if (highlight) {
        highlight.elements.forEach((element) => {
          element.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.focusAnnotation(annotation._id);
          });
        });
      }
    } catch (error) {
      // Re-throw error - orphan status is handled by the caller (loadAnnotations)
      throw error;
    }
  }

  async scrollToAnnotation(annotationId: string): Promise<void> {
    const anchored = this.annotations.get(annotationId);
    if (!anchored) {
      return;
    }

    if (!anchored.highlight) {
      const startContainer = anchored.range.startContainer;
      const element =
        startContainer.nodeType === Node.ELEMENT_NODE
          ? (startContainer as HTMLElement)
          : startContainer.parentElement;

      if (element) {
        await scrollElementIntoView(element, { maxDuration: 500 });

        await new Promise((resolve) => setTimeout(resolve, 100));

        const reanchored = this.annotations.get(annotationId);
        if (reanchored?.highlight) {
          this.focusAnnotation(annotationId);
          const firstElement = reanchored.highlight.elements[0];
          await scrollElementIntoView(firstElement, { maxDuration: 500 });
        }
      }
      return;
    }

    if (!anchored.highlight.elements.length) {
      return;
    }

    this.focusAnnotation(annotationId);

    const firstElement = anchored.highlight.elements[0];
    await scrollElementIntoView(firstElement, { maxDuration: 500 });
  }

  getAnnotation(annotationId: string): AnnotationHit | null {
    const anchored = this.annotations.get(annotationId);
    return anchored ? anchored.annotation : null;
  }

  getAnnotations(annotationIds: string[]): AnnotationHit[] {
    const results: AnnotationHit[] = [];
    for (const id of annotationIds) {
      const annotation = this.getAnnotation(id);
      if (annotation) {
        results.push(annotation);
      }
    }
    return results;
  }

  private focusAnnotation(annotationId: string): void {
    if (this.currentFocused) {
      const previousFocused = this.annotations.get(this.currentFocused);
      if (previousFocused?.highlight) {
        setHighlightFocused(previousFocused.highlight, false);
      }
    }

    const anchored = this.annotations.get(annotationId);
    if (anchored?.highlight) {
      setHighlightFocused(anchored.highlight, true);
      this.currentFocused = annotationId;
    }
  }

  private clearAnnotations(): void {
    const parents = new Set<Node>();

    for (const { highlight } of this.annotations.values()) {
      if (highlight) {
        for (const element of highlight.elements) {
          if (element.parentNode) {
            parents.add(element.parentNode);
          }
        }
        removeHighlight(highlight);
      }
    }

    for (const parent of parents) {
      if (parent.nodeType === Node.ELEMENT_NODE) {
        (parent as Element).normalize();
      }
    }

    this.annotations.clear();
    this.currentFocused = null;
  }

  destroy(): void {
    // Clean up PDF page state management
    if (this.pageReadyUnsubscribe) {
      this.pageReadyUnsubscribe();
      this.pageReadyUnsubscribe = undefined;
    }
    if (this.pageDestroyedUnsubscribe) {
      this.pageDestroyedUnsubscribe();
      this.pageDestroyedUnsubscribe = undefined;
    }
    if (this.pdfPageStateManager) {
      destroyPDFPageStateManager();
      this.pdfPageStateManager = undefined;
    }

    if (this.highlightObserver) {
      this.highlightObserver.disconnect();
      this.highlightObserver = null;
    }
    if (this.reanchorDebounceTimer !== null) {
      clearTimeout(this.reanchorDebounceTimer);
      this.reanchorDebounceTimer = null;
    }

    if (this.statusUpdateTimer !== null) {
      clearTimeout(this.statusUpdateTimer);
      this.statusUpdateTimer = null;
    }
    this.pendingStatusUpdates.clear();

    // Clear all state
    this.pendingAnnotationIds.clear();
    this.recoveredAnnotationIds.clear();
    this.orphanedAnnotations.clear();
    this.retryAttempts.clear();

    this.removeTemporaryHighlight();
    this.clearAnnotations();
  }
}

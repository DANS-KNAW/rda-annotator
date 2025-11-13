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
import { isPDFDocument, isPlaceholderRange } from "@/utils/anchoring/pdf";

interface AnchoredAnnotation {
  annotation: AnnotationHit;
  highlight: Highlight | null;
  range: Range;
}

export class AnnotationManager {
  private annotations: Map<string, AnchoredAnnotation> = new Map();
  private currentFocused: string | null = null;
  private temporaryHighlight: Highlight | null = null;
  private onHighlightClick?: (annotationIds: string[]) => void;
  private onHighlightHover?: (annotationIds: string[]) => void;
  private rootElement: HTMLElement;
  private targetDocument: Document;
  private pdfObserver?: MutationObserver;

  constructor(options?: {
    onHighlightClick?: (annotationIds: string[]) => void;
    onHighlightHover?: (annotationIds: string[]) => void;
    rootElement?: HTMLElement;
  }) {
    this.rootElement = options?.rootElement || document.body;
    this.targetDocument = this.rootElement.ownerDocument || document;
    injectHighlightStyles(this.targetDocument);
    this.onHighlightClick = options?.onHighlightClick;
    this.onHighlightHover = options?.onHighlightHover;
    this.setupEventListeners();
    this.setupPDFObserver();
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

  private setupPDFObserver(): void {
    if (!isPDFDocument()) {
      return;
    }

    const pdfViewerApp = (window as any).PDFViewerApplication;
    if (!pdfViewerApp?.pdfViewer?.viewer) {
      return;
    }

    const debounce = (fn: () => void, delay: number) => {
      let timeoutId: number;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(fn, delay);
      };
    };

    this.pdfObserver = new MutationObserver(
      debounce(() => this.reanchorPlaceholders(), 100)
    );

    this.pdfObserver.observe(pdfViewerApp.pdfViewer.viewer, {
      attributes: true,
      attributeFilter: ["data-loaded"],
      childList: true,
      subtree: true,
    });
  }

  private async reanchorPlaceholders(): Promise<void> {
    const toReanchor: string[] = [];

    for (const [id, anchored] of this.annotations) {
      if (anchored.highlight === null) {
        toReanchor.push(id);
      } else {
        for (const el of anchored.highlight.elements) {
          if (!document.body.contains(el)) {
            toReanchor.push(id);
            break;
          }
        }
      }
    }

    if (toReanchor.length === 0) {
      return;
    }

    for (const id of toReanchor) {
      const anchored = this.annotations.get(id);
      if (anchored) {
        if (anchored.highlight) {
          removeHighlight(anchored.highlight);
        }
        this.annotations.delete(id);

        try {
          await this.anchorAnnotation(anchored.annotation);
        } catch (error) {
          console.warn(`Failed to re-anchor ${id}:`, error);
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
      console.warn("Failed to normalize root element:", error);
    }

    try {
      const url = getDocumentURL();
      const response = await searchAnnotationsByUrl(url);
      const annotations = response.hits.hits;

      for (const annotation of annotations) {
        try {
          await Promise.race([
            this.anchorAnnotation(annotation),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Anchoring timeout")), 5000)
            ),
          ]);
        } catch (error) {
          const fragment = annotation._source.fragment?.substring(0, 50);
          console.warn(
            `[Anchor] Failed to anchor annotation ${annotation._id}`,
            `Fragment: "${fragment}..."`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Failed to load annotations:", error);
    }
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
            console.warn(
              "Failed to normalize parent after removing temporary highlight:",
              error
            );
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
      return;
    }

    try {
      const range = await anchor(
        this.rootElement,
        annotation._source.annotation_target.selector
      );

      const isPlaceholder = isPlaceholderRange(range);
      const highlight = isPlaceholder ? null : highlightRange(range, annotation._id);

      this.annotations.set(annotation._id, { annotation, highlight, range });

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
      const element = startContainer.nodeType === Node.ELEMENT_NODE
        ? (startContainer as HTMLElement)
        : startContainer.parentElement;

      if (element) {
        await scrollElementIntoView(element, { maxDuration: 500 });

        await new Promise(resolve => setTimeout(resolve, 100));

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
    if (this.pdfObserver) {
      this.pdfObserver.disconnect();
      this.pdfObserver = undefined;
    }

    this.removeTemporaryHighlight();
    this.clearAnnotations();
  }
}

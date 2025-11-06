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

interface AnchoredAnnotation {
  annotation: AnnotationHit;
  highlight: Highlight;
}

export class AnnotationManager {
  private annotations: Map<string, AnchoredAnnotation> = new Map();
  private currentFocused: string | null = null;
  private temporaryHighlight: Highlight | null = null;

  constructor() {
    injectHighlightStyles();
  }

  setHighlightsVisible(visible: boolean): void {
    if (visible) {
      document.body.classList.add("rda-highlights-visible");
    } else {
      document.body.classList.remove("rda-highlights-visible");
    }
  }

  /**
   * Load and anchor all annotations for the current page.
   *
   * This method:
   * 1. Removes any temporary highlights
   * 2. Clears all existing annotations (with batched normalization)
   * 3. Normalizes the entire document body to ensure clean DOM state
   * 4. Fetches annotations from the backend
   * 5. Anchors each annotation with timeout protection
   *
   * The explicit normalization step is critical to prevent anchoring errors
   * caused by text node fragmentation from previous highlight operations.
   */
  async loadAnnotations(): Promise<void> {
    // Always remove temporary highlight before reloading to ensure clean DOM state
    this.removeTemporaryHighlight();

    // Clear all existing annotations (this normalizes affected parents)
    this.clearAnnotations();

    // Ensure the entire document body is normalized before anchoring.
    // This is critical: even after clearAnnotations() normalizes affected parents,
    // there may be fragmented text nodes elsewhere in the document from previous
    // operations. Normalizing the whole body ensures a clean, consistent DOM state
    // for accurate selector resolution.
    try {
      document.body.normalize();
    } catch (error) {
      console.warn("Failed to normalize document body:", error);
    }

    try {
      const response = await searchAnnotationsByUrl(window.location.href);
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
          // Log failures with context to help debugging
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

  /**
   * Remove the temporary highlight and normalize affected DOM nodes.
   *
   * Temporary highlights are created when the user selects text but hasn't
   * submitted the annotation yet. This method cleans up the temporary highlight
   * and normalizes the DOM to prevent text node fragmentation.
   */
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
            console.warn("Failed to normalize parent after removing temporary highlight:", error);
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
        document.body,
        annotation._source.annotation_target.selector
      );
      const highlight = highlightRange(range, annotation._id);

      this.annotations.set(annotation._id, { annotation, highlight });

      highlight.elements.forEach((element) => {
        element.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.focusAnnotation(annotation._id);
        });
      });
    } catch (error) {
      throw error;
    }
  }

  async scrollToAnnotation(annotationId: string): Promise<void> {
    const anchored = this.annotations.get(annotationId);
    if (!anchored || !anchored.highlight.elements.length) {
      return;
    }

    this.focusAnnotation(annotationId);

    const firstElement = anchored.highlight.elements[0];
    await scrollElementIntoView(firstElement, { maxDuration: 500 });
  }

  private focusAnnotation(annotationId: string): void {
    if (this.currentFocused) {
      const previousFocused = this.annotations.get(this.currentFocused);
      if (previousFocused) {
        setHighlightFocused(previousFocused.highlight, false);
      }
    }

    const anchored = this.annotations.get(annotationId);
    if (anchored) {
      setHighlightFocused(anchored.highlight, true);
      this.currentFocused = annotationId;
    }
  }

  /**
   * Clear all annotations and normalize the DOM.
   *
   * This method removes all highlight elements and then normalizes all affected
   * parent nodes in a single batch operation. This is critical for preventing
   * DOM fragmentation issues that occur when normalizing after each individual
   * highlight removal.
   */
  private clearAnnotations(): void {
    // Collect all unique parent nodes that will be affected by highlight removal
    const parents = new Set<Node>();

    for (const { highlight } of this.annotations.values()) {
      // Track parents before removing highlights
      for (const element of highlight.elements) {
        if (element.parentNode) {
          parents.add(element.parentNode);
        }
      }
      removeHighlight(highlight);
    }

    // Normalize all affected parents ONCE after all highlights are removed.
    // This prevents issues with text node fragmentation when multiple highlights
    // are removed from the same parent.
    for (const parent of parents) {
      if (parent.nodeType === Node.ELEMENT_NODE) {
        (parent as Element).normalize();
      }
    }

    this.annotations.clear();
    this.currentFocused = null;
  }

  destroy(): void {
    this.removeTemporaryHighlight();
    this.clearAnnotations();
  }
}

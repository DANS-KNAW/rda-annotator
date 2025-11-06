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

  async loadAnnotations(): Promise<void> {
    this.clearAnnotations();

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
          console.warn(`Failed to anchor annotation ${annotation._id}`);
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
      removeHighlight(this.temporaryHighlight);
      this.temporaryHighlight = null;
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

  private clearAnnotations(): void {
    for (const { highlight } of this.annotations.values()) {
      removeHighlight(highlight);
    }
    this.annotations.clear();
    this.currentFocused = null;
  }

  destroy(): void {
    this.removeTemporaryHighlight();
    this.clearAnnotations();
  }
}

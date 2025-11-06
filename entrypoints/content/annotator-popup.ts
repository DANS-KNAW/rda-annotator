import { ContentScriptContext } from "#imports";
import { EXTENSION_NAME } from "./constant";
import { AnnotationTarget } from "@/types/selector.interface";
import { describeRange } from "@/utils/anchoring/describe";
import { trimRange } from "@/utils/anchoring/trim-range";
import { sendMessage } from "@/utils/messaging";

interface AnnotatorPopupProps {
  ctx: ContentScriptContext;
  onAnnotate: () => Promise<void>;
  onCreateTemporaryHighlight?: (range: Range) => Promise<void>;
}

enum ArrowDirection {
  UP = "up",
  DOWN = "down",
}

interface PositionTarget {
  left: number;
  top: number;
  arrowDirection: ArrowDirection;
}

function isTouchDevice(): boolean {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

function nearestPositionedAncestor(el: Element): Element {
  let parentEl = el.parentElement!;
  while (parentEl.parentElement) {
    if (getComputedStyle(parentEl).position !== "static") {
      break;
    }
    parentEl = parentEl.parentElement;
  }
  return parentEl;
}

const ARROW_HEIGHT = 10;
const ARROW_H_MARGIN = 20;

export async function createAnnotatorPopup({
  ctx,
  onAnnotate,
  onCreateTemporaryHighlight,
}: AnnotatorPopupProps) {
  let currentSelection: Selection | null = null;
  let container: HTMLElement;

  const annotatorPopup = await createShadowRootUi(ctx, {
    name: `${EXTENSION_NAME}-popup`,
    position: "inline",
    anchor: "body",
    mode: "closed",

    onMount(_, shadowRoot, shadowHost) {
      console.log("[RDA Annotator] Mounted");

      container = document.createElement("div");
      container.id = "annotator-popup";
      shadowRoot.replaceChildren(container);

      const sheet = new CSSStyleSheet();
      sheet.replaceSync(`
        :host {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 2147483646;
          display: none;
          pointer-events: none;
        }

        #annotator-popup {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          padding: 4px;
          pointer-events: auto;
          position: relative;
        }

        #annotator-popup::before {
          content: '';
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-style: solid;
        }

        #annotator-popup.arrow-up::before {
          top: -${ARROW_HEIGHT}px;
          border-width: 0 ${ARROW_HEIGHT}px ${ARROW_HEIGHT}px ${ARROW_HEIGHT}px;
          border-color: transparent transparent #ddd transparent;
        }

        #annotator-popup.arrow-up::after {
          content: '';
          position: absolute;
          top: -${ARROW_HEIGHT - 1}px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0 ${ARROW_HEIGHT - 1}px ${ARROW_HEIGHT - 1}px ${
        ARROW_HEIGHT - 1
      }px;
          border-color: transparent transparent #fff transparent;
        }

        #annotator-popup.arrow-down::before {
          bottom: -${ARROW_HEIGHT}px;
          border-width: ${ARROW_HEIGHT}px ${ARROW_HEIGHT}px 0 ${ARROW_HEIGHT}px;
          border-color: #ddd transparent transparent transparent;
        }

        #annotator-popup.arrow-down::after {
          content: '';
          position: absolute;
          bottom: -${ARROW_HEIGHT - 1}px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-style: solid;
          border-width: ${ARROW_HEIGHT - 1}px ${ARROW_HEIGHT - 1}px 0 ${
        ARROW_HEIGHT - 1
      }px;
          border-color: #fff transparent transparent transparent;
        }

        button {
          background: #467d2c;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
          transition: background 0.2s;
        }

        button:hover {
          background: #2563eb;
        }

        button:active {
          background: #1d4ed8;
        }
      `);
      shadowRoot.adoptedStyleSheets = [sheet];

      const button = document.createElement("button");
      button.textContent = "Annotate text";
      button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleAnnotateClick();
      });
      container.appendChild(button);

      const handleMouseUp = () => {
        setTimeout(() => handleTextSelection(), 10);
      };

      const handleMouseDown = (e: MouseEvent) => {
        if (!shadowHost.contains(e.target as Node)) {
          const selection = window.getSelection();
          if (!selection || selection.isCollapsed) {
            hideAnnotatorPopup();
          }
        }
      };

      ctx.addEventListener(document, "mouseup", handleMouseUp);
      ctx.addEventListener(document, "mousedown", handleMouseDown);
    },

    onRemove() {
      console.log("[RDA Annotator] Removed");
      currentSelection = null;
    },
  });

  /**
   * Gets the dimensions of the popup container
   */
  const getPopupDimensions = (): { width: number; height: number } => {
    if (!container) {
      return { width: 0, height: 0 };
    }
    const rect = container.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  };

  /**
   * Detects if the text selection is right-to-left
   */
  const isRTLSelection = (selection: Selection): boolean => {
    if (selection.rangeCount === 0) return false;

    const tempRange = document.createRange();

    // Compare anchor and focus positions to determine direction
    if (selection.anchorNode && selection.focusNode) {
      tempRange.setStart(selection.anchorNode, selection.anchorOffset);
      tempRange.setEnd(selection.focusNode, selection.focusOffset);
      return tempRange.collapsed;
    }

    return false;
  };

  /**
   * Finds the optimal z-index by sampling elements underneath the popup
   */
  const findOptimalZIndex = (left: number, top: number): number => {
    if (!document.elementsFromPoint) {
      return 2147483646;
    }

    const { width, height } = getPopupDimensions();

    // Sample 5 points around the popup position
    const elements = new Set([
      ...document.elementsFromPoint(left, top),
      ...document.elementsFromPoint(left, top + height),
      ...document.elementsFromPoint(left + width / 2, top + height / 2),
      ...document.elementsFromPoint(left + width, top),
      ...document.elementsFromPoint(left + width, top + height),
    ]);

    const getZIndex = (el: Element): number => {
      const zIndex = parseInt(getComputedStyle(el).zIndex);
      return Number.isInteger(zIndex) ? zIndex : 0;
    };

    const zIndexes = Array.from(elements)
      .map(getZIndex)
      .filter((z) => Number.isInteger(z));

    let minZIndex = 0;
    // Check for any existing highlights or annotations
    for (const el of document.querySelectorAll("[data-rda-highlight]")) {
      minZIndex = Math.max(minZIndex, getZIndex(el));
    }
    zIndexes.push(minZIndex);

    return Math.max(...zIndexes, 1000) + 1;
  };

  /**
   * Calculates the optimal position for the popup based on the selection
   * Adapted from Hypothesis client positioning logic
   */
  const calculatePosition = (
    selectionRect: DOMRect,
    isRTL: boolean
  ): PositionTarget => {
    const { width: adderWidth, height: adderHeight } = getPopupDimensions();

    // Determine initial arrow direction based on selection direction and device type
    let arrowDirection: ArrowDirection;
    if (isRTL && !isTouchDevice()) {
      arrowDirection = ArrowDirection.DOWN;
    } else {
      arrowDirection = ArrowDirection.UP;
    }

    // Calculate horizontal margin, capped at selection width
    const hMargin = Math.min(ARROW_H_MARGIN, selectionRect.width);

    // Extra offset for touch devices to avoid native selection handles
    const touchScreenOffset = isTouchDevice() ? 10 : 0;

    // Position horizontally based on selection direction
    let left: number;
    if (isRTL) {
      // For RTL, position near the left edge (start) of selection
      left = selectionRect.left - adderWidth / 2 + hMargin;
    } else {
      // For LTR, position near the right edge (end) of selection
      left =
        selectionRect.left + selectionRect.width - adderWidth / 2 - hMargin;
    }

    // Check if popup would go off top or bottom of viewport and flip if needed
    if (
      selectionRect.top - adderHeight < 0 &&
      arrowDirection === ArrowDirection.DOWN
    ) {
      arrowDirection = ArrowDirection.UP;
    } else if (
      selectionRect.top + selectionRect.height + adderHeight + ARROW_HEIGHT >
      window.innerHeight
    ) {
      arrowDirection = ArrowDirection.DOWN;
    }

    // Position vertically based on arrow direction
    let top: number;
    if (arrowDirection === ArrowDirection.UP) {
      // Show below selection
      top =
        selectionRect.top +
        selectionRect.height +
        ARROW_HEIGHT +
        touchScreenOffset;
    } else {
      // Show above selection
      top = selectionRect.top - adderHeight - ARROW_HEIGHT;
    }

    // Constrain to viewport bounds
    left = Math.max(left, 0);
    left = Math.min(left, window.innerWidth - adderWidth);

    top = Math.max(top, 0);
    top = Math.min(top, window.innerHeight - adderHeight);

    return { top, left, arrowDirection };
  };

  const showAnnotatorPopup = (selectionRect: DOMRect, isRTL: boolean) => {
    if (!annotatorPopup.shadowHost || !container) return;

    const host = annotatorPopup.shadowHost as HTMLElement;

    // Make visible but keep transparent for measurement
    host.style.display = "block";
    host.style.visibility = "hidden";

    // Calculate optimal position
    const { left, top, arrowDirection } = calculatePosition(
      selectionRect,
      isRTL
    );

    // Find the nearest positioned ancestor for proper positioning
    const positionedAncestor = nearestPositionedAncestor(host);
    const parentRect = positionedAncestor.getBoundingClientRect();

    // Calculate optimal z-index
    const zIndex = findOptimalZIndex(left, top);

    // Update arrow direction class
    container.className = `arrow-${arrowDirection}`;

    // Apply final positioning
    host.style.left = `${left - parentRect.left}px`;
    host.style.top = `${top - parentRect.top}px`;
    host.style.zIndex = zIndex.toString();
    host.style.visibility = "visible";
  };

  const hideAnnotatorPopup = () => {
    if (annotatorPopup.shadowHost) {
      const host = annotatorPopup.shadowHost as HTMLElement;
      host.style.display = "none";
      host.style.left = "0px";
      host.style.top = "0px";
    }
  };

  const handleAnnotateClick = async () => {
    if (currentSelection && currentSelection.rangeCount > 0) {
      let range = currentSelection.getRangeAt(0);

      // Trim leading and trailing whitespace from the range.
      // This ensures annotations don't include accidental whitespace at boundaries,
      // which would create awkward visual highlights.
      try {
        range = trimRange(range);
      } catch (error) {
        console.warn("Failed to trim range, using original:", error);
      }

      // Validate that the range is not empty after trimming
      if (range.collapsed || range.toString().trim().length === 0) {
        console.warn("Range is empty after trimming whitespace");
        hideAnnotatorPopup();
        window.getSelection()?.removeAllRanges();
        return;
      }

      const selectors = describeRange(range, document.body);

      const target: AnnotationTarget = {
        source: window.location.href,
        selector: selectors,
      };

      const annotationData = {
        target,
        timestamp: Date.now(),
      };

      try {
        if (onCreateTemporaryHighlight) {
          await onCreateTemporaryHighlight(range);
        }
      } catch (error) {
        console.error("Failed to create temporary highlight:", error);
      }

      try {
        const response = await sendMessage("storeAnnotation", annotationData);
        if (!response.success) {
          console.error("[RDA Annotator] Failed to store annotation");
        }
      } catch (error) {
        console.error("[RDA Annotator] Failed to send annotation:", error);
      }

      await onAnnotate();

      hideAnnotatorPopup();
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();

    if (
      !selection ||
      selection.isCollapsed ||
      selection.toString().trim().length === 0
    ) {
      hideAnnotatorPopup();
      currentSelection = null;
      return;
    }

    currentSelection = selection;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const isRTL = isRTLSelection(selection);

    showAnnotatorPopup(rect, isRTL);
  };

  return annotatorPopup;
}

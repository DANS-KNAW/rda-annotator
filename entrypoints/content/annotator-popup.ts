import { ContentScriptContext } from "#imports";
import { EXTENSION_NAME } from "./constant";
import { storage } from "#imports";
import { AnnotationTarget } from "@/types/selector.interface";
import { describeRange } from "@/utils/anchoring/describe";

interface AnnotatorPopupProps {
  ctx: ContentScriptContext;
  onAnnotate: () => Promise<void>;
}

export async function createAnnotatorPopup({
  ctx,
  onAnnotate,
}: AnnotatorPopupProps) {
  let currentSelection: Selection | null = null;

  const annotatorPopup = await createShadowRootUi(ctx, {
    name: `${EXTENSION_NAME}-popup`,
    position: "inline",
    anchor: "body",
    mode: "closed",

    onMount(_, shadowRoot, shadowHost) {
      console.log("[RDA Annotator] Mounted");

      const container = document.createElement("div");
      container.id = "annotator-popup";
      shadowRoot.replaceChildren(container);

      const sheet = new CSSStyleSheet();
      sheet.replaceSync(`
        :host {
          position: fixed;
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

  const showAnnotatorPopup = (x: number, y: number) => {
    if (annotatorPopup.shadowHost) {
      const host = annotatorPopup.shadowHost as HTMLElement;
      host.style.display = "block";
      host.style.left = `${x}px`;
      host.style.top = `${y}px`;
    }
  };

  const hideAnnotatorPopup = () => {
    if (annotatorPopup.shadowHost) {
      const host = annotatorPopup.shadowHost as HTMLElement;
      host.style.display = "none";
    }
  };

  const handleAnnotateClick = async () => {
    if (currentSelection && currentSelection.rangeCount > 0) {
      const range = currentSelection.getRangeAt(0);
      const selectors = describeRange(range, document.body);

      const target: AnnotationTarget = {
        source: window.location.href,
        selector: selectors,
      };

      const annotationData = {
        target,
        timestamp: Date.now(),
      };

      sendMessage("storeAnnotation", annotationData);
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

    const x = rect.left + rect.width / 2 - 60;
    const y = rect.bottom + 8;

    showAnnotatorPopup(x, y);
  };

  return annotatorPopup;
}

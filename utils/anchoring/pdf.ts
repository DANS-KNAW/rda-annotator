import {
  PageSelector,
  TextPositionSelector,
  TextQuoteSelector,
  Selector,
} from "@/types/selector.interface";
import { matchQuote } from "./match-quote";
import { translateOffsets } from "@/utils/normalize";

// PDF.js rendering states
const RenderingStates = {
  INITIAL: 0,
  RUNNING: 1,
  PAUSED: 2,
  FINISHED: 3,
};

// Type definitions for PDF.js
interface TextLayer {
  div?: HTMLElement;
  textLayerDiv?: HTMLElement;
  renderingDone?: boolean;
}

interface PDFPageView {
  pdfPage: any;
  div: HTMLElement;
  renderingState?: number;
  textLayer?: TextLayer;
}

interface PDFViewer {
  pagesCount: number;
  getPageView(index: number): PDFPageView;
  eventBus?: {
    on(event: string, handler: () => void): void;
    off(event: string, handler: () => void): void;
  };
}

interface PageOffset {
  index: number;
  offset: number;
  text: string;
}

// Cache for page text content to avoid redundant PDF.js calls
const pageTextCache = new Map<number, string>();

// Cache for quote->position mappings within a session
const quotePositionCache = new Map<
  string,
  { pageIndex: number; anchor: { start: number; end: number } }
>();

function getPDFViewer(): PDFViewer {
  // @ts-ignore - PDFViewerApplication is a global
  return PDFViewerApplication.pdfViewer;
}

export function isPDFDocument(win: Window = window): boolean {
  return typeof (win as any).PDFViewerApplication !== "undefined";
}

async function waitForPDFViewerInitialized(win: Window = window): Promise<any> {
  const app = (win as any).PDFViewerApplication;

  if (!app) {
    throw new Error("PDFViewerApplication not found");
  }

  if (app.initializedPromise) {
    await app.initializedPromise;
    return app;
  }

  if (app.initialized) {
    return app;
  }

  // Poll for initialized flag (fallback for older versions)
  await new Promise<void>((resolve) => {
    const checkInitialized = () => {
      if (app.initialized) {
        resolve();
      } else {
        setTimeout(checkInitialized, 5);
      }
    };
    checkInitialized();
  });

  return app;
}

async function isPDFDownloaded(app: any): Promise<boolean> {
  const pdfDocument = app.pdfDocument;

  if (!pdfDocument) {
    return false;
  }

  if (pdfDocument.downloadComplete !== undefined) {
    return pdfDocument.downloadComplete;
  }

  if (pdfDocument.getDownloadInfo) {
    try {
      const downloadInfo = await pdfDocument.getDownloadInfo();
      return downloadInfo && downloadInfo.length === pdfDocument.numPages;
    } catch {
      return false;
    }
  }

  return false;
}

async function waitForPDFDocumentLoaded(win: Window = window): Promise<any> {
  const app = await waitForPDFViewerInitialized(win);

  const isDownloaded = await isPDFDownloaded(app);
  if (isDownloaded) {
    return app;
  }

  const doc = win.document;

  // Wait for document to load with timeout and periodic check
  await new Promise<void>((resolve) => {
    const eventBus = app.eventBus;
    let resolved = false;
    let checkInterval: ReturnType<typeof setInterval>;

    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      if (checkInterval) clearInterval(checkInterval);
      if (eventBus) {
        eventBus.off("documentload", onDocumentLoaded);
        eventBus.off("documentloaded", onDocumentLoaded);
      } else {
        doc.removeEventListener("documentload", onDocumentLoaded as any);
        doc.removeEventListener("documentloaded", onDocumentLoaded as any);
      }
      resolve();
    };

    const onDocumentLoaded = () => {
      cleanup();
    };

    if (eventBus) {
      // Try both event names (different PDF.js versions)
      eventBus.on("documentload", onDocumentLoaded);
      eventBus.on("documentloaded", onDocumentLoaded);
    } else {
      // Fallback to DOM events
      doc.addEventListener("documentload", onDocumentLoaded as any);
      doc.addEventListener("documentloaded", onDocumentLoaded as any);
    }

    // Also poll periodically in case we missed the event
    checkInterval = setInterval(async () => {
      const downloaded = await isPDFDownloaded(app);
      if (downloaded) {
        cleanup();
      }
    }, 500);

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!resolved) {
        if (import.meta.env.DEV) {
          console.warn("[PDF] Timeout waiting for PDF document to load");
        }
        cleanup();
      }
    }, 30000);
  });

  return app;
}

export async function waitForPDFReady(win: Window = window): Promise<boolean> {
  try {
    const isPDF = isPDFDocument(win);
    if (import.meta.env.DEV) {
      console.log(`[PDF waitForPDFReady] isPDFDocument: ${isPDF}, window:`, win === window ? 'main' : 'frame');
    }

    if (!isPDF) {
      return false;
    }

    if (import.meta.env.DEV) {
      console.log(`[PDF waitForPDFReady] Waiting for PDF document to load...`);
    }

    await waitForPDFDocumentLoaded(win);

    if (import.meta.env.DEV) {
      console.log(`[PDF waitForPDFReady] PDF document loaded successfully`);
    }

    return true;
  } catch (error) {
    console.error("[PDF] Failed to wait for PDF ready:", error);
    return false;
  }
}

async function getPageView(pageIndex: number): Promise<PDFPageView> {
  const pdfViewer = getPDFViewer();
  let pageView = pdfViewer.getPageView(pageIndex);

  // If page not loaded yet, wait for pagesloaded event
  if (!pageView || !pageView.pdfPage) {
    pageView = await new Promise<PDFPageView>((resolve) => {
      const onPagesLoaded = () => {
        if (pdfViewer.eventBus) {
          pdfViewer.eventBus.off("pagesloaded", onPagesLoaded);
        } else {
          document.removeEventListener("pagesloaded", onPagesLoaded as any);
        }
        resolve(pdfViewer.getPageView(pageIndex));
      };

      if (pdfViewer.eventBus) {
        pdfViewer.eventBus.on("pagesloaded", onPagesLoaded);
      } else {
        document.addEventListener("pagesloaded", onPagesLoaded as any);
      }
    });
  }

  return pageView;
}

function isTextLayerRenderingDone(textLayer: TextLayer): boolean {
  if (textLayer.renderingDone !== undefined) {
    return textLayer.renderingDone;
  }

  const div = textLayer.div || textLayer.textLayerDiv;
  if (!div) {
    return false;
  }

  return div.querySelector(".endOfContent") !== null;
}

function isSpace(char: string): boolean {
  switch (char.charCodeAt(0)) {
    case 0x0009:
    case 0x000a:
    case 0x000b:
    case 0x000c:
    case 0x000d:
    case 0x0020:
    case 0x00a0:
      return true;
    default:
      return false;
  }
}

const isNotSpace = (char: string) => !isSpace(char);

function stripSpaces(str: string): string {
  let stripped = "";
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (isSpace(char)) {
      continue;
    }
    stripped += char;
  }
  return stripped;
}

async function getPageTextContent(pageIndex: number): Promise<string> {
  if (pageTextCache.has(pageIndex)) {
    return pageTextCache.get(pageIndex)!;
  }

  const pageView = await getPageView(pageIndex);
  if (!pageView.pdfPage) {
    throw new Error(`Page ${pageIndex} not loaded`);
  }

  const textContent = await pageView.pdfPage.getTextContent({
    normalizeWhitespace: true,
  });

  const pageText = textContent.items.map((item: any) => item.str).join("");

  pageTextCache.set(pageIndex, pageText);

  return pageText;
}

/**
 * Calculate the cumulative text offset to the start of a specific page
 */
async function getPageOffset(pageIndex: number): Promise<number> {
  let offset = 0;

  // Sum up text length from all previous pages
  for (let i = 0; i < pageIndex; i++) {
    const pageText = await getPageTextContent(i);
    offset += pageText.length;
  }

  return offset;
}

/**
 * Find which page contains a given document-wide character offset
 */
async function findPageByOffset(offset: number): Promise<PageOffset> {
  const viewer = getPDFViewer();

  let pageStartOffset = 0;
  let pageEndOffset = 0;
  let text = "";

  for (let i = 0; i < viewer.pagesCount; i++) {
    text = await getPageTextContent(i);
    pageStartOffset = pageEndOffset;
    pageEndOffset += text.length;

    if (pageEndOffset >= offset) {
      return { index: i, offset: pageStartOffset, text };
    }
  }

  // If offset is beyond document end, return last page
  return { index: viewer.pagesCount - 1, offset: pageStartOffset, text };
}

function getPageIndexForNode(node: Node): number {
  let element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;

  while (element) {
    if (element.classList.contains("page")) {
      const pageAttr = element.getAttribute("data-page-number");
      if (pageAttr) {
        // data-page-number is 1-based, convert to 0-based index
        return parseInt(pageAttr, 10) - 1;
      }
    }
    element = element.parentElement;
  }

  throw new Error("Could not find page index for node");
}

function getTextLayerForRange(range: Range): [Range, HTMLElement] {
  let element =
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as Element)
      : range.startContainer.parentElement;

  while (element) {
    if (element.classList && element.classList.contains("textLayer")) {
      return [range, element as HTMLElement];
    }
    element = element.parentElement;
  }

  throw new Error("Range is not within a PDF text layer");
}

function getPositionInTextLayer(
  container: Node,
  offset: number,
  textLayer: HTMLElement
): number {
  let position = 0;
  const nodeIterator = document.createNodeIterator(
    textLayer,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentNode: Node | null;
  while ((currentNode = nodeIterator.nextNode())) {
    if (currentNode === container) {
      return position + offset;
    }
    position += currentNode.textContent?.length || 0;
  }

  return position;
}

function createPlaceholder(container: HTMLElement): HTMLElement {
  const placeholder = document.createElement("rda-placeholder");
  placeholder.style.display = "none";
  placeholder.setAttribute("data-placeholder", "true");
  container.appendChild(placeholder);
  return placeholder;
}

export function isPlaceholderRange(range: Range): boolean {
  // Check if range is wrapping a placeholder element
  // When we create placeholder: setStartBefore(placeholder), setEndAfter(placeholder)
  // This means startContainer and endContainer are the parent (page.div)
  // and we need to check the child element at the offset positions

  const { startContainer, startOffset, endContainer, endOffset } = range;

  // If containers are not the same, it's not a simple placeholder range
  if (startContainer !== endContainer) {
    return false;
  }

  // If container is not an element node, can't have placeholder child
  if (startContainer.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }

  const container = startContainer as Element;
  const children = Array.from(container.childNodes);

  // Check if there's exactly one node between start and end offsets
  if (endOffset - startOffset !== 1) {
    return false;
  }

  const child = children[startOffset];

  // Check if that child is a placeholder element
  return child?.nodeType === Node.ELEMENT_NODE &&
         (child as Element).hasAttribute("data-placeholder");
}

export function createPageSelector(
  pageIndex: number,
  pageLabel?: string
): PageSelector {
  return {
    type: "PageSelector",
    index: pageIndex,
    label: pageLabel,
  };
}

export async function describePDFRange(range: Range): Promise<Selector[]> {
  const selectors: Selector[] = [];

  try {
    // Get the text layer containing this range
    const [textRange, textLayer] = getTextLayerForRange(range);

    // Get the page index
    const pageIndex = getPageIndexForNode(textLayer);

    // Calculate position within the text layer
    const startPosInLayer = getPositionInTextLayer(
      textRange.startContainer,
      textRange.startOffset,
      textLayer
    );
    const endPosInLayer = getPositionInTextLayer(
      textRange.endContainer,
      textRange.endOffset,
      textLayer
    );

    const pageOffset = await getPageOffset(pageIndex);

    // Create TextPositionSelector with document-wide offsets
    const positionSelector: TextPositionSelector = {
      type: "TextPositionSelector",
      start: pageOffset + startPosInLayer,
      end: pageOffset + endPosInLayer,
    };
    selectors.push(positionSelector);

    // Create TextQuoteSelector using the text layer as root
    const exact = textRange.toString();
    if (exact && exact.trim().length > 0) {
      // Get surrounding context from the text layer
      const textLayerContent = textLayer.textContent || "";
      const prefixStart = Math.max(0, startPosInLayer - 32);
      const prefix = textLayerContent.substring(prefixStart, startPosInLayer);
      const suffixEnd = Math.min(textLayerContent.length, endPosInLayer + 32);
      const suffix = textLayerContent.substring(endPosInLayer, suffixEnd);

      const quoteSelector: TextQuoteSelector = {
        type: "TextQuoteSelector",
        exact,
        prefix: prefix.length > 0 ? prefix : undefined,
        suffix: suffix.length > 0 ? suffix : undefined,
      };
      selectors.push(quoteSelector);
    }

    // Create PageSelector
    const pageView = await getPageView(pageIndex);
    const pageLabel =
      pageView.div.getAttribute("data-page-number") || undefined;
    const pageSelector = createPageSelector(pageIndex, pageLabel);
    selectors.push(pageSelector);
  } catch (error) {
    console.error("Failed to describe PDF range:", error);
  }

  return selectors;
}

async function anchorByPosition(
  pageIndex: number,
  start: number,
  end: number
): Promise<Range> {
  const [page, pageText] = await Promise.all([
    getPageView(pageIndex),
    getPageTextContent(pageIndex),
  ]);

  if (import.meta.env.DEV) {
    console.log(`[PDF anchorByPosition] Page ${pageIndex}:`, {
      renderingState: page.renderingState,
      hasTextLayer: !!page.textLayer,
      textLayerRenderingDone: page.textLayer ? isTextLayerRenderingDone(page.textLayer) : false,
      pageTextLength: pageText.length,
      start,
      end,
    });
  }

  if (
    page.renderingState === RenderingStates.FINISHED &&
    page.textLayer &&
    isTextLayerRenderingDone(page.textLayer)
  ) {
    const textLayerDiv = page.textLayer.div || page.textLayer.textLayerDiv;
    if (!textLayerDiv) {
      if (import.meta.env.DEV) {
        console.warn(`[PDF anchorByPosition] Text layer div not found for page ${pageIndex}`);
      }
      throw new Error("Text layer div not found");
    }

    const textLayerStr = textLayerDiv.textContent!;

    if (import.meta.env.DEV) {
      console.log(`[PDF anchorByPosition] Text layer for page ${pageIndex}:`, {
        textLayerLength: textLayerStr.length,
        pageTextLength: pageText.length,
        ratio: textLayerStr.length / pageText.length,
      });
    }

    if (textLayerStr.length === 0 || textLayerStr.length < pageText.length * 0.5) {
      if (import.meta.env.DEV) {
        console.log(`[PDF anchorByPosition] Text layer too short, creating placeholder for page ${pageIndex}`);
      }
      const placeholder = createPlaceholder(page.div);
      const range = document.createRange();
      range.setStartBefore(placeholder);
      range.setEndAfter(placeholder);
      return range;
    }

    const [textLayerStart, textLayerEnd] = translateOffsets(
      pageText,
      textLayerStr,
      start,
      end,
      isNotSpace,
      { normalize: true }
    );

    const textLayerQuote = stripSpaces(
      textLayerStr.slice(textLayerStart, textLayerEnd)
    );
    const pageTextQuote = stripSpaces(pageText.slice(start, end));

    if (textLayerQuote.normalize("NFKD") !== pageTextQuote.normalize("NFKD")) {
      if (import.meta.env.DEV) {
        console.warn("[PDF Anchor] Text layer mismatch detected");
      }
    }

    const range = document.createRange();

    let currentOffset = 0;
    const nodeIterator = document.createNodeIterator(
      textLayerDiv,
      NodeFilter.SHOW_TEXT,
      null
    );

    let startNode: Node | null = null;
    let startOffset = 0;
    let endNode: Node | null = null;
    let endOffset = 0;

    let node: Node | null;
    while ((node = nodeIterator.nextNode())) {
      const nodeLength = node.textContent?.length || 0;

      if (!startNode && currentOffset + nodeLength >= textLayerStart) {
        startNode = node;
        startOffset = textLayerStart - currentOffset;
      }

      if (currentOffset + nodeLength >= textLayerEnd) {
        endNode = node;
        endOffset = textLayerEnd - currentOffset;
        break;
      }

      currentOffset += nodeLength;
    }

    if (!startNode || !endNode) {
      throw new Error("Could not resolve text position to DOM nodes");
    }

    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);

    if (import.meta.env.DEV) {
      console.log(`[PDF anchorByPosition] Successfully anchored on page ${pageIndex}:`, {
        rangeText: range.toString().substring(0, 50),
      });
    }

    return range;
  }

  if (import.meta.env.DEV) {
    console.log(`[PDF anchorByPosition] Text layer not ready, creating placeholder for page ${pageIndex}:`, {
      renderingState: page.renderingState,
      hasTextLayer: !!page.textLayer,
      textLayerRenderingDone: page.textLayer ? isTextLayerRenderingDone(page.textLayer) : false,
    });
  }

  const placeholder = createPlaceholder(page.div);
  const range = document.createRange();
  range.setStartBefore(placeholder);
  range.setEndAfter(placeholder);
  return range;
}

async function anchorQuote(
  quote: TextQuoteSelector,
  positionHint?: number
): Promise<Range> {
  const viewer = getPDFViewer();

  let expectedPageIndex: number | undefined;
  let expectedOffsetInPage: number | undefined;

  if (positionHint !== undefined) {
    try {
      const { index, offset } = await findPageByOffset(positionHint);
      expectedPageIndex = index;
      expectedOffsetInPage = positionHint - offset;
    } catch {}
  }

  const strippedPrefix = quote.prefix ? stripSpaces(quote.prefix) : undefined;
  const strippedSuffix = quote.suffix ? stripSpaces(quote.suffix) : undefined;
  const strippedQuote = stripSpaces(quote.exact);

  let bestMatch:
    | { page: number; match: { start: number; end: number; score: number } }
    | undefined;

  const pageIndexes = Array.from({ length: viewer.pagesCount }, (_, i) => i);

  for (const pageIndex of pageIndexes) {
    const pageText = await getPageTextContent(pageIndex);
    const strippedText = stripSpaces(pageText);

    let strippedHint: number | undefined;
    if (expectedPageIndex !== undefined && expectedOffsetInPage !== undefined) {
      if (pageIndex < expectedPageIndex) {
        strippedHint = strippedText.length;
      } else if (pageIndex === expectedPageIndex) {
        [strippedHint] = translateOffsets(
          pageText,
          strippedText,
          expectedOffsetInPage,
          expectedOffsetInPage,
          isNotSpace,
          { normalize: false }
        );
      } else {
        strippedHint = 0;
      }
    }

    const match = matchQuote(
      strippedText,
      strippedQuote,
      strippedPrefix,
      strippedSuffix,
      strippedHint
    );

    if (!match) {
      continue;
    }

    if (!bestMatch || match.score > bestMatch.match.score) {
      const [start, end] = translateOffsets(
        strippedText,
        pageText,
        match.start,
        match.end,
        isNotSpace
      );
      bestMatch = {
        page: pageIndex,
        match: { start, end, score: match.score },
      };

      if (match.score === 1.0) {
        break;
      }
    }
  }

  if (!bestMatch) {
    throw new Error(
      `Quote not found in PDF: "${quote.exact.substring(0, 50)}..."`
    );
  }

  return anchorByPosition(
    bestMatch.page,
    bestMatch.match.start,
    bestMatch.match.end
  );
}

function quotePositionCacheKey(quote: string, position: number): string {
  return `${quote}:${position}`;
}

export async function anchorPDF(selectors: Selector[]): Promise<Range> {
  const quote = selectors.find((s) => s.type === "TextQuoteSelector") as
    | TextQuoteSelector
    | undefined;

  if (!quote) {
    throw new Error("No quote selector found");
  }

  const position = selectors.find((s) => s.type === "TextPositionSelector") as
    | TextPositionSelector
    | undefined;

  if (position) {
    try {
      const { index, offset, text } = await findPageByOffset(position.start);
      const start = position.start - offset;
      const end = position.end - offset;

      const matchedText = text.substring(start, end);
      if (quote.exact !== matchedText) {
        throw new Error("quote mismatch");
      }

      const range = await anchorByPosition(index, start, end);
      return range;
    } catch (error) {
      // Fall back to quote selector
    }

    // Check cache for previous quote match
    try {
      const cacheKey = quotePositionCacheKey(quote.exact, position.start);
      const cachedPos = quotePositionCache.get(cacheKey);
      if (cachedPos) {
        const { pageIndex, anchor } = cachedPos;
        const range = await anchorByPosition(
          pageIndex,
          anchor.start,
          anchor.end
        );
        return range;
      }
    } catch {
      // Fall back to full quote search
    }
  }

  // Fall back to quote matching
  return anchorQuote(quote, position?.start);
}

/**
 * Clear caches (useful when PDF document changes)
 */
export function clearPDFCaches(): void {
  pageTextCache.clear();
  quotePositionCache.clear();
}

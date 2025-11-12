import {
  TextQuoteSelector,
  TextPositionSelector,
  RangeSelector,
  Selector,
} from "@/types/selector.interface";
import { getTextPosition, getTextContext } from "./text-range";
import { getXPathForNode } from "./xpath";
import { isPDFDocument, describePDFRange } from "./pdf";

/**
 * Creates a TextQuoteSelector from a Range
 * This is the most robust selector type as it uses the actual text content
 */
export function createTextQuoteSelector(
  range: Range,
  root: Node = document.body
): TextQuoteSelector | null {
  try {
    const exact = range.toString();

    if (!exact || exact.trim().length === 0) {
      return null;
    }

    // Get character positions for context calculation
    const start = getTextPosition(
      range.startContainer,
      range.startOffset,
      root
    );
    const end = getTextPosition(range.endContainer, range.endOffset, root);

    // Get surrounding context (32 characters before and after)
    const { prefix, suffix } = getTextContext(root, start, end, 32);

    return {
      type: "TextQuoteSelector",
      exact,
      prefix: prefix.length > 0 ? prefix : undefined,
      suffix: suffix.length > 0 ? suffix : undefined,
    };
  } catch (error) {
    console.error("Failed to create TextQuoteSelector:", error);
    return null;
  }
}

/**
 * Creates a TextPositionSelector from a Range
 * Fast and precise, but fragile to document changes
 */
export function createTextPositionSelector(
  range: Range,
  root: Node = document.body
): TextPositionSelector | null {
  try {
    const start = getTextPosition(
      range.startContainer,
      range.startOffset,
      root
    );
    const end = getTextPosition(range.endContainer, range.endOffset, root);

    if (start === end) {
      return null;
    }

    return {
      type: "TextPositionSelector",
      start,
      end,
    };
  } catch (error) {
    console.error("Failed to create TextPositionSelector:", error);
    return null;
  }
}

/**
 * Creates a RangeSelector from a Range using XPath
 * More resilient than position selectors but still structural
 */
export function createRangeSelector(
  range: Range,
  root: Node = document.body
): RangeSelector | null {
  try {
    const startContainer = getXPathForNode(range.startContainer, root);
    const endContainer = getXPathForNode(range.endContainer, root);

    if (!startContainer || !endContainer) {
      return null;
    }

    return {
      type: "RangeSelector",
      startContainer,
      startOffset: range.startOffset,
      endContainer,
      endOffset: range.endOffset,
    };
  } catch (error) {
    console.error("Failed to create RangeSelector:", error);
    return null;
  }
}

/**
 * Describes a Range by creating multiple selector types
 * This provides redundancy and robustness - if one selector fails to anchor,
 * others can be tried as fallbacks
 *
 * @param range The DOM Range to describe
 * @param root The root element (usually document.body)
 * @returns An array of selectors describing the range
 */
export async function describeRange(
  range: Range,
  root: Node = document.body
): Promise<Selector[]> {
  if (isPDFDocument()) {
    return await describePDFRange(range);
  }

  const selectors: Selector[] = [];

  // TextQuoteSelector - most robust, try first
  const textQuote = createTextQuoteSelector(range, root);
  if (textQuote) {
    selectors.push(textQuote);
  }

  // TextPositionSelector - fast and precise when document unchanged
  const textPosition = createTextPositionSelector(range, root);
  if (textPosition) {
    selectors.push(textPosition);
  }

  // RangeSelector - XPath-based fallback
  const rangeSelector = createRangeSelector(range, root);
  if (rangeSelector) {
    selectors.push(rangeSelector);
  }

  return selectors;
}

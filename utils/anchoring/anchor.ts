import { Selector, TextQuoteSelector } from "@/types/selector.interface";
import { anchorByRange } from "./range";
import { anchorByTextPosition } from "./text-position";
import { anchorByTextQuote } from "./text-quote";

/**
 * Anchor selectors to a range in the document.
 *
 * This implementation is based on Hypothesis's robust anchoring system.
 * Key improvement: We validate that any range resolved by RangeSelector or
 * TextPositionSelector actually contains the expected text (from TextQuoteSelector).
 * This prevents returning incorrect ranges when the DOM structure has changed.
 *
 * @param root - Root element to search within
 * @param selectors - Array of selectors describing the annotation
 * @returns Range representing the anchored annotation
 */
export async function anchor(
  root: Element,
  selectors: Selector[]
): Promise<Range> {
  // Extract all selector types
  const rangeSelector = selectors.find(
    (s) => s.type === "RangeSelector"
  ) as any;
  const textPositionSelector = selectors.find(
    (s) => s.type === "TextPositionSelector"
  ) as any;
  const textQuoteSelector = selectors.find(
    (s) => s.type === "TextQuoteSelector"
  ) as TextQuoteSelector | undefined;

  // Assert that a range's text matches the quote, if we have one.
  const assertQuoteMatches = (range: Range): Range => {
    if (textQuoteSelector?.exact) {
      const rangeText = range.toString();
      if (rangeText !== textQuoteSelector.exact) {
        throw new Error(
          `Quote mismatch: expected "${textQuoteSelector.exact.substring(
            0,
            50
          )}...", ` + `got "${rangeText.substring(0, 50)}..."`
        );
      }
    }
    return range;
  };

  // Try selectors in order: RangeSelector -> TextPositionSelector -> TextQuoteSelector
  // Each one validates against the quote if available.

  // Try 1: RangeSelector (XPath-based)
  if (rangeSelector) {
    try {
      const range = anchorByRange(root, rangeSelector);
      return assertQuoteMatches(range);
    } catch (error) {
      // Failed - try next selector
      if (error instanceof Error && error.message.includes("Quote mismatch")) {
        console.warn(
          "[Anchor] RangeSelector succeeded but quote mismatch:",
          error.message
        );
      }
    }
  }

  // Try 2: TextPositionSelector (character offset-based)
  if (textPositionSelector) {
    try {
      const range = anchorByTextPosition(root, textPositionSelector);
      return assertQuoteMatches(range);
    } catch (error) {
      // Failed - try next selector
      if (error instanceof Error && error.message.includes("Quote mismatch")) {
        console.warn(
          "[Anchor] TextPositionSelector succeeded but quote mismatch:",
          error.message
        );
      }
    }
  }

  // Try 3: TextQuoteSelector (text + context matching - most robust)
  if (textQuoteSelector) {
    try {
      // Use position hint from TextPositionSelector if available
      const positionHint = textPositionSelector?.start;
      const range = anchorByTextQuote(root, textQuoteSelector, positionHint);
      // No need to assert quote here - anchorByTextQuote already found the exact text
      return range;
    } catch (error) {
      // TextQuoteSelector also failed
    }
  }

  throw new Error("Failed to anchor annotation with any selector");
}

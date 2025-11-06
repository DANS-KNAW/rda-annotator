import { Selector } from "@/types/selector.interface";
import { anchorByRange } from "./range";
import { anchorByTextPosition } from "./text-position";
import { anchorByTextQuote } from "./text-quote";

export async function anchor(
  root: Element,
  selectors: Selector[]
): Promise<Range> {
  let positionHint: number | undefined;

  const rangeSelector = selectors.find(s => s.type === "RangeSelector") as any;
  const textPositionSelector = selectors.find(s => s.type === "TextPositionSelector") as any;
  const textQuoteSelector = selectors.find(s => s.type === "TextQuoteSelector") as any;

  const orderedSelectors = [
    rangeSelector,
    textPositionSelector,
    textQuoteSelector
  ].filter(Boolean);

  for (const selector of orderedSelectors) {
    try {
      let range: Range;

      switch (selector.type) {
        case "RangeSelector":
          range = anchorByRange(root, selector);
          break;
        case "TextPositionSelector":
          range = anchorByTextPosition(root, selector);
          positionHint = selector.start;
          break;
        case "TextQuoteSelector":
          range = anchorByTextQuote(root, selector, positionHint);
          break;
        default:
          continue;
      }

      return range;
    } catch (error) {
      continue;
    }
  }

  throw new Error("Failed to anchor annotation");
}

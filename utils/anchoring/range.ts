import { RangeSelector } from "@/types/selector.interface";
import { resolveXPath } from "./xpath";

export function anchorByRange(
  root: Element,
  selector: RangeSelector
): Range {
  const startNode = resolveXPath(selector.startContainer, root);
  const endNode = resolveXPath(selector.endContainer, root);

  if (!startNode || !endNode) {
    throw new Error("Range selector nodes not found");
  }

  const range = document.createRange();
  range.setStart(startNode, selector.startOffset);
  range.setEnd(endNode, selector.endOffset);

  return range;
}

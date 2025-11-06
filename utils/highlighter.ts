export interface Highlight {
  elements: HTMLElement[];
  annotationId: string;
}

function isNodeInRange(range: Range, node: Node): boolean {
  try {
    const nodeRange = node.ownerDocument!.createRange();
    nodeRange.selectNodeContents(node);
    return (
      range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0 &&
      range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0
    );
  } catch {
    return false;
  }
}

function wholeTextNodesInRange(range: Range): Text[] {
  if (range.collapsed) {
    return [];
  }

  let root = range.commonAncestorContainer as Node | null;
  if (root && root.nodeType !== Node.ELEMENT_NODE) {
    root = root.parentElement;
  }
  if (!root) {
    return [];
  }

  const textNodes: Text[] = [];
  const nodeIter = root.ownerDocument!.createNodeIterator(
    root,
    NodeFilter.SHOW_TEXT
  );

  let node: Node | null;
  while ((node = nodeIter.nextNode())) {
    if (!isNodeInRange(range, node)) {
      continue;
    }

    const text = node as Text;

    if (text === range.startContainer && range.startOffset > 0) {
      text.splitText(range.startOffset);
      continue;
    }

    if (text === range.endContainer && range.endOffset < text.data.length) {
      text.splitText(range.endOffset);
    }

    textNodes.push(text);
  }

  return textNodes;
}

export function highlightRange(range: Range, annotationId: string): Highlight {
  const textNodes = wholeTextNodesInRange(range);
  const elements: HTMLElement[] = [];

  for (const textNode of textNodes) {
    const highlight = document.createElement("rda-highlight");
    highlight.className = "rda-highlight";
    highlight.setAttribute("data-annotation-id", annotationId);

    const parent = textNode.parentNode;
    if (parent) {
      parent.replaceChild(highlight, textNode);
      highlight.appendChild(textNode);
      elements.push(highlight);
    }
  }

  return { elements, annotationId };
}

export function removeHighlight(highlight: Highlight): void {
  for (const element of highlight.elements) {
    const parent = element.parentNode;
    if (parent) {
      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      parent.removeChild(element);
      parent.normalize();
    }
  }
}

export function setHighlightFocused(
  highlight: Highlight,
  focused: boolean
): void {
  for (const element of highlight.elements) {
    if (focused) {
      element.classList.add("rda-highlight-focused");
    } else {
      element.classList.remove("rda-highlight-focused");
    }
  }
}

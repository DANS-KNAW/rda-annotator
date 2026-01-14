enum TrimDirection {
  Forwards = 'forwards',
  Backwards = 'backwards',
}

/**
 * Find the first non-whitespace character in a string.
 *
 * @param str - String to search
 * @param fromEnd - If true, search from end backwards
 * @return Offset of first non-whitespace char, or -1 if not found
 */
function closestNonSpaceInString(str: string, fromEnd: boolean): number {
  const regex = /\S/g

  if (fromEnd) {
    // Search from end backwards
    let match
    let lastIndex = -1
    while ((match = regex.exec(str)) !== null) {
      lastIndex = match.index
    }
    return lastIndex
  }
  else {
    // Search from start forwards
    const match = regex.exec(str)
    return match ? match.index : -1
  }
}

/**
 * Find the nearest non-whitespace position in a range.
 *
 * @param range - Range to search within
 * @param direction - Direction to search (forwards or backwards)
 * @return [node, offset] of nearest non-whitespace, or null
 */
function closestNonSpaceInRange(
  range: Range,
  direction: TrimDirection,
): [Node, number] | null {
  const root = range.commonAncestorContainer
  const nodeIter = root.ownerDocument!.createNodeIterator(
    root,
    NodeFilter.SHOW_TEXT,
  )

  let node: Node | null
  const textNodes: Text[] = []

  // Collect all text nodes in range
  while ((node = nodeIter.nextNode())) {
    const text = node as Text
    if (
      range.comparePoint(text, 0) <= 0
      && range.comparePoint(text, text.length) >= 0
    ) {
      textNodes.push(text)
    }
  }

  if (textNodes.length === 0) {
    return null
  }

  // Search in appropriate direction
  if (direction === TrimDirection.Forwards) {
    for (const textNode of textNodes) {
      const offset = closestNonSpaceInString(textNode.data, false)
      if (offset !== -1) {
        return [textNode, offset]
      }
    }
  }
  else {
    // Search backwards
    for (let i = textNodes.length - 1; i >= 0; i--) {
      const textNode = textNodes[i]
      const offset = closestNonSpaceInString(textNode.data, true)
      if (offset !== -1) {
        return [textNode, offset]
      }
    }
  }

  return null
}

/**
 * Trim whitespace from the boundaries of a range.
 *
 * Returns a new range with the same content as `range` but with leading
 * and trailing whitespace removed.
 *
 * @param range - Range to trim
 * @return Trimmed range
 */
export function trimRange(range: Range): Range {
  if (range.collapsed) {
    return range.cloneRange()
  }

  const trimmedRange = range.cloneRange()

  // Try to trim start within the start container first
  if (
    range.startContainer.nodeType === Node.TEXT_NODE
    && range.startOffset < (range.startContainer as Text).length
  ) {
    const text = (range.startContainer as Text).data.substring(
      range.startOffset,
    )
    const offset = closestNonSpaceInString(text, false)
    if (offset !== -1) {
      trimmedRange.setStart(range.startContainer, range.startOffset + offset)
    }
  }

  // If still at whitespace, search across nodes
  if (
    trimmedRange.startContainer.nodeType === Node.TEXT_NODE
    && trimmedRange.startOffset < (trimmedRange.startContainer as Text).length
  ) {
    const startChar = (trimmedRange.startContainer as Text).data[
      trimmedRange.startOffset
    ]
    if (/\s/.test(startChar)) {
      const newStart = closestNonSpaceInRange(
        trimmedRange,
        TrimDirection.Forwards,
      )
      if (newStart) {
        trimmedRange.setStart(newStart[0], newStart[1])
      }
    }
  }

  // Try to trim end within the end container first
  if (range.endContainer.nodeType === Node.TEXT_NODE && range.endOffset > 0) {
    const text = (range.endContainer as Text).data.substring(
      0,
      range.endOffset,
    )
    const offset = closestNonSpaceInString(text, true)
    if (offset !== -1) {
      trimmedRange.setEnd(range.endContainer, offset + 1)
    }
  }

  // If still at whitespace, search across nodes
  if (
    trimmedRange.endContainer.nodeType === Node.TEXT_NODE
    && trimmedRange.endOffset > 0
  ) {
    const endChar = (trimmedRange.endContainer as Text).data[
      trimmedRange.endOffset - 1
    ]
    if (/\s/.test(endChar)) {
      const newEnd = closestNonSpaceInRange(
        trimmedRange,
        TrimDirection.Backwards,
      )
      if (newEnd) {
        trimmedRange.setEnd(newEnd[0], newEnd[1] + 1)
      }
    }
  }

  return trimmedRange
}

/**
 * Calculates the character offset of a DOM position (node + offset)
 * relative to the start of the document body's text content
 */
export function getTextPosition(
  node: Node,
  offset: number,
  root: Node = document.body,
): number {
  let position = 0
  const nodeIterator = document.createNodeIterator(
    root,
    NodeFilter.SHOW_TEXT,
    null,
  )

  let currentNode: Node | null
  while ((currentNode = nodeIterator.nextNode())) {
    if (currentNode === node) {
      return position + offset
    }
    position += currentNode.textContent?.length || 0
  }

  return position
}

/**
 * Resolves a character offset back to a DOM position (node + offset)
 * @param root The root element to search within
 * @param offset The character offset from the start of root's text content
 * @returns A tuple of [node, offset] representing the DOM position
 */
export function resolveTextPosition(
  root: Node,
  offset: number,
): [Node, number] | null {
  let currentOffset = 0
  const nodeIterator = document.createNodeIterator(
    root,
    NodeFilter.SHOW_TEXT,
    null,
  )

  let node: Node | null
  while ((node = nodeIterator.nextNode())) {
    const nodeLength = node.textContent?.length || 0

    if (currentOffset + nodeLength >= offset) {
      return [node, offset - currentOffset]
    }

    currentOffset += nodeLength
  }

  return null
}

/**
 * Get surrounding text context for a range
 * @param root The root element containing the text
 * @param start Start character offset
 * @param end End character offset
 * @param contextLength Number of characters to include in prefix/suffix
 */
export function getTextContext(
  root: Node,
  start: number,
  end: number,
  contextLength: number = 32,
): { prefix: string, suffix: string } {
  const fullText = root.textContent || ''

  const prefixStart = Math.max(0, start - contextLength)
  const prefix = fullText.substring(prefixStart, start)

  const suffixEnd = Math.min(fullText.length, end + contextLength)
  const suffix = fullText.substring(end, suffixEnd)

  return { prefix, suffix }
}

/**
 * Get all highlight elements at a given point on the page.
 *
 * @param x - Client X coordinate
 * @param y - Client Y coordinate
 * @param targetDocument - Document to query (defaults to document)
 * @returns Array of annotation IDs at the point
 */
export function getAnnotationIdsAtPoint(
  x: number,
  y: number,
  targetDocument: Document = document,
): string[] {
  // Get all elements at the given coordinates
  const elements = targetDocument.elementsFromPoint(x, y)

  // Filter to only rda-highlight elements and extract their annotation IDs
  const annotationIds: string[] = []
  const seenIds = new Set<string>()

  for (const el of elements) {
    if (el.tagName.toLowerCase() === 'rda-highlight') {
      const annotationId = el.getAttribute('data-annotation-id')
      if (annotationId && !seenIds.has(annotationId)) {
        annotationIds.push(annotationId)
        seenIds.add(annotationId)
      }
    }
  }

  return annotationIds
}

/**
 * Get all rda-highlight elements at a given point.
 *
 * @param x - Client X coordinate
 * @param y - Client Y coordinate
 * @param targetDocument - Document to query (defaults to document)
 * @returns Array of highlight HTML elements
 */
export function getHighlightElementsAtPoint(
  x: number,
  y: number,
  targetDocument: Document = document,
): HTMLElement[] {
  const elements = targetDocument.elementsFromPoint(x, y)
  return elements.filter(
    el => el.tagName.toLowerCase() === 'rda-highlight',
  ) as HTMLElement[]
}

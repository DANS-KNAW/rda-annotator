/**
 * Generates an XPath expression that uniquely identifies a node in the document
 * @param node The node to generate an XPath for
 * @param root The root element (usually document.body)
 * @returns An XPath expression as a string
 */
export function getXPathForNode(
  node: Node,
  root: Node = document.body,
): string {
  const steps: string[] = []
  let currentNode: Node | null = node

  while (currentNode && currentNode !== root) {
    let step = ''
    const parent: Node | null = currentNode.parentNode

    if (!parent) {
      break
    }

    if (currentNode.nodeType === Node.ELEMENT_NODE) {
      const element = currentNode as Element
      const tagName = element.tagName.toLowerCase()

      // Find the position of this element among siblings with the same tag name
      let index = 1
      let sibling = element.previousSibling

      while (sibling) {
        if (
          sibling.nodeType === Node.ELEMENT_NODE
          && (sibling as Element).tagName === element.tagName
        ) {
          index++
        }
        sibling = sibling.previousSibling
      }

      step = `${tagName}[${index}]`
    }
    else if (currentNode.nodeType === Node.TEXT_NODE) {
      // Find the position of this text node among siblings
      let index = 1
      let sibling = currentNode.previousSibling

      while (sibling) {
        if (sibling.nodeType === Node.TEXT_NODE) {
          index++
        }
        sibling = sibling.previousSibling
      }

      step = `text()[${index}]`
    }

    steps.unshift(step)
    currentNode = parent
  }

  return `/${steps.join('/')}`
}

/**
 * Resolves an XPath expression to a node in the document
 * @param xpath The XPath expression
 * @param root The root element to search within
 * @returns The resolved node or null if not found
 */
export function resolveXPath(
  xpath: string,
  root: Node = document.body,
): Node | null {
  try {
    const result = document.evaluate(
      xpath,
      root,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    )
    return result.singleNodeValue
  }
  catch (error) {
    console.error('Failed to resolve XPath:', xpath, error)
    return null
  }
}

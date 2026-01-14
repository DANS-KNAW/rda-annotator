import type { TextQuoteSelector } from '@/types/selector.interface'
import { matchQuote } from './match-quote'
import { resolveTextPosition } from './text-range'

export function anchorByTextQuote(
  root: Element,
  selector: TextQuoteSelector,
  hint?: number,
): Range {
  const text = root.textContent || ''

  const match = matchQuote(
    text,
    selector.exact,
    selector.prefix,
    selector.suffix,
    hint,
  )

  if (!match) {
    throw new Error('Quote not found in document')
  }

  const range = document.createRange()
  const startPos = resolveTextPosition(root, match.start)
  const endPos = resolveTextPosition(root, match.end)

  if (!startPos || !endPos) {
    throw new Error('Could not resolve quote to DOM range')
  }

  range.setStart(startPos[0], startPos[1])
  range.setEnd(endPos[0], endPos[1])

  return range
}

import type { TextPositionSelector } from '@/types/selector.interface'
import { resolveTextPosition } from './text-range'

export function anchorByTextPosition(
  root: Element,
  selector: TextPositionSelector,
): Range {
  const range = document.createRange()

  const startPos = resolveTextPosition(root, selector.start)
  const endPos = resolveTextPosition(root, selector.end)

  if (!startPos || !endPos) {
    throw new Error('Text position out of range')
  }

  range.setStart(startPos[0], startPos[1])
  range.setEnd(endPos[0], endPos[1])

  return range
}

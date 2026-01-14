function advance(
  str: string,
  count: number,
  filter: (char: string) => boolean,
  startPos = 0,
): number {
  let pos = startPos
  while (pos < str.length && count > 0) {
    if (filter(str[pos])) {
      --count
    }
    ++pos
  }
  return pos
}

function countChars(
  str: string,
  filter: (char: string) => boolean,
  startPos: number,
  endPos: number,
): number {
  let count = 0
  for (let pos = startPos; pos < endPos; pos++) {
    if (filter(str[pos])) {
      ++count
    }
  }
  return count
}

interface NormalizeResult {
  input: string
  output: string
  reverseOffsets?: number[]
  offsets?: number[]
}

interface NormalizeOptions {
  offsets?: boolean
  reverseOffsets?: boolean
}

const nfkdLengthCache = new Map<number, number>()

function normalizeWithOffsets(
  input: string,
  opts: NormalizeOptions,
): NormalizeResult {
  const output = input.normalize('NFKD')
  if (output === input) {
    return { input, output }
  }

  const reverseOffsets = []
  const offsets = []
  let inOffset = 0
  let outOffset = 0

  for (const ch of input) {
    const codePoint = ch.codePointAt(0)!
    let decomposedLen = nfkdLengthCache.get(codePoint)
    if (decomposedLen === undefined) {
      decomposedLen = ch.normalize('NFKD').length
      nfkdLengthCache.set(codePoint, decomposedLen)
    }

    if (opts.offsets) {
      for (let i = 0; i < ch.length; i++) {
        offsets.push(outOffset)
      }
      outOffset += decomposedLen
    }

    if (opts.reverseOffsets) {
      for (let i = 0; i < decomposedLen; i++) {
        reverseOffsets.push(inOffset)
      }
      inOffset += ch.length
    }
  }

  if (opts.offsets) {
    offsets.push(output.length)
  }
  if (opts.reverseOffsets) {
    reverseOffsets.push(inOffset)
  }

  return { input, output, reverseOffsets, offsets }
}

export interface TranslateOffsetOptions {
  normalize?: boolean
}

export function translateOffsets(
  input: string,
  output: string,
  start: number,
  end: number,
  filter: (ch: string) => boolean,
  options: TranslateOffsetOptions = {},
): [number, number] {
  start = Math.max(0, Math.min(start, input.length))
  end = Math.max(start, Math.min(end, input.length))

  const normInput: NormalizeResult = options.normalize
    ? normalizeWithOffsets(input, { offsets: true })
    : { input, output: input }
  const normOutput = options.normalize
    ? normalizeWithOffsets(output, { reverseOffsets: true })
    : { input, output }

  const normStart = normInput.offsets?.[start] ?? start
  const normEnd = normInput.offsets?.[end] ?? end

  const beforeStartCount = countChars(normInput.output, filter, 0, normStart)
  const startToEndCount = countChars(
    normInput.output,
    filter,
    normStart,
    normEnd,
  )

  let outputStart = advance(normOutput.output, beforeStartCount, filter)

  while (
    outputStart < normOutput.output.length
    && !filter(normOutput.output[outputStart])
  ) {
    ++outputStart
  }

  const outputEnd = advance(
    normOutput.output,
    startToEndCount,
    filter,
    outputStart,
  )

  const unnormOutputStart
    = normOutput.reverseOffsets?.[outputStart] ?? outputStart
  const unnormOutputEnd = normOutput.reverseOffsets?.[outputEnd] ?? outputEnd

  return [unnormOutputStart, unnormOutputEnd]
}

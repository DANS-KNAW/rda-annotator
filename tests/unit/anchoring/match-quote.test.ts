import { describe, expect, it } from 'vitest'
import { matchQuote } from '@/utils/anchoring/match-quote'

describe('matchQuote', () => {
  describe('exact matching', () => {
    it('finds exact match at beginning of text', () => {
      const text = 'Hello world, this is a test'
      const result = matchQuote(text, 'Hello')

      expect(result).not.toBeNull()
      expect(result?.start).toBe(0)
      expect(result?.end).toBe(5)
    })

    it('finds exact match in middle of text', () => {
      const text = 'The quick brown fox jumps over the lazy dog'
      const result = matchQuote(text, 'brown fox')

      expect(result).not.toBeNull()
      expect(result?.start).toBe(10)
      expect(result?.end).toBe(19)
    })

    it('returns null when quote not found', () => {
      const text = 'Hello world'
      const result = matchQuote(text, 'goodbye')

      expect(result).toBeNull()
    })

    it('finds all occurrences and returns highest scored match', () => {
      const text = 'test test test'
      const result = matchQuote(text, 'test')

      expect(result).not.toBeNull()
      expect(result?.start).toBe(0)
    })
  })

  describe('prefix/suffix context scoring', () => {
    it('prefers match with matching prefix', () => {
      const text = 'The cat sat. A cat ran.'
      const result = matchQuote(text, 'cat', 'The ', undefined)

      expect(result).not.toBeNull()
      // Should match first "cat" due to prefix context
      expect(result?.start).toBe(4)
    })

    it('prefers match with matching suffix', () => {
      const text = 'The cat sat. A cat ran.'
      const result = matchQuote(text, 'cat', undefined, ' ran')

      expect(result).not.toBeNull()
      // Should match second "cat" due to suffix context
      expect(result?.start).toBe(15)
    })

    it('uses hint position when provided', () => {
      const text = 'word word word word'
      const result = matchQuote(text, 'word', undefined, undefined, 10)

      expect(result).not.toBeNull()
      // Should prefer match closest to hint position (position 10)
      expect(result?.start).toBe(10)
    })
  })

  describe('fuzzy matching', () => {
    it('finds approximate match with minor differences', () => {
      const text = 'The annotation system works well'
      // "annotaton" is close to "annotation" (missing 'i')
      const result = matchQuote(text, 'annotaton')

      expect(result).not.toBeNull()
      expect(result?.score).toBeLessThan(1.0)
      // Score is ~0.39 due to context weighting in the algorithm
      expect(result?.score).toBeGreaterThan(0.3)
    })

    it('returns null for completely different text', () => {
      const text = 'Hello world'
      const result = matchQuote(text, 'zzzzzzzzz')

      expect(result).toBeNull()
    })
  })
})

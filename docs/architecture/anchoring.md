# Anchoring System

This document explains how the extension converts abstract selectors into concrete DOM positions.

## Table of Contents

- [The Problem](#the-problem)
- [Solution: Multi-Strategy Anchoring](#solution-multi-strategy-anchoring)
- [Selector Types](#selector-types)
- [Anchoring Flow](#anchoring-flow)
- [Quote Validation](#quote-validation)
- [Orphaned Annotations](#orphaned-annotations)
- [Performance](#performance)

## The Problem

Annotations are stored in Elasticsearch as abstract "selectors" that describe where text appears on a page. When loading a page, the extension must convert these selectors into concrete DOM ranges to display highlights.

### Why Not Store DOM Positions?

DOM positions are fragile. Consider this HTML:

```html
<div id="content">
  <p>This is example text</p>
</div>
```

We could store: "Text inside `#content > p` at offset 8-15".

But if the page changes:

```html
<div id="content">
  <h1>New Heading</h1>
  <p>This is example text</p>
</div>
```

The selector `#content > p` now points to a different element (CSS selector still matches the `<p>`, but it's the first `<p>` child, which is no longer correct if there were multiple).

### The Real Challenge

Web pages change:

- Content gets added, removed, or reordered
- DOM structure changes (new wrapper elements)
- JavaScript modifies content dynamically
- Different users see different content (personalization)

A single anchoring strategy is never 100% reliable. The extension uses multiple strategies with fallbacks.

## Solution: Multi-Strategy Anchoring

The extension stores multiple selectors for each annotation:

1. **TextQuoteSelector** (most robust) - Required
2. **TextPositionSelector** (fast but brittle) - Optional
3. **RangeSelector** (precise but most brittle) - Optional

When loading a page, try each strategy in order until one succeeds. Even if a fast strategy succeeds, validate against the TextQuoteSelector's exact text.

This approach provides:

- Speed when page hasn't changed (fast selectors work)
- Reliability when page has changed (fall back to robust selector)
- Validation to catch false positives

## Selector Types

### TextQuoteSelector (Most Robust)

Stores the exact text plus surrounding context.

Structure:

```typescript
interface TextQuoteSelector {
  type: "TextQuoteSelector";
  exact: string; // The exact text to highlight
  prefix: string; // Text immediately before (up to 20 chars)
  suffix: string; // Text immediately after (up to 20 chars)
}
```

Example annotation on "example text":

```typescript
{
  type: "TextQuoteSelector",
  exact: "example text",
  prefix: "This is ",
  suffix: " in a paragraph"
}
```

### How It Works

File: `utils/anchoring/text-quote.ts`

```typescript
export function anchorByTextQuote(
  root: Element,
  selector: TextQuoteSelector,
  hint?: number
): Range {
  // 1. Extract all text from root element
  const text = root.textContent || "";

  // 2. Search for exact text with prefix/suffix validation
  const match = matchQuote(
    text,
    selector.exact,
    selector.prefix,
    selector.suffix,
    hint // Optional hint from TextPositionSelector
  );

  if (!match) {
    throw new Error("Quote not found in document");
  }

  // 3. Convert character positions to DOM Range
  const range = document.createRange();
  const startPos = resolveTextPosition(root, match.start);
  const endPos = resolveTextPosition(root, match.end);

  if (!startPos || !endPos) {
    throw new Error("Could not resolve quote to DOM range");
  }

  range.setStart(startPos[0], startPos[1]);
  range.setEnd(endPos[0], endPos[1]);

  return range;
}
```

### Steps in Detail

**1. Extract text content**

`root.textContent` returns all text in the element and its descendants, with no HTML tags:

```html
<div>This is <strong>example</strong> text</div>
```

Becomes: `"This is example text"`

**2. Match quote**

The `matchQuote` function searches for the exact text and validates with prefix/suffix:

```typescript
// Simplified logic
function matchQuote(text, exact, prefix, suffix, hint) {
  // Start search near hint position if provided (optimization)
  const searchStart = hint ? Math.max(0, hint - 100) : 0;

  // Find exact text
  let index = text.indexOf(exact, searchStart);

  while (index >= 0) {
    // Check if prefix matches
    const actualPrefix = text.substring(index - prefix.length, index);
    if (actualPrefix === prefix) {
      // Check if suffix matches
      const actualSuffix = text.substring(
        index + exact.length,
        index + exact.length + suffix.length
      );
      if (actualSuffix === suffix) {
        return { start: index, end: index + exact.length };
      }
    }

    // Try next occurrence
    index = text.indexOf(exact, index + 1);
  }

  return null; // Not found
}
```

This handles multiple occurrences of the same text. The prefix/suffix help find the correct occurrence.

**3. Convert positions to Range**

Character positions (e.g., 8-20) must be converted to DOM positions (text node + offset).

`resolveTextPosition(root, 15)` walks through text nodes counting characters until it reaches position 15:

```html
<div>
  <p>This is</p>
  <!-- Chars 0-7 -->
  <p>example text</p>
  <!-- Chars 8-19 -->
</div>
```

Position 8 = `<p>example text</p>` text node, offset 0
Position 15 = `<p>example text</p>` text node, offset 7

The Range is set to span these positions.

### Why Prefix/Suffix?

Consider annotating "the" on a page with 100 instances of "the". Without context, which "the" is it?

Prefix/suffix provide context:

- exact: "the"
- prefix: "called "
- suffix: " example"

This matches "called the example" specifically, not just any "the".

### TextPositionSelector (Fast But Brittle)

Stores character offsets from the document start.

Structure:

```typescript
interface TextPositionSelector {
  type: "TextPositionSelector";
  start: number; // Character offset from document start
  end: number; // Character offset from document start
}
```

Example:

```typescript
{
  type: "TextPositionSelector",
  start: 8,
  end: 20
}
```

Means: Characters 8-20 in the document text.

### How It Works

File: `utils/anchoring/text-position.ts`

```typescript
export function anchorByTextPosition(
  root: Element,
  selector: TextPositionSelector
): Range {
  const range = document.createRange();

  // Convert character positions to DOM positions
  const startPos = resolveTextPosition(root, selector.start);
  const endPos = resolveTextPosition(root, selector.end);

  if (!startPos || !endPos) {
    throw new Error("Text position out of range");
  }

  range.setStart(startPos[0], startPos[1]);
  range.setEnd(endPos[0], endPos[1]);

  return range;
}
```

Much simpler than TextQuoteSelector - no searching, just direct conversion of positions.

### Why Brittle?

TextPositionSelector breaks if _any_ content before the annotation changes.

Original document:

```
[0-10] "Header..."
[11-30] "This is example text"  ← annotation at 11-30
```

After adding content:

```
[0-10] "Header..."
[11-40] "New paragraph here..."  ← shifts everything
[41-60] "This is example text"   ← annotation still points to 11-30 (wrong!)
```

The selector now points to the wrong text.

### RangeSelector (XPath-Based)

Stores XPath expressions to specific DOM nodes.

Structure:

```typescript
interface RangeSelector {
  type: "RangeSelector";
  startContainer: string; // XPath to start node
  startOffset: number; // Offset in start node
  endContainer: string; // XPath to end node
  endOffset: number; // Offset in end node
}
```

Example:

```typescript
{
  type: "RangeSelector",
  startContainer: "/html/body/div[1]/p[2]",
  startOffset: 8,
  endContainer: "/html/body/div[1]/p[2]",
  endOffset: 20
}
```

This points directly to the DOM node via XPath.

### How It Works

File: `utils/anchoring/range.ts`

```typescript
export function anchorByRange(root: Element, selector: RangeSelector): Range {
  // Evaluate XPath to find start node
  const startNode = evaluateXPath(root, selector.startContainer);
  const endNode = evaluateXPath(root, selector.endContainer);

  if (!startNode || !endNode) {
    throw new Error("XPath did not match any nodes");
  }

  const range = document.createRange();
  range.setStart(startNode, selector.startOffset);
  range.setEnd(endNode, selector.endOffset);

  return range;
}
```

### Why Most Brittle?

RangeSelector breaks if DOM structure changes at all.

Original HTML:

```html
<div>
  <p>Header</p>
  <!-- /html/body/div/p[1] -->
  <p>Example text</p>
  <!-- /html/body/div/p[2] ← annotation -->
</div>
```

After adding element:

```html
<div>
  <p>Header</p>
  <!-- /html/body/div/p[1] -->
  <p>New content</p>
  <!-- /html/body/div/p[2] ← XPath now points here! -->
  <p>Example text</p>
  <!-- /html/body/div/p[3] -->
</div>
```

The XPath `/html/body/div/p[2]` now points to "New content" instead of "Example text".

## Anchoring Flow

The main anchoring function tries strategies in order of speed, with validation.

### Strategy Order

1. **Try RangeSelector first** - Fastest. If DOM hasn't changed, this succeeds in ~1ms.

2. **Try TextPositionSelector** - Fast. If content before annotation hasn't changed, this succeeds in ~5ms.

3. **Try TextQuoteSelector** - Slowest but most reliable. If exact text with context still exists, this succeeds in ~20-50ms.

4. **Fail** - If all strategies fail, throw error. Caller marks annotation as orphaned.

### Optimization: Position Hint

TextQuoteSelector can use a hint from TextPositionSelector:

```typescript
const positionHint = textPositionSelector?.start;
const range = anchorByTextQuote(root, textQuoteSelector, positionHint);
```

Instead of searching the entire document, start near the hint position. This speeds up searching on large documents.

If the hint is wrong (content moved), the search still finds the correct position, just slower.

## Quote Validation

Even when fast selectors succeed, validate against the quote:

```typescript
const assertQuoteMatches = (range: Range): Range => {
  if (textQuoteSelector?.exact) {
    const rangeText = range.toString();
    if (rangeText !== textQuoteSelector.exact) {
      throw new Error(`Quote mismatch`);
    }
  }
  return range;
};
```

This catches cases where the fast selector found _a_ position but not the _correct_ position.

### Why Validate?

Example: Annotation on "example text" with selectors:

```typescript
{
  range: "/html/body/p[2]", offset 0-12,
  position: start: 20, end: 32,
  quote: exact: "example text", prefix: "This is ", suffix: " in a"
}
```

Page changes to:

```html
<body>
  <p>This is</p>
  <p>example code</p>
  <!-- p[2] now has different text! -->
  <p>This is example text in a paragraph</p>
</body>
```

RangeSelector `/html/body/p[2]` points to "example code" (wrong).
Without validation, the annotation would highlight the wrong text.
With validation, the quote mismatch is detected and the next selector is tried.

## Orphaned Annotations

An annotation is "orphaned" when all anchoring strategies fail.

Causes:

1. **Content removed** - The annotated text no longer exists on the page
2. **Significant changes** - Page structure changed so much that selectors can't find the text
3. **Temporary content** - Annotation was created on dynamic content that doesn't persist
4. **Bad selectors** - Selectors were generated incorrectly

### Handling Orphans

Orphaned annotations are stored in `AnnotationManager.orphanedAnnotationIds`:

```typescript
try {
  await this.anchorAnnotation(annotation);
} catch (error) {
  // Mark as orphaned
  this.orphanedAnnotationIds.add(annotation._id);
}
```

The sidebar displays orphaned annotations in a separate section. Users can:

- See that annotations exist (not silently hidden)
- Read annotation content (title, description, tags)
- Delete orphaned annotations
- Understand why they can't be displayed

This is better than silently hiding failed annotations.

### Can Orphans Be Recovered?

Sometimes. If the page is reloaded and content comes back, orphaned annotations might anchor successfully on reload.

Example: Dynamic content that loads via JavaScript might not be present during initial anchor. After JavaScript runs, the content appears and anchoring succeeds.

## Performance

### Timing by Strategy

Average times per annotation on a typical page (1000-5000 lines of text):

- **RangeSelector**: ~1ms
- **TextPositionSelector**: ~5ms
- **TextQuoteSelector**: ~20-50ms

On a page with minimal changes, most annotations anchor via RangeSelector (~1ms each).
On a significantly changed page, most fall back to TextQuoteSelector (~20-50ms each).

### Timeout

AnnotationManager uses a 5-second timeout per annotation:

```typescript
await Promise.race([
  this.anchorAnnotation(annotation),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout")), 5000)
  ),
]);
```

Why 5 seconds? On a large document (10,000+ lines), TextQuoteSelector can take 1-2 seconds per annotation. With timeout, even slow annotations don't freeze the page.

Annotations that timeout are marked as orphaned.

---

For usage details, see:

- [AnnotationManager Component](../components/annotation-manager.md) for anchoring lifecycle
- [Architecture Overview](overview.md) for system context

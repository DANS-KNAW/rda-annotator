# Highlighter Component

This document explains how visual highlights are created and managed for annotations.

## Table of Contents

- [Overview](#overview)
- [How Highlighting Works](#how-highlighting-works)
- [Key Functions](#key-functions)
- [CSS and Styling](#css-and-styling)
- [Usage Patterns](#usage-patterns)

## Overview

File: `utils/highlighter.ts`

The highlighter creates visual overlays by wrapping text nodes in custom `<rda-highlight>` elements. It handles text that spans multiple DOM nodes and ensures highlights work across complex page layouts.

## How Highlighting Works

### Basic Process

1. **Extract text nodes from range** - Find all text nodes within the DOM Range
2. **Split at boundaries** - Split text nodes at range start and end points
3. **Group adjacent nodes** - Group consecutive text nodes together
4. **Filter whitespace** - Skip whitespace-only spans (with exceptions)
5. **Wrap in elements** - Replace each span with a `<rda-highlight>` element containing the text nodes

### Example Transformation

Before highlighting:

```html
<p>This is example text</p>
```

After highlighting "example":

```html
<p>
  This is
  <rda-highlight class="rda-highlight" data-annotation-id="ann_123">
    example
  </rda-highlight>
  text
</p>
```

### Handling Split Text

When text spans multiple elements:

```html
<p>This is <strong>example</strong> text</p>
```

Highlighting "example text" creates two highlight elements:

```html
<p>
  This is
  <strong>
    <rda-highlight data-annotation-id="ann_123">example</rda-highlight>
  </strong>
  <rda-highlight data-annotation-id="ann_123"> text</rda-highlight>
</p>
```

Both elements share the same annotation ID to indicate they're part of one annotation.

## Key Functions

### highlightRange(range, annotationId)

Creates highlight elements for a DOM Range.

**Parameters:**
- `range`: DOM Range to highlight
- `annotationId`: Unique ID for this annotation

**Returns:** Highlight object containing array of created elements and annotation ID

**Process:**
1. Extract text nodes from range, splitting at boundaries
2. Group adjacent text nodes
3. Filter whitespace-only groups
4. Create `<rda-highlight>` element for each group
5. Move text nodes into highlight elements
6. Return array of created elements

### removeHighlight(highlight)

Removes highlight elements and restores original text.

**Process:**
1. For each highlight element, move child nodes back to parent
2. Remove the highlight element from DOM
3. Leave adjacent text nodes (caller should normalize later)

**Note:** This function doesn't normalize the DOM. Batch normalization should happen after removing multiple highlights to avoid performance issues.

### setHighlightFocused(highlight, focused)

Changes visual style to indicate focus.

**Parameters:**
- `highlight`: Highlight object to modify
- `focused`: Boolean for focused state

**Process:**
- Add or remove `rda-highlight-focused` class
- Focused highlights appear yellow instead of green
- Only one annotation should be focused at a time

## CSS and Styling

### Style Injection

Highlight styles are injected once per document:

```css
rda-highlight {
  cursor: pointer;
  background-color: transparent;
  transition: background-color 0.2s;
}

.rda-highlights-visible rda-highlight {
  background-color: rgba(70, 125, 44, 0.3); /* Green */
}

.rda-highlights-visible rda-highlight:hover {
  background-color: rgba(70, 125, 44, 0.5); /* Darker green */
}

.rda-highlights-visible rda-highlight.rda-highlight-focused {
  background-color: rgba(255, 255, 0, 0.4); /* Yellow */
}
```

### Conditional Visibility

Highlights are invisible by default. They become visible when an ancestor has the `rda-highlights-visible` class:

```typescript
// Make highlights visible
document.body.classList.add('rda-highlights-visible')

// Hide highlights
document.body.classList.remove('rda-highlights-visible')
```

This allows instant toggling without recreating DOM elements.

### Color Scheme

- **Normal state**: Green with 30% opacity
- **Hover state**: Green with 50% opacity (darker)
- **Focused state**: Yellow with 40% opacity

### Custom Element

Uses `<rda-highlight>` custom element name to avoid conflicts with existing page elements. Custom elements don't require registration and work in all browsers.

## Usage Patterns

### Creating Highlights

```typescript
import { highlightRange } from '@/utils/highlighter'

const selection = window.getSelection()
if (selection && !selection.isCollapsed) {
  const range = selection.getRangeAt(0)
  const highlight = highlightRange(range, 'ann_123')

  // highlight.elements contains array of created elements
  // highlight.annotationId is "ann_123"
}
```

### Removing Highlights

```typescript
import { removeHighlight } from '@/utils/highlighter'

// Remove highlight
removeHighlight(highlight)

// Normalize parent elements to clean up adjacent text nodes
const parents = new Set()
for (const element of highlight.elements) {
  if (element.parentNode) {
    parents.add(element.parentNode)
  }
}

for (const parent of parents) {
  if (parent.nodeType === Node.ELEMENT_NODE) {
    parent.normalize()
  }
}
```

### Focusing Highlights

```typescript
import { setHighlightFocused } from '@/utils/highlighter'

// Focus an annotation
setHighlightFocused(highlight, true)

// Unfocus an annotation
setHighlightFocused(highlight, false)
```

### Toggling Visibility

```typescript
// Show all highlights
document.body.classList.add('rda-highlights-visible')

// Hide all highlights
document.body.classList.remove('rda-highlights-visible')

// Toggle visibility
document.body.classList.toggle('rda-highlights-visible')
```

### Finding Highlights at Point

Use the helper function to find annotations at mouse coordinates:

```typescript
import { getAnnotationIdsAtPoint } from '@/utils/highlights-at-point'

document.addEventListener('click', (event) => {
  const annotationIds = getAnnotationIdsAtPoint(
    event.clientX,
    event.clientY,
    document
  )

  if (annotationIds.length > 0) {
    // Multiple annotations can overlap at the same point
    console.log('Clicked annotations:', annotationIds)
  }
})
```

## Technical Details

### Text Node Splitting

When highlighting part of a text node, the node is split:

```html
<!-- Original single text node -->
<p>This is example text</p>

<!-- After highlighting "example" -->
<p>
  [text: "This is "]
  <rda-highlight>
    [text: "example"]
  </rda-highlight>
  [text: " text"]
</p>
```

The original text node is split into three nodes. This ensures only the highlighted portion is wrapped.

### Grouping Adjacent Nodes

Adjacent text nodes are wrapped in a single highlight element:

```html
<!-- Two adjacent text nodes that both need highlighting -->
[text: "exam"][text: "ple"]

<!-- Wrapped together instead of separately -->
<rda-highlight>
  [text: "exam"][text: "ple"]
</rda-highlight>
```

This reduces the number of highlight elements and improves performance.

### Whitespace Filtering

Text nodes containing only whitespace are usually skipped. Exception: whitespace inside `<span>` elements is kept because it affects layout in some contexts like code editors.

### DOM Normalization

After removing highlights, adjacent text nodes remain. The caller should normalize these:

```typescript
parentElement.normalize()
```

Normalization merges adjacent text nodes back into single nodes. This is important for future anchoring operations.

### Multiple Elements per Highlight

A single highlight can consist of multiple DOM elements when text spans disconnected parts:

```typescript
interface Highlight {
  elements: HTMLElement[] // Can be multiple
  annotationId: string
}
```

All elements share the same annotation ID via `data-annotation-id` attribute.

## Summary

The highlighter wraps text in custom elements to create visual overlays for annotations.

Key concepts:
- Wraps only highlighted text (splits nodes at boundaries)
- Groups adjacent nodes into single elements
- Uses conditional visibility via CSS class
- Supports focused state for selected annotations
- Handles text spanning multiple DOM parts
- Requires DOM normalization after removal

For related documentation:
- [AnnotationManager Component](annotation-manager.md) - How highlights are managed
- [Anchoring System](../architecture/anchoring.md) - How ranges are determined

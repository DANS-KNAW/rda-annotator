# AnnotationManager Component

The `AnnotationManager` class manages the complete lifecycle of annotations in a document or frame.

## Table of Contents

- [Overview](#overview)
- [Responsibilities](#responsibilities)
- [Core Concepts](#core-concepts)
- [Key Operations](#key-operations)
- [Usage Patterns](#usage-patterns)
- [Debugging Guide](#debugging-guide)

## Overview

File: `entrypoints/content/annotation-manager.ts`

AnnotationManager coordinates all annotation operations within a single document or frame. Each frame creates its own instance, so the top-level page has one manager and each nested iframe has its own manager.

## Responsibilities

**Loading and Storage**
- Query Elasticsearch for annotations by URL
- Store successfully anchored annotations
- Track orphaned annotations that failed to anchor

**Anchoring**
- Convert abstract selectors to concrete DOM ranges
- Handle both HTML and PDF content
- Apply 5-second timeout to prevent page freezes

**Visual Rendering**
- Create highlights for anchored annotations
- Manage temporary highlights for new annotations
- Control highlight visibility

**User Interactions**
- Detect clicks on highlights
- Track hover state with throttling
- Focus individual annotations

**PDF Support**
- Watch for PDF page loads
- Re-anchor placeholders when pages become available
- Handle lazy page loading

## Core Concepts

### One Manager Per Frame

Each frame manages its own annotations independently:

```
Top-level page
├── AnnotationManager (main page)
│
├── Iframe #1
│   └── AnnotationManager (iframe content)
│
└── Iframe #2
    └── AnnotationManager (nested iframe content)
```

Managers don't share state. The host frame coordinates communication between frames and the sidebar.

### Annotation States

**Anchored**: Successfully converted selectors to DOM range and created highlight

**Orphaned**: All anchoring strategies failed, shown in separate sidebar section

**Placeholder**: PDF annotation waiting for its page to load

### Data Structures

The manager stores two collections:

**annotations**: Map of annotation ID to anchored annotation data (annotation document, highlight elements, DOM range)

**orphanedAnnotationIds**: Set of annotation IDs that couldn't be anchored

## Key Operations

### Loading Annotations

When loading annotations:

1. Clear existing annotations and temporary highlights
2. Normalize DOM to merge adjacent text nodes
3. Fetch annotations from Elasticsearch for current URL
4. For each annotation, attempt anchoring with timeout
5. Create highlights for successful anchors
6. Track failed anchors as orphaned

**Why normalize the DOM?** The browser sometimes splits text into multiple adjacent nodes. This breaks text anchoring because "Example text" might be stored as three separate text nodes. Normalization merges them into one.

**Why use a timeout?** On large documents, anchoring can take several seconds. The 5-second timeout prevents a single slow annotation from freezing the page.

### Creating Highlights

After successfully anchoring an annotation:

1. Check if it's a PDF placeholder (page not loaded yet)
2. For PDF placeholders, store the range but don't create visual highlights yet
3. For regular content, create highlight elements
4. Store annotation with highlight reference
5. Attach click event listeners to highlight elements

### Event Handling

**Click Detection**

Listens for mouseup events on the document. When a click occurs:

1. Check if user is selecting text (ignore clicks during text selection)
2. Get annotation IDs at click coordinates
3. Call the configured click handler with annotation IDs

**Hover Detection**

Uses throttled mousemove events to detect hovers:

1. Throttle to every 50ms to avoid excessive processing
2. Get annotation IDs at mouse coordinates
3. Compare to previously hovered IDs
4. Only call hover handler if IDs changed

**Why throttle hover?** Mouse movement fires hundreds of events per second. Throttling reduces checks to about 20 per second with no perceivable lag.

### PDF Page Loading

For PDF documents, the manager watches for new pages:

1. Observe the PDF viewer container with MutationObserver
2. Watch for `data-loaded` attribute changes on page elements
3. When a page loads, find any placeholder annotations for that page
4. Re-anchor placeholders now that the page DOM exists
5. Create visual highlights

**Why debounce?** If a user scrolls quickly through many pages, debouncing batches multiple page loads into a single re-anchoring operation.

### Temporary Highlights

When creating a new annotation:

1. User selects text and clicks "Annotate"
2. Manager creates a temporary highlight (yellow color, focused state)
3. Temporary highlight persists while user fills out form
4. On submit, temporary highlight is removed and permanent highlight appears
5. On cancel, temporary highlight is removed

**Why normalize after removal?** Removing highlights leaves adjacent text nodes. Normalization merges them to keep DOM clean for future anchoring.

### Scrolling to Annotations

When scrolling to an annotation:

1. Get the annotation from stored map
2. If it's a PDF placeholder without a highlight yet, scroll to approximate position
3. Wait briefly for PDF page to load
4. Check if now fully anchored with highlight
5. Focus the annotation (change visual style)
6. Scroll the highlight into view

### Visibility Control

Highlights are always in the DOM but visibility is controlled by a CSS class:

```typescript
setHighlightsVisible(true) // Adds class, highlights appear
setHighlightsVisible(false) // Removes class, highlights hidden
```

This allows instant toggling without recreating highlights.

## Usage Patterns

### Main Frame Setup

```typescript
const manager = new AnnotationManager({
  onHighlightClick: async (annotationIds) => {
    // Open sidebar and show annotations
    await sendMessage('showAnnotationsFromHighlight', { annotationIds })
  },
  onHighlightHover: async (annotationIds) => {
    // Send hover state to sidebar
    await sendMessage('hoverAnnotations', { annotationIds })
  }
})

await manager.loadAnnotations()
manager.setHighlightsVisible(true)
```

### Guest Frame Setup

```typescript
const manager = new AnnotationManager({
  rootElement: iframeDocument.body, // Scope to iframe

  onHighlightClick: async (annotationIds) => {
    // Send to parent frame, not directly to sidebar
    window.parent.postMessage({
      type: 'rda:showAnnotations',
      annotationIds
    }, '*')
  }
})
```

### Creating Temporary Highlights

```typescript
const selection = window.getSelection()
if (selection && !selection.isCollapsed) {
  const range = selection.getRangeAt(0)
  await manager.createTemporaryHighlight(range)
  // Open sidebar for annotation form
}
```

### Handling Reloads

```typescript
// After creating annotation, reload to show permanent highlight
onMessage('reloadAnnotations', async () => {
  await manager.loadAnnotations()
})
```

## Debugging Guide

### Annotations Not Appearing

Check the orphaned annotations set to see if they failed to anchor:

```typescript
console.log(manager.orphanedAnnotationIds)
```

Common causes:
- Page content changed since annotation was created
- Selectors were generated incorrectly
- DOM structure is too dynamic

### Highlights Not Visible

Check if the visibility class is set:

```typescript
console.log(document.body.classList.contains('rda-highlights-visible'))
```

If false, highlights exist but are hidden. Enable visibility:

```typescript
manager.setHighlightsVisible(true)
```

### PDF Highlights Missing

For PDF annotations, check if the page has loaded:

1. Scroll to the page containing the annotation
2. Wait for the page to render
3. Check if the annotation now has a highlight

PDF pages load lazily. The manager automatically re-anchors when pages load, but you need to scroll to the page first.

### Click Events Not Working

Possible issues:

1. Highlight is a PDF placeholder (no visual elements yet)
2. Event listeners weren't attached (check highlight creation)
3. Another element is capturing the click (check z-index)

### Performance Issues

Check the number of annotations:

```typescript
console.log(manager.annotations.size)
```

With many annotations (100+), anchoring takes time:
- Each annotation: 20-50ms with TextQuoteSelector
- 200 annotations: 4-10 seconds total
- Timeout prevents individual freezes but total time still accumulates

## Summary

AnnotationManager is the core class for managing annotations within a frame. It handles the complete lifecycle from loading to display to user interaction.

Key responsibilities:
- Load annotations from Elasticsearch
- Anchor selectors to DOM
- Create and manage visual highlights
- Handle user interactions
- Support PDF lazy loading
- Track orphaned annotations

Key concepts:
- One manager instance per frame
- Orphaned annotations when anchoring fails
- Placeholders for unloaded PDF pages
- Throttled hover for performance
- DOM normalization for reliable anchoring
- Temporary highlights for new annotations

For related documentation:
- [Anchoring System](../architecture/anchoring.md) - How selectors convert to DOM ranges
- [Highlighter Component](highlighter.md) - How visual highlights are created
- [Multi-Frame Coordination](../architecture/multi-frame.md) - How frames communicate

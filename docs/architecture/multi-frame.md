# Multi-Frame Coordination

This document explains how the extension handles annotations across nested iframes.

## Table of Contents

- [The Problem](#the-problem)
- [Solution: Host-Guest Architecture](#solution-host-guest-architecture)
- [Components](#components)
- [Implementation Details](#implementation-details)
- [Message Flow](#message-flow)
- [Edge Cases](#edge-cases)

## The Problem

Web pages often contain nested iframes (embedded content from the same or different domains). Each iframe has its own isolated DOM.

Example page structure:

```html
<html>
  <!-- Top-level page -->
  <body>
    <p>Main content</p>
    <!-- Can have annotations -->

    <iframe src="/embed1">
      <!-- Nested iframe #1 -->
      <p>Iframe content</p>
      <!-- Can have annotations -->
    </iframe>

    <iframe src="/embed2">
      <!-- Nested iframe #2 -->
      <p>More content</p>
      <!-- Can have annotations -->

      <iframe src="/embed3">
        <!-- Doubly-nested iframe -->
        <p>Deep content</p>
        <!-- Can have annotations -->
      </iframe>
    </iframe>
  </body>
</html>
```

Challenges:

1. **Each iframe needs annotations** - Users should be able to annotate text in any frame

2. **Only one sidebar** - The sidebar should show annotations from all frames, not multiple sidebars

3. **Cross-frame communication** - Iframes need to communicate with the sidebar, but they can't directly message it

4. **Dynamic iframes** - JavaScript can add/remove iframes at any time

5. **Cross-origin restrictions** - Iframes from different domains have additional restrictions

## Solution: Host-Guest Architecture

The extension uses a hierarchical architecture where the top-level page is the "host" and nested iframes are "guests."

### Roles

**Host Frame** (top-level page):

- Manages the sidebar (only the host shows the sidebar)
- Observes the page for new iframes
- Injects content scripts into iframes
- Coordinates messages between guests and sidebar
- Has its own AnnotationManager for main page content

**Guest Frames** (nested iframes):

- Have their own AnnotationManager for iframe content
- Send messages to parent (host) using `window.postMessage`
- Do NOT communicate directly with sidebar
- Can be nested multiple levels deep

### Visual Representation

```
Top-level Page (HOST)
├── AnnotationManager (main page content)
├── Sidebar (React app)
├── Host coordinator
│
├── Iframe #1 (GUEST)
│   └── AnnotationManager (iframe content)
│       └── Messages sent to parent via postMessage
│
└── Iframe #2 (GUEST)
    ├── AnnotationManager (iframe content)
    └── Iframe #3 (GUEST)
        └── AnnotationManager (nested iframe content)
```

Messages flow: Guest → Parent → Host → Sidebar

## Components

### FrameObserver

Watches for new iframes added to the page.

### How It Works

**1. Scan existing iframes**

When starting, scan the page for all existing iframes using `querySelectorAll("iframe")`.

**2. Watch for new iframes**

Use `MutationObserver` to watch for new DOM nodes. When a node is added:

- Check if it's an `<iframe>`
- Check if it contains nested `<iframe>` elements
- Call `onFrameDiscovered` callback for each new iframe

**3. Prevent duplicates**

Use `WeakSet` to track discovered frames. `WeakSet` doesn't prevent garbage collection, so removed iframes are automatically cleaned up.

### Why MutationObserver?

JavaScript can dynamically add iframes at any time:

```javascript
// Page JavaScript adds iframe after page load
const iframe = document.createElement('iframe')
iframe.src = '/embed'
document.body.appendChild(iframe)
```

MutationObserver catches these dynamic additions immediately.

### FrameInjector

Injects content scripts into discovered iframes.

File: `entrypoints/content/frame-injector.ts`

### How It Works

**1. Wait for frame ready**

Iframes load asynchronously. Wait for the frame's document to be ready before injecting.

```typescript
async function waitForFrameReady(frame: HTMLIFrameElement): Promise<boolean> {
  const doc = frame.contentDocument
  if (!doc)
    return false

  if (doc.readyState === 'complete' || doc.readyState === 'interactive') {
    return true
  }

  // Wait for load event (with 10-second timeout)
  return new Promise((resolve) => {
    const onLoad = () => {
      frame.removeEventListener('load', onLoad)
      resolve(true)
    }
    frame.addEventListener('load', onLoad)
    setTimeout(() => {
      frame.removeEventListener('load', onLoad)
      resolve(false)
    }, 10000)
  })
}
```

**2. Check if already injected**

Avoid double-injection by checking for marker:

```typescript
function hasRDAInjected(frame: HTMLIFrameElement): boolean {
  try {
    const doc = frame.contentDocument
    return doc?.querySelector('[data-rda-injected]') !== null
  }
  catch {
    // Cross-origin frame - can't access
    return false
  }
}
```

**3. Create AnnotationManager**

Each frame gets its own AnnotationManager scoped to `frameDoc.body`. Annotations in the iframe are separate from the main page.

**4. Configure message passing**

Guest frames use `window.parent.postMessage` instead of extension message passing. They send to their parent frame, which forwards to the host.

### Host Coordinator

Coordinates the sidebar and handles messages from guest frames.

File: `entrypoints/content/host.ts`

The host manages sidebar lifecycle (mount, unmount, open, close).

## Implementation Details

### Injection Flow

When the extension loads on a page:

```
1. Content script runs in top-level page
   ↓
2. Identify as host frame (window.self === window.top)
   ↓
3. Create FrameObserver
   ↓
4. FrameObserver scans for existing iframes
   ↓
5. For each iframe:
   a. FrameInjector injects AnnotationManager
   b. AnnotationManager loads annotations for iframe URL
   c. Configure postMessage callbacks
   ↓
6. FrameObserver starts watching for new iframes
   ↓
7. When new iframe added:
   a. MutationObserver fires
   b. FrameInjector injects into new iframe
```

### Guest Frame Initialization

Guest frames:

1. Register their URL with the host (for sidebar's frame list)
2. Create AnnotationManager scoped to their own DOM
3. Send messages to parent using `window.postMessage`

### Host Message Handling

The host listens for messages from guest frames (`entrypoints/content/index.ts`):

```typescript
window.addEventListener('message', async (event) => {
  if (event.data.type === 'rda:showAnnotations') {
    if (!host)
      return

    // Ensure sidebar is mounted and open
    if (!host.isMounted.sidebar) {
      await host.mount()
    }
    await host.openSidebar()

    // Forward to sidebar via extension messaging
    try {
      await sendMessage('showAnnotationsFromHighlight', {
        annotationIds: event.data.annotationIds,
      })
    }
    catch (error) {
      console.error('Failed to show annotations from frame:', error)
    }
  }
  else if (event.data.type === 'rda:hoverAnnotations') {
    // Forward hover state to sidebar
    await sendMessage('hoverAnnotations', {
      annotationIds: event.data.annotationIds,
    })
  }
  else if (event.data.type === 'rda:registerFrameUrl') {
    // Track frame URLs for sidebar
    frameUrls.add(event.data.url)
    await sendMessage('frameUrlsChanged', {
      urls: Array.from(frameUrls),
    })
  }
})
```

The host acts as a relay between guest frames and the sidebar.

## Message Flow

### Example: User Clicks Highlight in Guest Frame

Complete flow from click to sidebar display:

```
1. User clicks highlighted text in nested iframe
   ↓
2. Guest frame's AnnotationManager detects click
   ↓
3. Guest: onHighlightClick callback fires
   ↓
4. Guest: window.parent.postMessage({
     type: "rda:showAnnotations",
     annotationIds: ["ann_123"],
   })
   ↓
5. Host: window.addEventListener("message") receives message
   ↓
6. Host: Validates message type
   ↓
7. Host: Ensures sidebar is mounted and open
   ↓
8. Host: sendMessage("showAnnotationsFromHighlight", { annotationIds })
   ↓
9. Sidebar: onMessage("showAnnotationsFromHighlight") receives message
   ↓
10. Sidebar: Loads annotation details from Elasticsearch
   ↓
11. Sidebar: Displays annotations in UI
```

### Why Two Message Systems?

**window.postMessage** (guest → host):

- Standard web API, works across all frames
- Works even with cross-origin iframes
- No extension permissions required
- Not type-safe

**Extension messaging** (host → sidebar):

- Extension-specific API
- Type-safe via @webext-core/messaging
- Only works within extension contexts
- Cannot cross frame boundaries

Guest frames use `postMessage` because they can't directly use extension messaging to reach the sidebar (different frame context).

## Edge Cases

### Cross-Origin Iframes

Cross-origin iframes (from different domains) have restrictions.

The content script can still inject:

```typescript
// In manifest
"allFrames": true,           // Inject into all frames
"matchAboutBlank": true,     // Include about:blank frames
```

Browser injects content scripts into cross-origin iframes, so annotations work.

However:

- The host frame cannot access cross-origin iframe's DOM (security restriction)
- Must use `postMessage` for communication (already the approach)
- Can't directly call functions or access variables

The extension handles this transparently - cross-origin frames work the same as same-origin frames.

### Dynamically Added Iframes

JavaScript can add iframes at any time:

```javascript
// After 5 seconds, add an iframe
setTimeout(() => {
  const iframe = document.createElement('iframe')
  iframe.src = '/embed'
  document.body.appendChild(iframe)
}, 5000)
```

The MutationObserver catches this immediately:

```
1. JavaScript adds iframe to DOM
   ↓
2. MutationObserver fires (childList mutation)
   ↓
3. FrameObserver.handleFrame(iframe)
   ↓
4. FrameInjector.injectFrame(iframe)
   ↓
5. Annotations load in new iframe
```

No manual refresh needed - new iframes get annotations automatically.

### Removed Iframes

When JavaScript removes an iframe:

```javascript
const iframe = document.querySelector('iframe')
iframe.remove() // Remove from DOM
```

The extension cleans up automatically:

- `WeakMap` and `WeakSet` allow garbage collection
- When iframe is removed from DOM, it becomes unreachable
- JavaScript garbage collector removes iframe and associated AnnotationManager
- No memory leaks

### Nested Iframes (Deep Nesting)

Iframes can be nested multiple levels:

```html
<html>
  <!-- Host -->
  <iframe>
    <!-- Guest level 1 -->
    <iframe>
      <!-- Guest level 2 -->
      <iframe>
        <!-- Guest level 3 -->
        <p>Deep content</p>
      </iframe>
    </iframe>
  </iframe>
</html>
```

Each level forwards messages to its parent:

```
Guest level 3: Click detected
  ↓ window.parent.postMessage
Guest level 2: Forwards message
  ↓ window.parent.postMessage
Guest level 1: Forwards message
  ↓ window.parent.postMessage
Host: Receives message, forwards to sidebar
  ↓ sendMessage
Sidebar: Displays annotation
```

This works for arbitrary nesting depth.

### Timing Issues

Race conditions can occur:

**Problem**: Guest frame loads faster than host finishes initialization.

```
1. Guest frame: postMessage("rda:showAnnotations")
   ↓
2. Host hasn't set up listener yet
   ↓
3. Message lost
```

**Solution**: Guest frames send messages after a small delay:

```typescript
// Host sets up listener during initialization
window.addEventListener('message', handler)

// Guest sends after frame is ready
await annotationManager.loadAnnotations()
// Host listener is guaranteed to be ready by now
```

The guest waits for its own annotations to load before sending messages, giving the host time to initialize.

## Summary

The multi-frame system handles annotations across nested iframes using a host-guest architecture:

**Components**:

- FrameObserver: Detects new iframes
- FrameInjector: Injects AnnotationManager into iframes
- Host: Coordinates sidebar and relays messages
- Guest frames: Manage their own annotations, send messages to parent

**Key concepts**:

- Host manages the sidebar (only one sidebar for all frames)
- Guests send messages to parent via `window.postMessage`
- Host forwards messages to sidebar via extension messaging
- Works with cross-origin iframes
- Handles dynamic iframe addition/removal
- Supports arbitrary nesting depth

For related documentation, see:

- [AnnotationManager Component](../components/annotation-manager.md) for frame-specific annotation management
- [Message Passing](message-passing.md) for extension messaging
- [Architecture Overview](overview.md) for system context

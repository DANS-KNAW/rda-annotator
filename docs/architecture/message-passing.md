# Message Passing

This document explains how different parts of the extension communicate using type-safe message passing.

## Table of Contents

- [The Challenge](#the-challenge)
- [Solution: @webext-core/messaging](#solution-webext-coremessaging)
- [Protocol Definition](#protocol-definition)
- [Sending Messages](#sending-messages)
- [Receiving Messages](#receiving-messages)
- [Message Flow Examples](#message-flow-examples)
- [Best Practices](#best-practices)
- [Debugging](#debugging)
- [Common Pitfalls](#common-pitfalls)

## The Challenge

Browser extensions run in multiple isolated JavaScript contexts. These contexts cannot directly share memory or call each other's functions.

Three contexts in RDA Annotator:

1. **Background Service Worker** - Manages extension state
2. **Content Scripts** - Injected into web pages
3. **Sidebar** - React app in an iframe

Example of what doesn't work:

```typescript
// ❌ This doesn't work
// Content script trying to call sidebar function
sidebar.displayAnnotation(annotation) // sidebar is undefined

// ❌ This doesn't work
// Sidebar trying to access content script variable
const annotations = contentScript.annotations // contentScript is undefined
```

The only way to communicate is through message passing. The browser provides APIs for sending messages between contexts.

## Solution: @webext-core/messaging

The standard browser messaging API is not type-safe:

```typescript
// ❌ Standard API - no compile-time checking
chrome.runtime.sendMessage({
  action: 'scrolToAnnotation', // Typo! Compiles fine, fails at runtime
  id: 123, // Wrong type! Should be string, not number
})
```

The `@webext-core/messaging` library provides type safety:

```typescript
// ✅ Type-safe - compiler catches errors
await sendMessage('scrollToAnnotation', {
  annotationId: 'ann_123',
})

// ❌ Compiler error: "scrolToAnnotation" doesn't exist
await sendMessage('scrolToAnnotation', { annotationId: 'ann_123' })

// ❌ Compiler error: annotationId must be string
await sendMessage('scrollToAnnotation', { annotationId: 123 })
```

Benefits:

- Catch typos during development
- Ensure correct data types
- Auto-complete message names in IDE
- Know expected return types
- Refactor safely

## Protocol Definition

All messages are defined in `utils/messaging.ts`

### Understanding ProtocolMap

Each entry in `ProtocolMap` defines:

- **Message name** (the key)
- **Data parameter** (the function parameter)
- **Return type** (the function return type)

Examples:

```typescript
// Message with no data, no return value
toggleSidebar(data?: { action?: "mount" | "toggle" }): void;

// Message with required data, returns a value
getExtensionState(): Promise<{ enabled: boolean }>;

// Message with data and return value
requestAnchorStatus(): Promise<{ anchored: string[]; orphaned: string[] }>;
```

Optional data uses `?`. Return values can be `void` (no return), `Promise<T>` (async return), or direct values.

## Sending Messages

Import `sendMessage` from `utils/messaging.ts`:

```typescript
import { sendMessage } from '@/utils/messaging'
```

### Basic Send

```typescript
// Send message with no data
await sendMessage('removeTemporaryHighlight', undefined)

// Send message with data
await sendMessage('scrollToAnnotation', {
  annotationId: 'ann_123',
})
```

### With Return Value

```typescript
// Get return value
const state = await sendMessage('getExtensionState', undefined)
console.log(state.enabled) // true or false

// Get complex return value
const status = await sendMessage('requestAnchorStatus', undefined)
console.log(status.anchored) // ["ann_1", "ann_2"]
console.log(status.orphaned) // ["ann_3"]
```

### Sending to Specific Tab

Background script can send messages to specific tabs:

```typescript
// In background script
import { sendMessage } from '@/utils/messaging'

browser.action.onClicked.addListener(async (tab) => {
  if (tab.id != null) {
    // Send to specific tab
    await sendMessage('toggleSidebar', { action: 'toggle' }, tab.id)
  }
})
```

Content scripts and sidebar always send to the "other side" (no tab ID needed).

## Receiving Messages

Import `onMessage` from `utils/messaging.ts`:

```typescript
import { onMessage } from '@/utils/messaging'
```

### Basic Receive

```typescript
// Listen for message
onMessage('removeTemporaryHighlight', async () => {
  if (annotationManager) {
    annotationManager.removeTemporaryHighlight()
  }
})
```

### Receive with Data

```typescript
// Access message data
onMessage('scrollToAnnotation', async (message) => {
  const { annotationId } = message.data
  if (annotationManager) {
    await annotationManager.scrollToAnnotation(annotationId)
  }
})
```

### Receive and Return Value

```typescript
// Return value from handler
onMessage('getExtensionState', async () => {
  const enabled = await storage.getItem('local:extension-enabled')
  return { enabled: !!enabled }
})

onMessage('requestAnchorStatus', async () => {
  return {
    anchored: ['ann_1', 'ann_2'],
    orphaned: ['ann_3'],
  }
})
```

The return value becomes the resolved value of the `sendMessage` Promise on the sender side.

### Handler Scope

Handlers run when a message arrives. They can be async and return Promises.

```typescript
onMessage('reloadAnnotations', async () => {
  if (!annotationManager)
    return

  // This can take several seconds
  await annotationManager.loadAnnotations()

  // Sender waits for this to complete
})
```

## Message Flow Examples

### Example 1: User Clicks Extension Icon

The background script toggles the sidebar when the user clicks the extension icon.

```
User clicks extension icon
    ↓
browser.action.onClicked fires
    ↓
Background: sendMessage("toggleSidebar", { action: "toggle" }, tabId)
    ↓
Content: onMessage("toggleSidebar") receives message
    ↓
Content: host.toggle()
    ↓
Sidebar mounts or unmounts
```

Code in background.ts:

```typescript
browser.action.onClicked.addListener(async (tab) => {
  // ... toggle extension state ...

  if (tab?.id != null) {
    try {
      await sendMessage('toggleSidebar', { action: 'toggle' }, tab.id)
    }
    catch (error) {
      console.warn('Failed to send toggleSidebar message:', error)
    }
  }
})
```

Code in content/index.ts:

```typescript
onMessage('toggleSidebar', async (message) => {
  // ... toggle sidebar logic ...
})
```

### Example 2: User Clicks Highlight

Content script detects the click and tells the sidebar to display annotation details.

```
User clicks highlighted text
    ↓
Document "mouseup" event fires (annotation-manager.ts:57)
    ↓
Content: getAnnotationIdsAtPoint(x, y)
    ↓
Content: onHighlightClick callback (content/index.ts:81)
    ↓
Content: sendMessage("showAnnotationsFromHighlight", { annotationIds })
    ↓
Sidebar: onMessage("showAnnotationsFromHighlight") (Annotations.tsx)
    ↓
Sidebar: Load annotation details from Elasticsearch
    ↓
Sidebar: Display in UI
```

Code in content/index.ts:

```typescript
annotationManager = new AnnotationManager({
  onHighlightClick: async (annotationIds) => {
    // Tell sidebar to show these annotations
    try {
      await sendMessage('showAnnotationsFromHighlight', { annotationIds })
    }
    catch (error) {
      console.error('Failed to show annotations from highlight:', error)
    }
  },
})
```

Code in sidebar (views/Annotations.tsx):

```typescript
useEffect(() => {
  const unsubscribe = onMessage(
    'showAnnotationsFromHighlight',
    async (message) => {
      const { annotationIds } = message.data

      // Load annotation details
      const annotations = await fetchAnnotations(annotationIds)

      // Display in UI
      setSelectedAnnotations(annotations)
    }
  )

  return unsubscribe
}, [])
```

### Example 3: Cross-Frame Communication

Guest frames (nested iframes) use `window.postMessage` to communicate with the host frame. The host then uses `sendMessage` to communicate with the sidebar.

```
User clicks highlight in nested iframe
    ↓
Guest frame: Click detected
    ↓
Guest: window.parent.postMessage({ type: "rda:showAnnotations", ... })
    ↓
Host: window.addEventListener("message")
    ↓
Host: sendMessage("showAnnotationsFromHighlight", ...)
    ↓
Sidebar: onMessage("showAnnotationsFromHighlight")
    ↓
Sidebar: Display annotations
```

Code in guest frame (content/index.ts):

```typescript
annotationManager = new AnnotationManager({
  onHighlightClick: async (annotationIds) => {
    // Notify parent frame to show annotations
    window.parent.postMessage(
      {
        type: 'rda:showAnnotations',
        annotationIds,
        source: 'guest-frame',
      },
      '*'
    )
  },
})
```

Code in host frame (content/index.ts):

```typescript
window.addEventListener('message', async (event) => {
  if (event.data.type === 'rda:showAnnotations') {
    if (!host)
      return

    if (!host.isMounted.sidebar) {
      await host.mount()
    }
    await host.openSidebar()

    try {
      await sendMessage('showAnnotationsFromHighlight', {
        annotationIds: event.data.annotationIds,
      })
    }
    catch (error) {
      console.error('Failed to show annotations from frame:', error)
    }
  }
})
```

Note: Guest frames use `window.postMessage` (standard web API) to talk to host. Host uses `sendMessage` (extension API) to talk to sidebar.

## Best Practices

### Always Handle Errors

Message receivers might not be ready. Always wrap `sendMessage` in try-catch:

```typescript
try {
  await sendMessage('showAnnotationsFromHighlight', { annotationIds })
}
catch (error) {
  console.error('Failed to send message:', error)
  // Sidebar might not be mounted yet
}
```

### Use Descriptive Message Names

Message names should describe the action, not the implementation:

```typescript
// ✅ Good - describes what happens
await sendMessage('scrollToAnnotation', { annotationId })
await sendMessage('showAnnotationsFromHighlight', { annotationIds })

// ❌ Bad - describes implementation
await sendMessage('callAnnotationManagerScroll', { id })
await sendMessage('updateSidebarState', { ids })
```

### Include All Required Data

Don't rely on shared state. Include all data the receiver needs:

```typescript
// ✅ Good - all data provided
await sendMessage('showAnnotationsFromHighlight', {
  annotationIds: ['ann_1', 'ann_2'],
})

// ❌ Bad - assumes receiver knows current annotations
await sendMessage('showCurrentAnnotations', undefined)
```

### Return Useful Values

If the sender needs information back, return it:

```typescript
// Sender
const state = await sendMessage('getExtensionState', undefined)
if (state.enabled) {
  // Do something
}

// Receiver
onMessage('getExtensionState', async () => {
  const enabled = await storage.getItem('local:extension-enabled')
  return { enabled: !!enabled }
})
```

### Don't Send High-Frequency Messages

Sending hundreds of messages per second can cause performance issues. Throttle or debounce:

```typescript
// ❌ Bad - sends on every mousemove (100+ times/second)
document.addEventListener('mousemove', (event) => {
  sendMessage('hoverAnnotations', { annotationIds: getIds(event) })
})

// ✅ Good - throttled to 50ms
let timeout: number | null = null
document.addEventListener('mousemove', (event) => {
  if (timeout)
    return

  timeout = window.setTimeout(() => {
    timeout = null
  }, 50)

  sendMessage('hoverAnnotations', { annotationIds: getIds(event) })
})
```

### Clean Up Message Handlers

Message handlers persist until explicitly removed. Clean up in component unmount:

```typescript
useEffect(() => {
  // Register handler
  const unsubscribe = onMessage('showAnnotationsFromHighlight', handler)

  // Clean up when component unmounts
  return () => {
    unsubscribe()
  }
}, [])
```

## Debugging

### Finding Message Handlers

To debug messages, check the console in each context:

**Background Context:**

1. Right-click extension icon
2. Select "Manage Extension"
3. Click "Service Worker" (under "Inspect views")
4. Check console

**Content Script Context:**

1. Open the page in browser
2. Open DevTools (F12)
3. Check console (look for `[RDA Content]` prefixes)

**Sidebar Context:**

1. Sidebar must be open
2. Right-click anywhere in sidebar
3. Select "Inspect"
4. Check console

### Adding Debug Logs

Add console logs to trace message flow:

```typescript
// Sender
console.log('[RDA Content] Sending scrollToAnnotation:', annotationId)
await sendMessage('scrollToAnnotation', { annotationId })

// Receiver
onMessage('scrollToAnnotation', async (message) => {
  console.log('[RDA Content] Received scrollToAnnotation:', message.data)
  await annotationManager.scrollToAnnotation(message.data.annotationId)
})
```

### Message Not Received?

Common causes:

1. **Receiver not ready yet**

   - Sidebar might not be mounted
   - Content script might not be initialized
   - Solution: Wrap in try-catch and handle gracefully

2. **Wrong context**

   - Sending to background instead of content script
   - Solution: Check which context should handle the message

3. **Message handler not registered**

   - `onMessage` not called
   - Solution: Verify handler registration in receiver code

## Common Pitfalls

### Forgetting Async/Await

Message handlers are async but might not explicitly return Promises:

```typescript
// ❌ Bad - not waiting for async operation
onMessage('reloadAnnotations', () => {
  annotationManager.loadAnnotations() // Returns Promise, not awaited
})

// ✅ Good - marked async and awaits
onMessage('reloadAnnotations', async () => {
  await annotationManager.loadAnnotations()
})
```

### Sending Before Receiver Ready

The sidebar might not be mounted when content script tries to send:

```typescript
// ❌ Bad - might fail if sidebar not ready
await sendMessage('showAnnotationsFromHighlight', { annotationIds })

// ✅ Good - ensures sidebar is mounted first
if (!host.isMounted.sidebar) {
  await host.mount()
}
await sendMessage('showAnnotationsFromHighlight', { annotationIds })
```

### Circular Message Loops

Don't send a message from a handler for the same message:

```typescript
// ❌ Bad - infinite loop
onMessage('reloadAnnotations', async () => {
  await annotationManager.loadAnnotations()
  await sendMessage('reloadAnnotations', undefined) // Triggers same handler!
})

// ✅ Good - sends different message or breaks loop
onMessage('reloadAnnotations', async () => {
  await annotationManager.loadAnnotations()
  await sendMessage('annotationsReloaded', undefined)
})
```

### Not Catching Errors

Failed messages throw errors:

```typescript
// ❌ Bad - uncaught error crashes app
await sendMessage('showAnnotationsFromHighlight', { annotationIds })

// ✅ Good - handles errors gracefully
try {
  await sendMessage('showAnnotationsFromHighlight', { annotationIds })
}
catch (error) {
  console.error('Failed to show annotations:', error)
  // Show error message to user
}
```

### Modifying Message Data

Don't modify data objects after sending:

```typescript
// ❌ Bad - modifies after sending
const data = { annotationIds: ['ann_1'] }
await sendMessage('showAnnotationsFromHighlight', data)
data.annotationIds.push('ann_2') // Don't do this

// ✅ Good - create new object if needed
const data1 = { annotationIds: ['ann_1'] }
await sendMessage('showAnnotationsFromHighlight', data1)

const data2 = { annotationIds: ['ann_1', 'ann_2'] }
await sendMessage('showAnnotationsFromHighlight', data2)
```

## Adding New Messages

To add a new message type:

1. **Define in ProtocolMap** (`utils/messaging.ts`)

```typescript
interface ProtocolMap {
  // ... existing messages ...

  // Add new message
  highlightAnnotation: (data: { annotationId: string, color: string }) => void
}
```

2. **Send from appropriate context**

```typescript
// In content script or sidebar
await sendMessage('highlightAnnotation', {
  annotationId: 'ann_123',
  color: 'yellow',
})
```

3. **Handle in receiver**

```typescript
// In content script
onMessage('highlightAnnotation', async (message) => {
  const { annotationId, color } = message.data
  annotationManager.setHighlightColor(annotationId, color)
})
```

## Summary

Message passing is the only way to communicate between extension contexts. The `@webext-core/messaging` library provides type-safe communication with compile-time checking.

Key points:

- All messages defined in `utils/messaging.ts` `ProtocolMap`
- Use `sendMessage` to send, `onMessage` to receive
- Always handle errors (receiver might not be ready)
- Don't send high-frequency messages (throttle/debounce)
- Clean up handlers when components unmount
- Debug by checking console in each context separately

For specific message flows, see:

- [Architecture Overview](overview.md) for data flow diagrams
- [AnnotationManager Component](../components/annotation-manager.md) for content script messages
- [Multi-Frame Coordination](multi-frame.md) for cross-frame messages

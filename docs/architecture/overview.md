# Architecture Overview

This document explains how RDA Annotator works at a system level. It covers the overall design, data flow, and key subsystems.

## Table of Contents

- [System Design](#system-design)
- [Data Flow](#data-flow)
- [Core Subsystems](#core-subsystems)
- [Technology Choices](#technology-choices)

## System Design

### Three Separate Contexts

Browser extensions run in three isolated JavaScript contexts. Each context has different capabilities and restrictions.

**1. Background Service Worker**

The background service worker manages extension-wide state. It runs independently of any web page.

File: `entrypoints/background.ts`

Capabilities:

- Access to browser tabs API
- Can intercept and redirect URLs
- Manages extension storage
- Receives messages from content scripts and sidebar

The background worker intercepts PDF URLs and redirects them to the custom PDF.js viewer. It also tracks whether the extension is enabled or disabled using a badge on the extension icon.

**2. Content Scripts**

Content scripts inject into every web page. They run in the page's DOM but in an isolated JavaScript environment.

Files: `entrypoints/content/*.ts`

Capabilities:

- Full access to page DOM
- Can modify page appearance (add highlights)
- Can read page content (for anchoring)
- Cannot access page JavaScript variables
- Cannot access browser extension APIs directly

Content scripts load annotations, convert selectors to DOM positions, and render visual highlights. They handle user interactions like clicking highlights or creating new annotations.

**3. Sidebar**

The sidebar is a React application loaded in an iframe on the side of the page.

Files: `entrypoints/sidebar/*.tsx`, `views/*.tsx`, `components/*.tsx`

Capabilities:

- Full React environment with routing
- Access to extension storage for authentication
- Cannot access page DOM
- Cannot modify page appearance
- Communicates with content scripts only via messages

The sidebar displays annotation details, provides forms for creating annotations, and manages user settings. It's a complete React app with multiple pages (Introduction, Annotations, Create, Settings).

### Why Separate Contexts?

Browser extensions use separate contexts for security. Content scripts cannot access browser APIs, preventing malicious web pages from controlling the browser. The background worker cannot access page content, preventing it from reading sensitive information.

This isolation requires message passing for communication. No context can directly call functions or access variables in another context.

### Communication Between Contexts

All communication happens through the `@webext-core/messaging` library. This provides type-safe message passing.

Example flow when user clicks a highlight:

```
Content Script          Sidebar
     |                    |
     | User clicks        |
     |                    |
     | sendMessage(       |
     |   "showAnnotationsFromHighlight",
     |   { annotationIds: [...] }
     | )                  |
     |                    |
     |------------------->|
     |                    |
     |                onMessage(
     |                  "showAnnotationsFromHighlight",
     |                  handler
     |                )
     |                    |
     |              Display annotations
```

See [Message Passing](message-passing.md) for detailed documentation.

## Data Flow

### Loading Annotations

When a user opens a web page with the extension enabled:

```
1. User opens page
   ↓
2. Content script initializes
   ↓
3. Check extension state (enabled?)
   ↓
4. Query Elasticsearch for annotations by URL
   ↓
5. For each annotation:
   a. Extract selectors (TextQuote, TextPosition, Range)
   b. Try to anchor selectors to DOM ranges
   c. If successful: Create visual highlight
   d. If failed: Mark as orphaned
   ↓
6. Attach event listeners to highlights
   ↓
7. Show highlights when sidebar mounts
```

### Creating Annotations

When a user creates a new annotation:

```
1. User selects text on page
   ↓
2. Click "Annotate" button
   ↓
3. Content script captures Range object
   ↓
4. Generate selectors from Range:
   - TextQuoteSelector (exact text + context)
   - TextPositionSelector (character offsets)
   - RangeSelector (XPath to nodes)
   ↓
5. Create temporary highlight
   ↓
6. Store selectors in session storage
   ↓
7. Open sidebar to Create page
   ↓
8. User fills out form (title, description, tags)
   ↓
9. Submit to API
   ↓
10. Remove temporary highlight
   ↓
11. Reload annotations (permanent highlight appears)
```

### Clicking a Highlight

When a user clicks an existing highlight:

```
1. User clicks highlighted text
   ↓
2. Content script detects click
   ↓
3. Get annotation IDs at click point
   ↓
4. Send "showAnnotationsFromHighlight" message to sidebar
   ↓
5. Sidebar receives message
   ↓
6. Load annotation details from Elasticsearch
   ↓
7. Display in sidebar (title, description, tags, author)
   ↓
8. User can edit or delete annotation
```

## Core Subsystems

### Annotation Management

The `AnnotationManager` class coordinates the complete annotation lifecycle.

File: `entrypoints/content/annotation-manager.ts`

Responsibilities:

- Load annotations from Elasticsearch
- Anchor selectors to DOM ranges
- Create and manage highlights
- Handle user interactions (click, hover)
- Track orphaned annotations
- Support PDF page loading

Key insight: AnnotationManager is instantiated separately in each frame (top-level and nested iframes). Each instance manages annotations only within its own DOM.

See [AnnotationManager Component](../components/annotation-manager.md) for details.

### Anchoring System

The anchoring system converts abstract selectors into concrete DOM positions.

Files: `utils/anchoring/*.ts`

Problem: Annotations are stored as selectors that describe "the text 'Example' with 'this is an ' before it." When loading a page, we need to find that text in the current DOM.

Solution: Use multiple selector strategies in order of robustness:

1. **RangeSelector (XPath)**

   - Most precise: Points directly to DOM nodes
   - Most brittle: Breaks if DOM structure changes

2. **TextPositionSelector (Character offsets)**

   - Medium robustness: Character positions from document start
   - Medium brittleness: Breaks if content before annotation changes

3. **TextQuoteSelector (Exact text + context)**
   - Most robust: Matches exact text with before/after context
   - Works even if DOM structure changes

The system tries each selector in order. Even if RangeSelector or TextPositionSelector succeeds, it validates the result against TextQuoteSelector's exact text. This catches cases where the fast selectors found the wrong location.

If all strategies fail, the annotation is orphaned. Orphaned annotations appear in a separate "Orphaned Annotations" section in the sidebar. This happens when:

- Page content changed significantly
- Annotation was created on temporary content (like search results)
- Selectors were generated incorrectly

See [Anchoring System](anchoring.md) for technical details.

### Multi-Frame Coordination

Web pages often contain nested iframes (embedded content). Each iframe has its own DOM and can contain annotations.

Files: `entrypoints/content/frame-observer.ts`, `entrypoints/content/frame-injector.ts`, `entrypoints/content/host.ts`

Architecture:

- Top-level page = "Host" frame
- Nested iframes = "Guest" frames

The host frame:

- Manages the sidebar
- Observes the page for new iframes
- Injects content scripts into iframes
- Coordinates message passing between guests and sidebar

Guest frames:

- Load and display their own annotations
- Send messages to host (not directly to sidebar)
- Use `window.parent.postMessage()` for cross-frame communication

Example: User clicks highlight in a nested iframe:

```
Guest Frame (iframe)
  ↓
  window.parent.postMessage({ type: "rda:showAnnotations", ... })
  ↓
Host Frame
  ↓
  sendMessage("showAnnotationsFromHighlight", ...)
  ↓
Sidebar
  ↓
  Display annotations
```

This architecture works even when the iframe is cross-origin (different domain than parent page). PostMessage is allowed across origins, but the host validates message types.

See [Multi-Frame Coordination](multi-frame.md) for implementation details.

### PDF Support

Browsers display PDFs using native viewers that don't expose the DOM. The extension cannot inject content scripts or create highlights in native PDF viewers.

Files: `entrypoints/background.ts`, `public/pdfjs/`, `utils/anchoring/pdf.ts`

Solution: Intercept PDF URLs and redirect to custom PDF.js viewer.

Flow:

```
1. User navigates to PDF URL (https://example.com/paper.pdf)
   ↓
2. Background worker detects PDF URL
   ↓
3. Redirect to custom viewer:
   chrome-extension://[id]/pdfjs/web/viewer.html?file=https://example.com/paper.pdf
   ↓
4. PDF.js loads the PDF
   ↓
5. PDF.js renders into:
   - Canvas layers (visual PDF rendering)
   - Text layers (selectable text in HTML)
   ↓
6. Content script can access text layers
   ↓
7. Annotations use page numbers + bounding boxes:
   { page: 5, rects: [{ x: 100, y: 200, width: 300, height: 20 }] }
   ↓
8. Content script renders highlights as overlays on text layer
```

PDF anchoring is different from HTML anchoring. PDF selectors store:

- Page number (which page)
- Bounding rectangles (where on the page)
- Exact text (for validation)

PDF pages load lazily. When a user scrolls to page 10, PDF.js creates the text layer for page 10. The content script watches for new pages using a MutationObserver and re-anchors any placeholders when their pages load.

### Authentication

Users authenticate with ORCID using Keycloak's OAuth2 PKCE (Proof Key for Code Exchange).

Files: `context/authentication.provider.tsx`, `utils/auth-storage.ts`

PKCE is required for browser extensions because they cannot securely store client secrets. The flow:

```
1. User clicks "Login"
   ↓
2. Generate code verifier (random string)
   ↓
3. Generate code challenge (SHA256 hash of verifier)
   ↓
4. Open Keycloak authorization URL in new window (shows ORCID login):
   https://keycloak.example.com/auth?code_challenge=...
   ↓
5. User logs in with ORCID
   ↓
6. Keycloak redirects to callback URL:
   https://example.com/callback?code=AUTH_CODE
   ↓
7. Extension receives redirect (registered in Keycloak)
   ↓
8. Exchange authorization code for tokens:
   POST /token { code, code_verifier }
   ↓
9. Store access token and refresh token in extension storage
   ↓
10. Token stored encrypted by browser
    ↓
11. Use access token for Elasticsearch API requests
```

Tokens expire after a set time (usually 15-30 minutes). The authentication provider automatically refreshes the access token 30 seconds before expiry using the refresh token.

Why 30 seconds before expiry? This buffer prevents race conditions where a token expires between checking validity and making an API request.

The authentication state is global across all tabs through React Context. All sidebar instances share the same tokens stored in extension storage.

### RDA Vocabularies

Annotations include metadata from controlled vocabularies (standardized lists of terms).

Files: `utils/datasources/*.ts`

Vocabularies:

- Working groups (RDA organizational units)
- Interest groups (RDA topic areas)
- Pathways (RDA educational tracks)
- Disciplines (research fields)
- Keywords (tags)
- Languages (content language)
- Resource types (document, dataset, tool, etc.)
- GORC elements (GORC framework components)

Most vocabularies are fetched from external APIs. The data source hooks (`useDataSource`) cache results in React state to avoid repeated API calls.

## Technology Choices

### Why WXT?

WXT is a modern framework for building cross browser extensions. Key advantages:

**Manifest V3 Support**
Manifest V3 is the latest extension standard required by Chrome and Firefox. WXT generates correct manifests automatically.

**Vite-Based Build System**
WXT uses Vite, which provides:

- Fast hot module replacement during development
- Modern JavaScript/TypeScript support
- Optimized production builds
- Easy integration with React and TailwindCSS

**Cross-Browser Compatibility**
WXT handles browser differences automatically. Build once for Chrome, get Firefox builds by changing a flag.

**Auto-Reload During Development**
Changes to code automatically rebuild and reload the extension. This saves significant development time compared to manual reload.

### Why @webext-core/messaging?

The standard browser extension messaging APIs (`chrome.runtime.sendMessage`) are not type-safe:

```typescript
// Standard API - no type checking
chrome.runtime.sendMessage({ action: 'scrolToAnnotation' }) // Typo!
```

`@webext-core/messaging` provides compile-time type safety:

```typescript
// Type-safe - compiler catches typos and wrong types
await sendMessage('scrollToAnnotation', { annotationId: 'ann_123' })
```

All messages are defined in a single `ProtocolMap` interface. TypeScript ensures:

- Message names are spelled correctly
- Required data is included
- Data types are correct
- Return types are known

This catches errors during development instead of production.

### Why Custom PDF.js Viewer?

The extension needs DOM access to create highlights. Native PDF viewers (Chrome's built-in PDF viewer) don't expose the DOM to content scripts.

Solution: Bundle a custom PDF.js viewer that runs as part of the extension. This viewer:

- Renders PDFs into HTML canvas and text layers
- Exposes text layer DOM to content scripts
- Allows the same highlighting code for PDFs and HTML pages

The custom viewer adds significant bundle size (~8 MB) but is necessary for core functionality.

## Summary

RDA Annotator is a browser extension built on modern web technologies. The architecture separates concerns across three contexts (background, content, sidebar) that communicate via type-safe messages.

Key architectural decisions:

- Multiple anchoring strategies for robustness
- Custom PDF.js viewer for PDF support
- Host-guest architecture for multi-frame support
- OAuth2 PKCE for secure authentication
- Strict TypeScript for code safety

For specific implementation details, see:

- [Message Passing](message-passing.md)
- [Anchoring System](anchoring.md)
- [Multi-Frame Coordination](multi-frame.md)
- [AnnotationManager Component](../components/annotation-manager.md)

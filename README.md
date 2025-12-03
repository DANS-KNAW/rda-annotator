# RDA Annotator

RDA Annotator is a cross-browser extension for creating and viewing annotations in web resources. It works on both HTML pages and PDF documents using a robust text anchoring system.

## Key Features

- Create annotations on web pages and PDFs
- View existing annotations with visual highlights
- Multi-frame support for complex pages with iframes
- Keycloak authentication with ORCID
- Elasticsearch backend for annotation storage and search

## Quick Start

### Prerequisites

- Node.js 18 or higher
- pnpm package manager

### Installation

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your Keycloak and API settings

# Start development server
pnpm dev
```

### Environment Variables

Create a `.env` file with these required variables:

```bash
# Keycloak authentication
HOST_PERMISSION=https://keycloak.example.com/*
WXT_KEYCLOAK_URL=https://keycloak.example.com/realms/rda
WXT_KEYCLOAK_CLIENT_ID=rda-tiger-extension

# Backend API
WXT_API_ENDPOINT=http://localhost:3000

# Other configuration
WXT_KNOWLEDGE_BASE_URL=https://kb-rda.org
WXT_ANNOTATOR_VERSION=1.1.6
```

## Services & Libraries

**Keycloak** - OAuth2/PKCE authentication provider. Handles user login and token management for ORCID.

**Elasticsearch** - Backend for annotation storage and search. Annotations are stored as documents with selectors that describe their location.

**PDF.js** - Custom PDF viewer that allows annotations on PDF documents. The extension redirects PDF URLs to a custom viewer.

**@webext-core/messaging** - Type-safe message passing between extension contexts. Provides compile-time safety for cross-context communication.

## Project Structure

```
entrypoints/           Extension entry points
  background.ts        Service worker managing extension state and PDF redirection
  content/             Content scripts injected into web pages
  sidebar/             React application for the sidebar UI

components/            Reusable React UI components

views/                 Page components for sidebar routing

utils/                 Business logic and utilities
  anchoring/           Text and PDF anchoring algorithms
  datasources/         RDA vocabulary fetchers

context/               React Context providers

types/                 TypeScript interfaces

public/                Static assets
```

## Architecture Overview

### Three Extension Contexts

The extension runs in three separate JavaScript contexts that cannot directly share memory or call functions:

**1. Background Service Worker** (`entrypoints/background.ts`)

Manages extension state and handles PDF URL interception. When the extension is enabled and a user navigates to a PDF, the background script redirects to the custom PDF.js viewer. This context has access to browser tabs and storage APIs.

**2. Content Scripts** (`entrypoints/content/`)

Injected into every web page. Content scripts load annotations from Elasticsearch, anchor them to the DOM, and render visual highlights. They handle user interactions like clicking highlights and creating new annotations.

**3. Sidebar** (`entrypoints/sidebar/`)

A React application loaded in an iframe on the side of the page. The sidebar displays annotation details, provides a form for creating annotations, and manages user settings. It communicates with content scripts only via message passing.

### Multi-Frame Support

Web pages often contain nested iframes. The extension handles this with a host-guest architecture:

- The top-level frame is the "host" and manages the sidebar
- Nested iframes are "guests" that detect annotations in their own DOM
- Guest frames send messages to the host when users interact with highlights
- The host forwards messages to the sidebar

This approach works even when iframes load content from different domains.

### Text Anchoring System

Annotations are stored as abstract "selectors" that describe where the annotation should appear. When loading a page, the extension converts these selectors into concrete DOM ranges.

The system uses multiple strategies:

1. **TextQuoteSelector** - Matches exact text with context
2. **TextPositionSelector** - Character offsets from document start
3. **RangeSelector** - XPath to DOM nodes

The extension tries each strategy in order until one succeeds. If all strategies fail, the annotation is marked as "orphaned" and shown in a separate section.

### PDF Support

The extension cannot annotate native PDF viewers because they don't expose the DOM. Instead:

1. Background script intercepts PDF URLs when extension is enabled
2. Redirects to custom PDF.js viewer: `pdfjs/web/viewer.html?file=[pdfUrl]`
3. PDF.js renders the PDF into HTML canvas and text layers
4. Annotations use page numbers and bounding boxes for positioning
5. Content script translates these to visual highlights

### Authentication

Users authenticate with Keycloak using the OAuth2 PKCE flow. The authentication provider:

- Opens Keycloak ORCID login in a new window
- Exchanges authorization code for access and refresh tokens
- Stores tokens in extension storage (encrypted by browser)
- Automatically refreshes access tokens 30 seconds before expiry
- Provides authentication state to the sidebar via React Context

## Development Workflow

### Type Checking

The project uses strict TypeScript. Run type checking before committing:

```bash
pnpm compile
```

At this point in time there is no test framework configured. Type checking and manual testing are the primary quality assurance methods.

### Building

Build for production:

```bash
# Build for Chrome/Edge
pnpm build
pnpm zip

# Build for Firefox
pnpm build:firefox
pnpm zip:firefox
```

The build process creates a `.zip` file ready for distribution.

### Development Tips

- WXT provides hot module replacement. Changes to code automatically reload the extension.
- Check the browser's developer tools for each context separately:
  - Background: Right-click extension icon → Manage Extension → Service Worker
  - Content script: Regular page DevTools console
  - Sidebar: Right-click sidebar → Inspect
- Console logs use prefixes like `[RDA Background]` and `[RDA Content]` to identify the context

## Browser Support

**Primary:** Chrome and Edge (Chromium-based browsers)

The extension is built and tested primarily on Chromium browsers.

**Secondary:** Firefox

Firefox requires separate testing as there could be edge cases that are unsupported.

## Documentation

For detailed information about the architecture and components:

- [Architecture Overview](docs/architecture/overview.md) - System design and data flow
- [Message Passing](docs/architecture/message-passing.md) - Type-safe communication patterns
- [Anchoring System](docs/architecture/anchoring.md) - How text anchoring works
- [Multi-Frame Coordination](docs/architecture/multi-frame.md) - Supporting complex pages with iframes
- [AnnotationManager Component](docs/components/annotation-manager.md) - Core annotation lifecycle management
- [Highlighter Component](docs/components/highlighter.md) - Visual highlight rendering
- [Authentication](docs/components/authentication.md) - Keycloak OAuth flow

## Contributing

When contributing to this project:

1. Run `pnpm compile` before committing.
2. Use the existing code organization patterns. UI code belongs in `components/` or `views/`, business logic in `utils/`.
3. Follow the message passing protocol defined in `utils/messaging.ts`. Add new messages by extending the `ProtocolMap` interface.
4. Test in both Chrome and Firefox if your changes affect extension APIs.

## License

MIT

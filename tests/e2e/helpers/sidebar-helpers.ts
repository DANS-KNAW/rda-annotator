/**
 * Sidebar interaction helpers for E2E tests.
 * Provides utilities for text selection, popup interaction, and sidebar navigation.
 */

import type { BrowserContext, Frame, Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Select text on the page by dragging mouse over an element
 * and click the annotation popup to open the sidebar
 */
export async function selectTextAndOpenPopup(
  page: Page,
  selector: string = 'h1',
): Promise<void> {
  const element = await page.locator(selector).boundingBox()
  if (!element) {
    throw new Error(`Element not found: ${selector}`)
  }

  // Use triple-click to select the entire element text (more reliable than drag)
  await page.locator(selector).click({ clickCount: 3 })

  // Wait for selection to register
  await page.waitForTimeout(500)

  // Find and click the annotation popup
  const popupBox = await page.evaluate(() => {
    const popup = document.querySelector('rda-annotator-popup')
    if (!popup)
      return null
    const rect = popup.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  })

  if (!popupBox || popupBox.width === 0) {
    throw new Error('Annotation popup not found or not visible after text selection')
  }

  // Click the center of the popup
  await page.mouse.click(
    popupBox.x + popupBox.width / 2,
    popupBox.y + popupBox.height / 2,
  )

  // Wait for sidebar to open and render
  await page.waitForTimeout(1500)
}

/**
 * Get the sidebar iframe Frame object
 */
export async function getSidebarFrame(page: Page): Promise<Frame> {
  // Wait a moment for frames to be available
  await page.waitForTimeout(500)

  const sidebarFrame = page.frames().find(f => f.url().includes('sidebar.html'))
  if (!sidebarFrame) {
    throw new Error('Sidebar iframe not found. Is the extension enabled and sidebar opened?')
  }
  return sidebarFrame
}

/**
 * Wait for the Create Annotation form to be visible
 */
export async function waitForCreateForm(sidebarFrame: Frame): Promise<void> {
  const createHeading = sidebarFrame.getByRole('heading', { name: 'Create Annotation' })
  await createHeading.waitFor({ state: 'visible', timeout: 10000 })
}

/**
 * Wait for the Annotations list view to be visible
 */
export async function waitForAnnotationsList(sidebarFrame: Frame): Promise<void> {
  const annotationsHeading = sidebarFrame.getByRole('heading', { name: 'Annotations' })
  await annotationsHeading.waitFor({ state: 'visible', timeout: 10000 })
}

/**
 * Submit the annotation form
 */
export async function submitForm(sidebarFrame: Frame, page: Page): Promise<void> {
  // Close any open dropdowns first
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  const submitButton = sidebarFrame.locator('button[type="submit"]')
  // Use force click to avoid form interception issues
  await submitButton.click({ force: true })

  // Wait for form submission and potential redirect
  await page.waitForTimeout(2000)
}

/**
 * Click the cancel button on the form
 */
export async function cancelForm(sidebarFrame: Frame, page: Page): Promise<void> {
  const cancelButton = sidebarFrame.getByRole('button', { name: 'Cancel' })
  await cancelButton.click()

  // Wait for navigation
  await page.waitForTimeout(1000)
}

/**
 * Navigate to the Annotations list view using the tab/navigation
 */
export async function navigateToAnnotationsList(sidebarFrame: Frame, page: Page): Promise<void> {
  // Try clicking the "Page Annotations" tab
  const annotationsTab = sidebarFrame.getByText('Page Annotations')
  const isTabVisible = await annotationsTab.isVisible().catch(() => false)

  if (isTabVisible) {
    await annotationsTab.click()
    await page.waitForTimeout(500)
  }
}

/**
 * Verify an annotation appears in the list.
 * The list shows fragment text, not title, so we search for the fragment.
 * Pass the fragment text (e.g., "Example Domain") to verify.
 * Checks both "Page Annotations" and "My Annotations" tabs.
 */
export async function verifyAnnotationInList(
  sidebarFrame: Frame,
  fragmentOrText: string,
  timeout: number = 5000,
): Promise<boolean> {
  // First check in current view (Page Annotations)
  try {
    const annotationCard = sidebarFrame.getByText(fragmentOrText)
    await annotationCard.waitFor({ state: 'visible', timeout })
    return true
  }
  catch {
    // Not found in Page Annotations, try My Annotations tab
    try {
      const myAnnotationsTab = sidebarFrame.getByText('My Annotations')
      if (await myAnnotationsTab.isVisible()) {
        await myAnnotationsTab.click()
        // Wait for tab content to load
        await sidebarFrame.page().waitForTimeout(500)

        const annotationCard = sidebarFrame.getByText(fragmentOrText)
        await annotationCard.waitFor({ state: 'visible', timeout })
        return true
      }
    }
    catch {
      // Still not found
    }
    return false
  }
}

/**
 * Check if an error alert is visible in the sidebar
 */
export async function isErrorAlertVisible(sidebarFrame: Frame): Promise<boolean> {
  const errorAlert = sidebarFrame.getByRole('alert')
  return errorAlert.isVisible().catch(() => false)
}

/**
 * Get the text content of any visible error alert
 */
export async function getErrorAlertText(sidebarFrame: Frame): Promise<string | null> {
  const errorAlert = sidebarFrame.getByRole('alert')
  const isVisible = await errorAlert.isVisible().catch(() => false)
  if (!isVisible)
    return null
  return errorAlert.textContent()
}

/**
 * Check if the annotated fragment textarea has the expected text
 */
export async function getAnnotatedFragmentText(sidebarFrame: Frame): Promise<string> {
  const fragmentTextarea = sidebarFrame.locator('#selectedText-textarea')
  return fragmentTextarea.inputValue()
}

/**
 * Check if a temporary highlight exists on the page
 */
export async function hasTemporaryHighlight(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return document.querySelector('rda-highlight') !== null
  })
}

/**
 * Open the sidebar if it's closed (by adding the 'open' class)
 */
export async function openSidebarIfClosed(page: Page): Promise<void> {
  const sidebarState = await page.evaluate(() => {
    const sidebar = document.querySelector('rda-annotator-sidebar')
    if (!sidebar)
      return { exists: false, isOpen: false }
    return {
      exists: true,
      isOpen: sidebar.classList.contains('open'),
    }
  })

  if (sidebarState.exists && !sidebarState.isOpen) {
    await page.evaluate(() => {
      const sidebar = document.querySelector('rda-annotator-sidebar')
      if (sidebar) {
        sidebar.classList.add('open')
      }
    })
    await page.waitForTimeout(1000)
  }
}

/**
 * Take a screenshot with browser name prefix
 */
export async function takeScreenshot(
  page: Page,
  browserName: string,
  name: string,
): Promise<void> {
  await page.screenshot({
    path: `test-results/${browserName}-${name}.png`,
  })
}

/**
 * Check if there are any orphaned annotations in the sidebar.
 * Orphaned annotations show "Orphaned Annotation" label in their card.
 */
export async function hasOrphanedAnnotations(sidebarFrame: Frame): Promise<boolean> {
  const orphanedLabel = sidebarFrame.getByText('Orphaned Annotation')
  return orphanedLabel.isVisible().catch(() => false)
}

/**
 * Count the number of orphaned annotations in the sidebar
 */
export async function countOrphanedAnnotations(sidebarFrame: Frame): Promise<number> {
  const orphanedLabels = sidebarFrame.locator('text=Orphaned Annotation')
  return orphanedLabels.count()
}

/**
 * Check if a permanent (non-temporary) highlight exists on the page.
 * Temporary highlights have ID "temporary", permanent ones have annotation IDs.
 */
export async function hasPermanentHighlight(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const highlights = document.querySelectorAll('rda-highlight')
    for (const highlight of highlights) {
      const dataId = highlight.getAttribute('data-annotation-id')
      // Permanent highlights have a non-temporary ID (usually mock-uuid-*)
      if (dataId && dataId !== 'temporary') {
        return true
      }
    }
    return false
  })
}

/**
 * Get all highlight IDs on the page
 */
export async function getHighlightIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const highlights = document.querySelectorAll('rda-highlight')
    const ids: string[] = []
    for (const highlight of highlights) {
      const dataId = highlight.getAttribute('data-annotation-id')
      if (dataId) {
        ids.push(dataId)
      }
    }
    return ids
  })
}

/**
 * Count the number of highlights on the page (excluding temporary)
 */
export async function countPermanentHighlights(page: Page): Promise<number> {
  return page.evaluate(() => {
    const highlights = document.querySelectorAll('rda-highlight')
    let count = 0
    for (const highlight of highlights) {
      const dataId = highlight.getAttribute('data-annotation-id')
      if (dataId && dataId !== 'temporary') {
        count++
      }
    }
    return count
  })
}

/**
 * Wait for annotations to be loaded and anchored (or orphaned).
 * Returns when no more pending status.
 */
export async function waitForAnnotationsToAnchor(
  page: Page,
  timeout: number = 10000,
): Promise<void> {
  // Wait for permanent highlights to appear or timeout
  // Permanent highlights have data-annotation-id that is not 'temporary'
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    const hasPermanentHighlight = await page.evaluate(() => {
      const highlights = document.querySelectorAll('rda-highlight')
      for (const highlight of highlights) {
        const dataId = highlight.getAttribute('data-annotation-id')
        if (dataId && dataId !== 'temporary') {
          return true
        }
      }
      return false
    })
    if (hasPermanentHighlight) {
      // Give a bit more time for all annotations to anchor
      await page.waitForTimeout(1000)
      return
    }
    await page.waitForTimeout(200)
  }
}

// ─── Firefox extension page navigation ─────────────────────────────────

/**
 * Navigate to a PDF in Firefox for E2E testing.
 *
 * Two Playwright/Firefox limitations prevent direct navigation:
 * 1. Playwright's Juggler protocol cannot navigate to moz-extension:// URLs
 *    (lifecycle events never fire, corrupting the page object).
 *    See: https://github.com/microsoft/playwright/issues/3792
 * 2. Playwright's Juggler treats PDF responses as downloads, so page.goto()
 *    to a PDF URL throws "Download is starting" instead of loading the viewer.
 *
 * Workaround: serve the extension's PDF.js viewer at a regular HTTP URL using
 * page.route(). The viewer HTML and assets are served from the extension build
 * output. PDF.js fetches the PDF via a CORS-bypassing proxy route. The content
 * script injects via the manifest's content_scripts (URL matches all HTTP URLs).
 * getDocumentURL() extracts the original PDF URL from the ?file= parameter.
 *
 * @param context - Playwright browser context (unused, kept for API compat)
 * @param page - Playwright page to navigate
 * @param extensionId - Firefox extension internal UUID (unused in this approach)
 * @param pdfUrl - URL of the PDF file to open
 * @returns The same page, now showing the PDF.js viewer
 */
export async function navigateToPDFViewerFirefox(
  context: BrowserContext,
  page: Page,
  extensionId: string,
  pdfUrl: string,
): Promise<Page> {
  const extensionPath = path.join(__dirname, '../../../.output/firefox-mv3')

  // Disable pdfjs-init.js to prevent double content script injection.
  // The content script is already injected via the manifest's content_scripts
  // (URL matches *://*/*). pdfjs-init.js is only needed in the extension's own
  // moz-extension:// viewer where manifest injection doesn't apply.
  await page.route('**/pdfjs/pdfjs-init.js', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: '// Disabled for E2E testing — content script injected via manifest',
    })
  })

  // Serve PDF.js viewer and build assets from the extension build output.
  // This includes viewer.html, viewer.mjs, viewer.css, pdf.mjs, pdf.worker.mjs,
  // cmaps, locale files, images, and standard fonts.
  //
  // viewer.mjs is patched to allow cross-origin PDF loading: the PDF.js viewer
  // validates that the PDF file's origin matches the viewer's origin, but we serve
  // the viewer from localhost while the PDF is on adobe.com. Adding localhost to
  // HOSTED_VIEWER_ORIGINS bypasses this check.
  await page.route('http://localhost:3001/pdfjs/**', async (route) => {
    const urlPath = new URL(route.request().url()).pathname
    const filePath = path.join(extensionPath, urlPath)

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      await route.continue()
      return
    }

    // Patch viewer.mjs to allow cross-origin PDF URLs
    if (urlPath.endsWith('/viewer.mjs')) {
      let content = fs.readFileSync(filePath, 'utf-8')
      content = content.replace(
        'const HOSTED_VIEWER_ORIGINS = ["null", "http://mozilla.github.io", "https://mozilla.github.io"]',
        'const HOSTED_VIEWER_ORIGINS = ["null", "http://mozilla.github.io", "https://mozilla.github.io", "http://localhost", "http://localhost:3001"]',
      )
      await route.fulfill({
        contentType: 'application/javascript',
        body: content,
      })
      return
    }

    await route.fulfill({ path: filePath })
  })

  // Proxy the PDF URL to bypass CORS restrictions.
  // PDF.js needs to fetch the PDF from the original server, but cross-origin
  // requests from localhost would be blocked without CORS headers.
  await page.route(pdfUrl, async (route) => {
    const response = await route.fetch()
    await route.fulfill({ response })
  })

  // Navigate to the viewer at a regular HTTP URL.
  // The ?file= parameter tells both PDF.js and getDocumentURL() the original
  // PDF URL, so annotations are created/searched for the correct URL.
  const viewerUrl = `http://localhost:3001/pdfjs/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`
  await page.goto(viewerUrl, { timeout: 30000 })

  return page
}

// ─── PDF-specific helpers ──────────────────────────────────────────────

/**
 * Wait for the PDF.js viewer to be ready (PDFViewerApplication initialized
 * and document loaded).
 */
export async function waitForPDFViewerReady(
  page: Page,
  timeout: number = 30000,
): Promise<void> {
  await page.waitForFunction(
    () => {
      const app = (window as any).PDFViewerApplication
      return app && app.pdfDocument && app.pdfViewer && app.pdfViewer.pagesCount > 0
    },
    { timeout },
  )
}

/**
 * Get the total number of pages in the PDF.
 */
export async function getPDFPageCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const app = (window as any).PDFViewerApplication
    return app?.pdfViewer?.pagesCount ?? 0
  })
}

/**
 * Scroll to a specific PDF page using the PDF.js viewer API.
 * @param page - Playwright page
 * @param pageNumber - 1-based page number
 */
export async function scrollToPDFPage(
  page: Page,
  pageNumber: number,
): Promise<void> {
  await page.evaluate((pn) => {
    const app = (window as any).PDFViewerApplication
    if (app?.pdfViewer) {
      app.pdfViewer.scrollPageIntoView({ pageNumber: pn })
    }
  }, pageNumber)
  // Wait for scroll and rendering to settle
  await page.waitForTimeout(1000)
}

/**
 * Wait for a specific PDF page's text layer to be rendered.
 * @param page - Playwright page
 * @param pageNumber - 1-based page number
 * @param timeout - Maximum wait time in ms
 */
export async function waitForPDFTextLayer(
  page: Page,
  pageNumber: number,
  timeout: number = 15000,
): Promise<void> {
  await page.waitForFunction(
    (pn) => {
      const pageDiv = document.querySelector(`.page[data-page-number="${pn}"]`)
      if (!pageDiv)
        return false
      const textLayer = pageDiv.querySelector('.textLayer')
      if (!textLayer)
        return false
      // Check that text layer has content (spans with text)
      return textLayer.querySelectorAll('span').length > 0
    },
    pageNumber,
    { timeout },
  )
}

/**
 * Select text on a specific PDF page by triple-clicking a text span.
 * This selects the text within one text span element.
 * @param page - Playwright page
 * @param pageNumber - 1-based page number
 * @param spanIndex - Index of the span to select within the text layer (default: 0)
 */
export async function selectPDFText(
  page: Page,
  pageNumber: number,
  spanIndex: number = 0,
): Promise<void> {
  const selector = `.page[data-page-number="${pageNumber}"] .textLayer span`
  const spans = page.locator(selector)
  const count = await spans.count()

  if (count === 0) {
    throw new Error(`No text spans found on PDF page ${pageNumber}`)
  }

  const targetIndex = Math.min(spanIndex, count - 1)
  const targetSpan = spans.nth(targetIndex)

  // Scroll span into view and triple-click to select
  await targetSpan.scrollIntoViewIfNeeded()
  await targetSpan.click({ clickCount: 3 })

  // Wait for selection to register
  await page.waitForTimeout(500)
}

/**
 * Select text and open the annotation popup in a PDF page.
 * Combines scrolling, text selection, and popup clicking.
 * @param page - Playwright page
 * @param pageNumber - 1-based page number
 * @param spanIndex - Index of the span to select (default: 0)
 */
export async function selectPDFTextAndOpenPopup(
  page: Page,
  pageNumber: number,
  spanIndex: number = 0,
): Promise<void> {
  // Scroll to page and wait for text layer
  await scrollToPDFPage(page, pageNumber)
  await waitForPDFTextLayer(page, pageNumber)

  // Select text
  await selectPDFText(page, pageNumber, spanIndex)

  // Find and click the annotation popup
  const popupBox = await page.evaluate(() => {
    const popup = document.querySelector('rda-annotator-popup')
    if (!popup)
      return null
    const rect = popup.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  })

  if (!popupBox || popupBox.width === 0) {
    throw new Error('Annotation popup not found after PDF text selection')
  }

  await page.mouse.click(
    popupBox.x + popupBox.width / 2,
    popupBox.y + popupBox.height / 2,
  )

  // Wait for sidebar to open and render
  await page.waitForTimeout(1500)
}

/**
 * Check if a specific PDF page has highlight elements in the DOM.
 * @param page - Playwright page
 * @param pageNumber - 1-based page number
 */
export async function pageHasHighlight(
  page: Page,
  pageNumber: number,
): Promise<boolean> {
  return page.evaluate((pn) => {
    const pageDiv = document.querySelector(`.page[data-page-number="${pn}"]`)
    if (!pageDiv)
      return false
    const highlights = pageDiv.querySelectorAll('rda-highlight')
    for (const highlight of highlights) {
      const dataId = highlight.getAttribute('data-annotation-id')
      if (dataId && dataId !== 'temporary') {
        return true
      }
    }
    return false
  }, pageNumber)
}

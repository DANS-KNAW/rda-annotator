/**
 * E2E tests for PDF annotation anchoring across multiple pages.
 *
 * Verifies that annotations created on different pages of a multi-page PDF
 * are properly anchored and have working highlights in the DOM.
 *
 * PDF.js uses virtualized rendering - only visible pages have their text layer
 * rendered. This test ensures annotations on both near and distant pages work
 * correctly, including event-driven re-anchoring when pages render on scroll.
 *
 * Test PDF: Adobe sample PDF (4 pages)
 * https://www.adobe.com/support/products/enterprise/knowledgecenter/media/c4611_sample_explain.pdf
 */

import type { Server } from 'node:http'
import {
  clearCreatedAnnotations,
  enableExtension,
  expect,
  injectMockAuth,
  startMockServer,
  stopMockServer,
  test,
} from './fixtures'
import { fillRequiredFields } from './helpers/form-helpers'
import {
  countOrphanedAnnotations,
  getPDFPageCount,
  getSidebarFrame,
  navigateToPDFViewerFirefox,
  pageHasHighlight,
  scrollToPDFPage,
  selectPDFTextAndOpenPopup,
  submitForm,
  takeScreenshot,
  waitForAnnotationsList,
  waitForCreateForm,
  waitForPDFTextLayer,
  waitForPDFViewerReady,
} from './helpers/sidebar-helpers'

const PDF_URL = 'https://www.adobe.com/support/products/enterprise/knowledgecenter/media/c4611_sample_explain.pdf'

test.describe('PDF Annotation', () => {
  let mockServer: Server

  test.beforeAll(async () => {
    mockServer = await startMockServer({ port: 3001 })
  })

  test.afterAll(async () => {
    if (mockServer) {
      await stopMockServer(mockServer)
    }
  })

  test.beforeEach(() => {
    clearCreatedAnnotations()
  })

  test('annotations on first and last PDF pages should have highlights in DOM', async ({
    context,
    extensionId,
    browserName,
  }) => {
    // PDF loading and annotation creation can take time
    test.setTimeout(60000)

    let page = await context.newPage()

    await enableExtension(context, browserName)
    await injectMockAuth(context, browserName)

    // Navigate to the extension's PDF viewer URL (browser-specific)
    if (browserName === 'firefox') {
      // Firefox: page.goto(moz-extension://...) never resolves in Playwright.
      // Open viewer via window.open() from an extension iframe context instead.
      page = await navigateToPDFViewerFirefox(context, page, extensionId, PDF_URL)
    }
    else {
      const viewerUrl = `chrome-extension://${extensionId}/pdfjs/web/viewer.html?file=${encodeURIComponent(PDF_URL)}`
      await page.goto(viewerUrl, { waitUntil: 'commit', timeout: 10000 })
    }

    // Wait for extension content script to inject
    await page.waitForSelector('[data-rda-injected]', { state: 'attached', timeout: 15000 })

    // Wait for PDF.js to fully load the document
    await waitForPDFViewerReady(page)

    const totalPages = await getPDFPageCount(page)
    expect(totalPages, 'PDF should have multiple pages').toBeGreaterThan(1)

    await takeScreenshot(page, browserName, 'pdf-loaded')

    // ── Annotation 1: First page ──────────────────────────────────

    // Wait for page 1 text layer and select text
    await waitForPDFTextLayer(page, 1)
    await selectPDFTextAndOpenPopup(page, 1)

    let sidebarFrame = await getSidebarFrame(page)
    await waitForCreateForm(sidebarFrame)

    await fillRequiredFields(
      sidebarFrame,
      page,
      'PDF Page 1 Annotation',
      { selectByLabel: 'English' },
      { selectByLabel: 'Other' },
    )

    await submitForm(sidebarFrame, page)
    await waitForAnnotationsList(sidebarFrame)

    await takeScreenshot(page, browserName, 'pdf-page1-annotated')

    // ── Annotation 2: Last page ───────────────────────────────────

    // Scroll to the last page
    await scrollToPDFPage(page, totalPages)
    await waitForPDFTextLayer(page, totalPages)

    await takeScreenshot(page, browserName, 'pdf-last-page-loaded')

    await selectPDFTextAndOpenPopup(page, totalPages)

    sidebarFrame = await getSidebarFrame(page)
    await waitForCreateForm(sidebarFrame)

    await fillRequiredFields(
      sidebarFrame,
      page,
      'PDF Last Page Annotation',
      { selectByLabel: 'English' },
      { selectByLabel: 'Other' },
    )

    await submitForm(sidebarFrame, page)
    await waitForAnnotationsList(sidebarFrame)

    await takeScreenshot(page, browserName, 'pdf-last-page-annotated')

    // ── Verify highlights ─────────────────────────────────────────

    // Give time for annotations to reload and anchor
    await page.waitForTimeout(3000)

    // Check last page highlight (we're already on the last page)
    await scrollToPDFPage(page, totalPages)
    await waitForPDFTextLayer(page, totalPages)
    // Wait for anchoring to complete on this page
    await page.waitForTimeout(2000)

    const lastPageHasHighlight = await pageHasHighlight(page, totalPages)
    expect(
      lastPageHasHighlight,
      `Last page (${totalPages}) should have a highlight in the DOM`,
    ).toBe(true)

    await takeScreenshot(page, browserName, 'pdf-last-page-highlight')

    // Scroll to page 1 and verify its highlight
    await scrollToPDFPage(page, 1)
    await waitForPDFTextLayer(page, 1)
    // Wait for event-driven re-anchoring after scroll
    await page.waitForTimeout(2000)

    const firstPageHasHighlight = await pageHasHighlight(page, 1)
    expect(
      firstPageHasHighlight,
      'First page should have a highlight in the DOM',
    ).toBe(true)

    await takeScreenshot(page, browserName, 'pdf-page1-highlight')

    // Verify no orphaned annotations
    sidebarFrame = await getSidebarFrame(page)
    const orphanedCount = await countOrphanedAnnotations(sidebarFrame)
    expect(
      orphanedCount,
      'No annotations should be orphaned',
    ).toBe(0)

    await takeScreenshot(page, browserName, 'pdf-annotation-complete')
  })
})

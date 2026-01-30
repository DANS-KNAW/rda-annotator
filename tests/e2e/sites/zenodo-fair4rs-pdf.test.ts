/**
 * Site-specific E2E test: Zenodo – FAIR4RS Principles PDF
 *
 * Tests annotation of a PDF document hosted on Zenodo. PDFs are rendered
 * via the extension's built-in PDF.js viewer, requiring browser-specific
 * navigation and PDF-specific text selection helpers.
 *
 * @external This test depends on https://zenodo.org being accessible.
 * It may fail if the external site is down, the PDF has been removed,
 * or is unreachable from the test environment.
 *
 * Run separately with: pnpm test:e2e:sites
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
} from '../fixtures'
import { fillRequiredFields } from '../helpers/form-helpers'
import {
  getSidebarFrame,
  hasPermanentHighlight,
  navigateToPDFViewerFirefox,
  selectPDFTextAndOpenPopup,
  submitForm,
  takeScreenshot,
  waitForAnnotationsList,
  waitForCreateForm,
  waitForPDFViewerReady,
} from '../helpers/sidebar-helpers'

const PDF_URL = 'https://zenodo.org/records/6623556/files/FAIR4RS%20Principles%20Final%20Recommendation%20Zenodo.pdf'

test.describe('Zenodo FAIR4RS PDF', () => {
  let mockServer: Server

  test.beforeAll(async () => {
    mockServer = await startMockServer({ port: 3001 })
  })

  test.afterAll(async () => {
    if (mockServer) {
      await stopMockServer(mockServer)
    }
  })

  test('annotate text in Zenodo FAIR4RS PDF', async ({
    context,
    extensionId,
    browserName,
  }) => {
    test.setTimeout(90000)

    clearCreatedAnnotations()

    await enableExtension(context, browserName)
    await injectMockAuth(context, browserName)

    let page = await context.newPage()

    // Navigate to the extension's PDF viewer (browser-specific)
    if (browserName === 'firefox') {
      page = await navigateToPDFViewerFirefox(context, page, extensionId, PDF_URL)
    }
    else {
      const viewerUrl = `chrome-extension://${extensionId}/pdfjs/web/viewer.html?file=${encodeURIComponent(PDF_URL)}`
      await page.goto(viewerUrl, { waitUntil: 'commit', timeout: 30000 })
    }

    // Wait for content script injection
    await page.waitForSelector('[data-rda-injected]', {
      state: 'attached',
      timeout: 15000,
    })

    // Wait for PDF.js to fully load the document
    await waitForPDFViewerReady(page, 60000)

    await takeScreenshot(page, browserName, 'zenodo-fair4rs-pdf-loaded')

    // Select text on the first page and open annotation popup
    await selectPDFTextAndOpenPopup(page, 1)

    const sidebarFrame = await getSidebarFrame(page)
    await waitForCreateForm(sidebarFrame)

    await takeScreenshot(page, browserName, 'zenodo-fair4rs-pdf-create-form')

    // Fill required fields and submit
    await fillRequiredFields(
      sidebarFrame,
      page,
      'Zenodo FAIR4RS PDF Test',
      { selectByLabel: 'English' },
      { selectByLabel: 'Other' },
    )

    await takeScreenshot(page, browserName, 'zenodo-fair4rs-pdf-form-filled')

    await submitForm(sidebarFrame, page)
    await waitForAnnotationsList(sidebarFrame)

    // Verify highlight exists on page
    const highlightExists = await hasPermanentHighlight(page)
    expect(highlightExists, 'Permanent highlight should exist after submission').toBe(true)

    await takeScreenshot(page, browserName, 'zenodo-fair4rs-pdf-annotated')

    await page.close()
  })
})

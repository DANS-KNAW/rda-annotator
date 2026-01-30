/**
 * Reusable annotation flow for site-specific E2E tests.
 *
 * Encapsulates the full annotation lifecycle:
 * navigate → select text → open popup → sidebar → form → submit → verify
 * Then reload → verify persistence.
 *
 * Site tests provide a URL, a text selection callback, and expected fragment.
 * This helper handles the common steps.
 */

import type { BrowserContext, Frame, Page } from '@playwright/test'
import {
  clearCreatedAnnotations,
  enableExtension,
  expect,
  injectMockAuth,
} from '../fixtures'
import { fillRequiredFields } from './form-helpers'
import {
  getAnnotatedFragmentText,
  getSidebarFrame,
  hasPermanentHighlight,
  openSidebarIfClosed,
  submitForm,
  takeScreenshot,
  verifyAnnotationInList,
  waitForAnnotationsList,
  waitForAnnotationsToAnchor,
  waitForCreateForm,
} from './sidebar-helpers'

/**
 * Configuration for a site-specific annotation test.
 */
export interface SiteAnnotationConfig {
  /** URL of the page to annotate */
  url: string
  /** Human-readable name used in screenshot filenames */
  name: string
  /**
   * Site-specific callback to select text on the page.
   * Called after navigation and content script injection.
   * Must select text so the annotation popup appears.
   */
  selectText: (page: Page) => Promise<void>
  /** Expected substring in the annotated fragment textarea */
  expectedFragment: string
  /** Title for the test annotation */
  annotationTitle: string
  /** Timeout for page navigation (default: 30000) */
  navigationTimeout?: number
  /** Timeout for content script injection (default: 15000) */
  injectionTimeout?: number
}

/**
 * Run the full annotation flow on a real external site and verify:
 * 1. Annotation can be created (highlight + sidebar)
 * 2. Highlight persists after page reload
 * 3. Annotation still shows in sidebar after reload
 *
 * Returns the page and sidebar frame for additional assertions.
 */
export async function runSiteAnnotationTest(
  context: BrowserContext,
  browserName: string,
  config: SiteAnnotationConfig,
): Promise<{ page: Page, sidebarFrame: Frame }> {
  const {
    url,
    name,
    selectText,
    expectedFragment,
    annotationTitle,
    navigationTimeout = 30000,
    injectionTimeout = 15000,
  } = config

  clearCreatedAnnotations()

  // Step 1: Enable extension and inject mock auth
  await enableExtension(context, browserName)
  await injectMockAuth(context, browserName)

  // Step 2: Navigate to the target URL
  const page = await context.newPage()
  await page.goto(url, { timeout: navigationTimeout, waitUntil: 'domcontentloaded' })

  // Step 3: Wait for content script injection
  await page.waitForSelector('[data-rda-injected]', {
    state: 'attached',
    timeout: injectionTimeout,
  })

  await takeScreenshot(page, browserName, `${name}-page-loaded`)

  // Step 4: Execute site-specific text selection
  await selectText(page)

  // Step 5: Wait for and click the annotation popup
  await page.waitForTimeout(500)

  const popupBox = await page.evaluate(() => {
    const popup = document.querySelector('rda-annotator-popup')
    if (!popup)
      return null
    const rect = popup.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  })

  if (!popupBox || popupBox.width === 0) {
    await takeScreenshot(page, browserName, `${name}-popup-not-found`)
    throw new Error(`Annotation popup not found on ${url} after text selection`)
  }

  await page.mouse.click(
    popupBox.x + popupBox.width / 2,
    popupBox.y + popupBox.height / 2,
  )

  // Wait for sidebar to open and render
  await page.waitForTimeout(1500)

  // Step 6: Get sidebar and wait for Create form
  const sidebarFrame = await getSidebarFrame(page)
  await waitForCreateForm(sidebarFrame)

  await takeScreenshot(page, browserName, `${name}-create-form`)

  // Step 7: Verify fragment textarea contains expected text
  const fragment = await getAnnotatedFragmentText(sidebarFrame)
  expect(
    fragment,
    `Fragment should contain "${expectedFragment}"`,
  ).toContain(expectedFragment)

  // Step 8: Fill required fields and submit
  await fillRequiredFields(sidebarFrame, page, annotationTitle)

  await takeScreenshot(page, browserName, `${name}-form-filled`)

  await submitForm(sidebarFrame, page)

  await takeScreenshot(page, browserName, `${name}-after-submit`)

  // Step 9: Verify redirect to annotations list
  await waitForAnnotationsList(sidebarFrame)

  // Step 10: Verify highlight exists on page
  const highlightExists = await hasPermanentHighlight(page)
  expect(highlightExists, 'Permanent highlight should exist after submission').toBe(true)

  // Step 11: Verify annotation shows in sidebar
  const isInList = await verifyAnnotationInList(sidebarFrame, expectedFragment)
  expect(isInList, 'Annotation should appear in the sidebar list').toBe(true)

  await takeScreenshot(page, browserName, `${name}-annotation-created`)

  // Step 12: Reload the page
  await page.reload({ timeout: navigationTimeout, waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-rda-injected]', {
    state: 'attached',
    timeout: injectionTimeout,
  })

  // Step 13: Verify highlight persists after reload
  await waitForAnnotationsToAnchor(page, 15000)

  const highlightAfterReload = await hasPermanentHighlight(page)
  expect(highlightAfterReload, 'Highlight should persist after page reload').toBe(true)

  await takeScreenshot(page, browserName, `${name}-after-reload-highlight`)

  // Step 14: Verify annotation still shows in sidebar
  await openSidebarIfClosed(page)
  const reloadedSidebarFrame = await getSidebarFrame(page)

  // Navigate to annotations list if not already there
  await waitForAnnotationsList(reloadedSidebarFrame)

  const isInListAfterReload = await verifyAnnotationInList(
    reloadedSidebarFrame,
    expectedFragment,
  )
  expect(isInListAfterReload, 'Annotation should persist in sidebar after reload').toBe(true)

  await takeScreenshot(page, browserName, `${name}-after-reload-complete`)

  return { page, sidebarFrame: reloadedSidebarFrame }
}

/**
 * Utility: select text on a page by finding a text node containing
 * the given string and creating a selection range around it.
 *
 * Useful for sites where there's no reliable CSS selector for the target element.
 * After setting the selection programmatically, dispatches a mouseup event
 * so the extension's content script detects the selection and shows the popup.
 */
export async function selectTextByContent(
  page: Page,
  searchText: string,
): Promise<void> {
  const found = await page.evaluate((text) => {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    )
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const idx = node.textContent?.indexOf(text) ?? -1
      if (idx >= 0) {
        const range = document.createRange()
        range.setStart(node, idx)
        range.setEnd(node, idx + text.length)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        // Scroll the element into view
        const parent = (node as Text).parentElement
        parent?.scrollIntoView({ block: 'center' })

        return true
      }
    }
    return false
  }, searchText)

  if (!found) {
    throw new Error(`Text "${searchText}" not found on the page`)
  }

  // Dispatch mouseup so the extension's content script detects the selection
  await page.dispatchEvent('body', 'mouseup')
  await page.waitForTimeout(500)
}

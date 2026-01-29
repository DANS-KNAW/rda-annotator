/**
 * E2E tests for highlight-annotation interactions.
 * Tests the bidirectional communication between page highlights and sidebar annotations:
 * 1. Click highlight → filters/shows annotation in sidebar
 * 2. Click annotation card → scrolls to and focuses highlight on page
 * 3. Hover highlight → shows hover ring on annotation card in sidebar
 *
 * Uses a mock HTTP server that works identically on both Chrome and Firefox.
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
import {
  fillRequiredFields,
} from './helpers/form-helpers'
import {
  clickAnnotationCard,
  clickHighlightOnPage,
  getSidebarFrame,
  hasPermanentHighlight,
  hoverHighlightOnPage,
  isHighlightFocused,
  isSidebarFilterActive,
  selectTextAndOpenPopup,
  submitForm,
  takeScreenshot,
  verifyAnnotationInPageAnnotations,
  waitForAnnotationsList,
  waitForAnnotationsToAnchor,
  waitForCreateForm,
} from './helpers/sidebar-helpers'

test.describe('Highlight-Annotation Interactions', () => {
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

  test('click highlight filters annotation in sidebar', async ({
    context,
    browserName,
  }) => {
    test.setTimeout(60000)
    const page = await context.newPage()

    await enableExtension(context, browserName)
    await injectMockAuth(context, browserName)

    await page.goto('https://example.com')
    await page.waitForSelector('[data-rda-injected]', { state: 'attached' })

    // Create an annotation first
    await selectTextAndOpenPopup(page)

    const sidebarFrame = await getSidebarFrame(page)
    await waitForCreateForm(sidebarFrame)

    await fillRequiredFields(
      sidebarFrame,
      page,
      'Highlight Click Test',
      { selectByLabel: 'English' },
      { selectByLabel: 'Other' },
    )

    await submitForm(sidebarFrame, page)
    await waitForAnnotationsList(sidebarFrame)

    // Wait for annotations to anchor on the page
    await waitForAnnotationsToAnchor(page)

    const hasHighlight = await hasPermanentHighlight(page)
    expect(hasHighlight, 'Page should have a permanent highlight after annotation').toBe(true)

    await takeScreenshot(page, browserName, 'highlight-click-before')

    // Verify annotation is in Page Annotations first
    const inPage = await verifyAnnotationInPageAnnotations(sidebarFrame, 'Example Domain')
    expect(inPage, 'Annotation should be in Page Annotations').toBe(true)

    // Click the highlight on the page
    await clickHighlightOnPage(page)

    await takeScreenshot(page, browserName, 'highlight-click-after')

    // Verify sidebar shows filter (indicating highlight click was received)
    const isFiltered = await isSidebarFilterActive(sidebarFrame)
    expect(isFiltered, 'Sidebar should show filter after clicking highlight').toBe(true)
  })

  test('click annotation card scrolls to and focuses highlight', async ({
    context,
    browserName,
  }) => {
    test.setTimeout(60000)
    const page = await context.newPage()

    await enableExtension(context, browserName)
    await injectMockAuth(context, browserName)

    await page.goto('https://example.com')
    await page.waitForSelector('[data-rda-injected]', { state: 'attached' })

    // Create an annotation
    await selectTextAndOpenPopup(page)

    const sidebarFrame = await getSidebarFrame(page)
    await waitForCreateForm(sidebarFrame)

    await fillRequiredFields(
      sidebarFrame,
      page,
      'Card Click Test',
      { selectByLabel: 'English' },
      { selectByLabel: 'Other' },
    )

    await submitForm(sidebarFrame, page)
    await waitForAnnotationsList(sidebarFrame)

    // Wait for annotations to anchor
    await waitForAnnotationsToAnchor(page)

    await takeScreenshot(page, browserName, 'card-click-before')

    // Navigate to Page Annotations tab
    const inPage = await verifyAnnotationInPageAnnotations(sidebarFrame, 'Example Domain')
    expect(inPage, 'Annotation should be in Page Annotations').toBe(true)

    // Click the annotation card in the sidebar
    await clickAnnotationCard(sidebarFrame, 'Example Domain')

    await takeScreenshot(page, browserName, 'card-click-after')

    // Verify the highlight on the page got focused
    const isFocused = await isHighlightFocused(page)
    expect(isFocused, 'Highlight should be focused after clicking annotation card').toBe(true)
  })

  test('focused highlight clears when annotation drawer is closed', async ({
    context,
    browserName,
  }) => {
    test.setTimeout(60000)
    const page = await context.newPage()

    await enableExtension(context, browserName)
    await injectMockAuth(context, browserName)

    await page.goto('https://example.com')
    await page.waitForSelector('[data-rda-injected]', { state: 'attached' })

    // Create an annotation
    await selectTextAndOpenPopup(page)

    const sidebarFrame = await getSidebarFrame(page)
    await waitForCreateForm(sidebarFrame)

    await fillRequiredFields(
      sidebarFrame,
      page,
      'Unfocus Test',
      { selectByLabel: 'English' },
      { selectByLabel: 'Other' },
    )

    await submitForm(sidebarFrame, page)
    await waitForAnnotationsList(sidebarFrame)

    // Wait for annotations to anchor
    await waitForAnnotationsToAnchor(page)

    // Verify annotation is in Page Annotations
    const inPage = await verifyAnnotationInPageAnnotations(sidebarFrame, 'Example Domain')
    expect(inPage, 'Annotation should be in Page Annotations').toBe(true)

    // Click the annotation card to focus the highlight
    await clickAnnotationCard(sidebarFrame, 'Example Domain')

    await takeScreenshot(page, browserName, 'unfocus-drawer-before')

    // Verify highlight is focused
    const isFocused = await isHighlightFocused(page)
    expect(isFocused, 'Highlight should be focused after clicking annotation card').toBe(true)

    // Close the drawer by clicking the close button.
    // Use evaluate() to click from within the iframe's JS context,
    // as Playwright's force-click can fail to reach React handlers in extension iframes on Chromium.
    await sidebarFrame.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Close drawer"]') as HTMLElement | null
      btn?.click()
    })
    await page.waitForTimeout(2000)

    await takeScreenshot(page, browserName, 'unfocus-drawer-after')

    // Verify highlight is no longer focused
    const isFocusedAfterClose = await isHighlightFocused(page)
    expect(isFocusedAfterClose, 'Highlight should NOT be focused after closing drawer').toBe(false)
  })

  test('focused highlight clears when filter is cleared', async ({
    context,
    browserName,
  }) => {
    test.setTimeout(60000)
    const page = await context.newPage()

    await enableExtension(context, browserName)
    await injectMockAuth(context, browserName)

    await page.goto('https://example.com')
    await page.waitForSelector('[data-rda-injected]', { state: 'attached' })

    // Create an annotation
    await selectTextAndOpenPopup(page)

    const sidebarFrame = await getSidebarFrame(page)
    await waitForCreateForm(sidebarFrame)

    await fillRequiredFields(
      sidebarFrame,
      page,
      'Filter Clear Test',
      { selectByLabel: 'English' },
      { selectByLabel: 'Other' },
    )

    await submitForm(sidebarFrame, page)
    await waitForAnnotationsList(sidebarFrame)

    // Wait for annotations to anchor
    await waitForAnnotationsToAnchor(page)

    // Verify annotation is in Page Annotations
    const inPage = await verifyAnnotationInPageAnnotations(sidebarFrame, 'Example Domain')
    expect(inPage, 'Annotation should be in Page Annotations').toBe(true)

    // Click the highlight on the page to set filter and open drawer
    await clickHighlightOnPage(page)

    const isFiltered = await isSidebarFilterActive(sidebarFrame)
    expect(isFiltered, 'Filter should be active after clicking highlight').toBe(true)

    // Close the drawer first (it opens automatically for single-match highlights)
    await sidebarFrame.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Close drawer"]') as HTMLElement | null
      btn?.click()
    })
    await page.waitForTimeout(500)

    // Click annotation card to focus the highlight (card is now visible with filter active)
    await clickAnnotationCard(sidebarFrame, 'Example Domain')
    const isFocused = await isHighlightFocused(page)
    expect(isFocused, 'Highlight should be focused after clicking card').toBe(true)

    await takeScreenshot(page, browserName, 'unfocus-filter-before')

    // Clear the filter using the "Clear filter" button
    await sidebarFrame.evaluate(() => {
      const buttons = document.querySelectorAll('button')
      for (const btn of buttons) {
        if (btn.textContent?.includes('Clear filter')) {
          btn.click()
          break
        }
      }
    })
    await page.waitForTimeout(2000)

    await takeScreenshot(page, browserName, 'unfocus-filter-after')

    // Verify highlight is no longer focused
    const isFocusedAfterClear = await isHighlightFocused(page)
    expect(isFocusedAfterClear, 'Highlight should NOT be focused after clearing filter').toBe(false)
  })

  test('hover highlight shows ring on annotation card', async ({
    context,
    browserName,
  }) => {
    test.setTimeout(60000)
    const page = await context.newPage()

    await enableExtension(context, browserName)
    await injectMockAuth(context, browserName)

    await page.goto('https://example.com')
    await page.waitForSelector('[data-rda-injected]', { state: 'attached' })

    // Create an annotation
    await selectTextAndOpenPopup(page)

    const sidebarFrame = await getSidebarFrame(page)
    await waitForCreateForm(sidebarFrame)

    await fillRequiredFields(
      sidebarFrame,
      page,
      'Hover Test',
      { selectByLabel: 'English' },
      { selectByLabel: 'Other' },
    )

    await submitForm(sidebarFrame, page)
    await waitForAnnotationsList(sidebarFrame)

    // Wait for annotations to anchor
    await waitForAnnotationsToAnchor(page)

    // Make sure we're on Page Annotations tab
    const inPage = await verifyAnnotationInPageAnnotations(sidebarFrame, 'Example Domain')
    expect(inPage, 'Annotation should be in Page Annotations').toBe(true)

    await takeScreenshot(page, browserName, 'hover-before')

    // Hover over the highlight on the page
    await hoverHighlightOnPage(page)

    // Poll the sidebar frame DOM for the hover ring class.
    // waitForFunction is more reliable than locator().waitFor() in extension iframes
    // because it runs entirely within the frame's JS context.
    const isHovered = await sidebarFrame
      .waitForFunction(() => {
        return document.querySelector('.ring-rda-400') !== null
      }, undefined, { timeout: 5000 })
      .then(() => true)
      .catch(async () => {
        // Diagnostic: dump DOM state on failure
        const debug = await sidebarFrame.evaluate(() => {
          const cards = document.querySelectorAll('.cursor-pointer')
          return {
            cardCount: cards.length,
            cards: Array.from(cards).map(el => ({
              className: el.className,
              text: (el.textContent || '').substring(0, 80),
            })),
            hoveredIds: (window as any).__rdaHoveredIds,
            allRingElements: document.querySelectorAll('[class*="ring"]').length,
          }
        })
        console.info(`[Hover Debug] ${browserName}: DOM state on failure:`, JSON.stringify(debug, null, 2))
        return false
      })

    await takeScreenshot(page, browserName, 'hover-after')

    expect(isHovered, 'Annotation card should show hover ring when highlight is hovered').toBe(true)
  })
})

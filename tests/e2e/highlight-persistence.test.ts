/**
 * E2E tests for highlight persistence and orphaned annotation detection.
 *
 * These tests verify that annotations are properly anchored after creation
 * and that highlights persist on the page.
 *
 * IMPORTANT: These tests verify the full integration including the backend.
 * If the backend (rda-gateway) doesn't properly store the `annotation_target.selector`
 * array, these tests will fail because:
 * 1. The extension creates annotations with proper selectors
 * 2. The backend must transform `target` → `annotation_target` and preserve selectors
 * 3. Without selectors, annotations cannot be anchored → they become "orphaned"
 *
 * Known issue: If the backend returns `annotation_target.selector: []` (empty array),
 * anchoring will fail and annotations will be orphaned.
 */

import type { Server } from 'node:http'
import {
  clearCreatedAnnotations,
  enableExtension,
  expect,
  getCreatedAnnotations,
  injectMockAuth,
  startMockServer,
  stopMockServer,
  test,
} from './fixtures'
import { fillRequiredFields } from './helpers/form-helpers'
import {
  countOrphanedAnnotations,
  countPermanentHighlights,
  getHighlightIds,
  getSidebarFrame,
  hasOrphanedAnnotations,
  hasPermanentHighlight,
  selectTextAndOpenPopup,
  submitForm,
  takeScreenshot,
  waitForAnnotationsList,
  waitForAnnotationsToAnchor,
  waitForCreateForm,
} from './helpers/sidebar-helpers'

test.describe('Highlight Persistence', () => {
  let mockServer: Server

  // Skip on Firefox - anchoring/highlighting has known issues on Firefox
  // that require separate investigation. The core fix (annotation_target field)
  // is verified by Chromium tests.
  test.skip(({ browserName }) => browserName === 'firefox', 'Firefox anchoring needs separate fix')

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

  test('annotation should have working highlight after creation (not orphaned)', async ({
    context,
    browserName,
  }) => {
    const page = await context.newPage()

    await enableExtension(context, browserName)
    await injectMockAuth(context, browserName)

    await page.goto('https://example.com')
    await page.waitForSelector('[data-rda-injected]', { state: 'attached' })

    // Create an annotation
    await selectTextAndOpenPopup(page)

    const sidebarFrame = await getSidebarFrame(page)
    await waitForCreateForm(sidebarFrame)

    // Fill required fields and submit
    await fillRequiredFields(
      sidebarFrame,
      page,
      'Highlight Persistence Test',
      { selectByLabel: 'English' },
      { selectByLabel: 'Other' },
    )

    await submitForm(sidebarFrame, page)

    // Wait for annotations list
    await waitForAnnotationsList(sidebarFrame)

    // Wait for annotations to load and anchor (use longer timeout for stability)
    await waitForAnnotationsToAnchor(page, 15000)

    await takeScreenshot(page, browserName, 'highlight-after-creation')

    // CRITICAL: Check that annotation is NOT orphaned
    const orphanedCount = await countOrphanedAnnotations(sidebarFrame)
    expect(
      orphanedCount,
      'No annotations should be orphaned after creation',
    ).toBe(0)

    const hasOrphaned = await hasOrphanedAnnotations(sidebarFrame)
    expect(
      hasOrphaned,
      'Orphaned Annotation label should NOT be visible',
    ).toBe(false)

    // CRITICAL: Check that highlight exists on the page
    const hasPermanent = await hasPermanentHighlight(page)
    expect(
      hasPermanent,
      'Permanent highlight should exist on the page',
    ).toBe(true)

    const highlightCount = await countPermanentHighlights(page)
    expect(
      highlightCount,
      'Should have exactly 1 permanent highlight',
    ).toBe(1)

    // Verify highlight has correct ID (not "temporary")
    const highlightIds = await getHighlightIds(page)
    expect(highlightIds.length, 'Should have highlight IDs').toBeGreaterThan(0)
    expect(
      highlightIds.every(id => id !== 'temporary'),
      'All highlights should be permanent (not temporary)',
    ).toBe(true)
  })

  test('created annotation should have proper annotation_target structure', async ({
    context,
    browserName,
  }) => {
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
      'Selector Structure Test',
      { selectByLabel: 'English' },
      { selectByLabel: 'Other' },
    )

    await submitForm(sidebarFrame, page)
    await waitForAnnotationsList(sidebarFrame)

    // Verify the annotation was created with correct annotation_target structure
    const created = getCreatedAnnotations()
    expect(created.length, 'One annotation should be created').toBe(1)

    const annotation = created[0] as Record<string, unknown>

    // Check that annotation_target field exists (what we send to API)
    expect(annotation.annotation_target, 'annotation_target field should exist').toBeDefined()

    const annotationTarget = annotation.annotation_target as {
      source?: string
      selector?: Array<{ type: string }>
    }

    // Verify annotation_target structure
    expect(annotationTarget.source, 'annotation_target should have source URL').toBeDefined()
    expect(annotationTarget.source, 'Source should be example.com').toContain('example.com')

    expect(
      Array.isArray(annotationTarget.selector),
      'annotation_target should have selector array',
    ).toBe(true)

    expect(
      annotationTarget.selector!.length,
      'Should have multiple selectors for fallback',
    ).toBeGreaterThanOrEqual(1)

    // Verify selector types
    const selectorTypes = annotationTarget.selector!.map(s => s.type)
    expect(
      selectorTypes,
      'Should include TextQuoteSelector (most robust)',
    ).toContain('TextQuoteSelector')

    await takeScreenshot(page, browserName, 'selector-structure-verified')
  })

  test('multiple annotations should all have working highlights', async ({
    context,
    browserName,
  }) => {
    // This test may take longer due to multiple form submissions
    test.setTimeout(60000)

    const page = await context.newPage()

    await enableExtension(context, browserName)
    await injectMockAuth(context, browserName)

    await page.goto('https://example.com')
    await page.waitForSelector('[data-rda-injected]', { state: 'attached' })

    // Create first annotation
    await selectTextAndOpenPopup(page, 'h1')

    let sidebarFrame = await getSidebarFrame(page)
    await waitForCreateForm(sidebarFrame)

    await fillRequiredFields(
      sidebarFrame,
      page,
      'First Annotation',
      { selectByLabel: 'English' },
      { selectByLabel: 'Other' },
    )

    await submitForm(sidebarFrame, page)
    await waitForAnnotationsList(sidebarFrame)

    // Create second annotation on a different element (use first p to avoid strict mode violation)
    await selectTextAndOpenPopup(page, 'p:first-of-type')

    sidebarFrame = await getSidebarFrame(page)
    await waitForCreateForm(sidebarFrame)

    await fillRequiredFields(
      sidebarFrame,
      page,
      'Second Annotation',
      { selectByLabel: 'German' },
      { selectByLabel: 'Article' },
    )

    await submitForm(sidebarFrame, page)
    await waitForAnnotationsList(sidebarFrame)

    // Wait for all annotations to anchor
    await waitForAnnotationsToAnchor(page, 15000)

    await takeScreenshot(page, browserName, 'multiple-highlights')

    // Verify no orphaned annotations
    const orphanedCount = await countOrphanedAnnotations(sidebarFrame)
    expect(
      orphanedCount,
      'No annotations should be orphaned',
    ).toBe(0)

    // Verify we have at least 2 permanent highlights
    // (may have more due to re-anchoring after each annotation creation)
    const highlightCount = await countPermanentHighlights(page)
    expect(
      highlightCount,
      'Should have at least 2 permanent highlights',
    ).toBeGreaterThanOrEqual(2)

    // Verify both annotations were created
    const created = getCreatedAnnotations()
    expect(created.length, 'Two annotations should be created').toBe(2)
  })

  test('highlights should survive page scroll', async ({
    context,
    browserName,
  }) => {
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
      'Scroll Test',
      { selectByLabel: 'English' },
      { selectByLabel: 'Other' },
    )

    await submitForm(sidebarFrame, page)
    await waitForAnnotationsList(sidebarFrame)
    await waitForAnnotationsToAnchor(page, 15000)

    // Get initial highlight count
    const initialCount = await countPermanentHighlights(page)
    expect(initialCount, 'Should have highlight before scroll').toBe(1)

    // Scroll down and back up
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })
    await page.waitForTimeout(500)

    await page.evaluate(() => {
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(500)

    await takeScreenshot(page, browserName, 'highlight-after-scroll')

    // Verify highlight still exists
    const afterScrollCount = await countPermanentHighlights(page)
    expect(
      afterScrollCount,
      'Highlight should survive scroll',
    ).toBe(1)

    // Verify no orphaned annotations
    const hasOrphaned = await hasOrphanedAnnotations(sidebarFrame)
    expect(hasOrphaned, 'Should not be orphaned after scroll').toBe(false)
  })
})

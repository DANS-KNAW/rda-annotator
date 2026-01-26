/**
 * Sidebar interaction helpers for E2E tests.
 * Provides utilities for text selection, popup interaction, and sidebar navigation.
 */

import type { Frame, Page } from '@playwright/test'

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

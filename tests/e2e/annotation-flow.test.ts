import { enableExtension, expect, injectMockAuth, test } from './fixtures'

test.describe('Annotation Flow', () => {
  test('visual text selection and annotation', async ({
    context,
    browserName,
  }) => {
    const page = await context.newPage()

    await enableExtension(context, browserName)
    await page.goto('https://example.com')
    await page.waitForSelector('[data-rda-injected]', { state: 'attached' })

    const h1 = await page.locator('h1').boundingBox()
    if (!h1)
      throw new Error('h1 not found')

    // Visual text selection
    await page.mouse.move(h1.x + 10, h1.y + h1.height / 2)
    await page.mouse.down()
    await page.mouse.move(h1.x + h1.width - 10, h1.y + h1.height / 2)
    await page.mouse.up()
    await page.waitForTimeout(500)

    await page.screenshot({ path: `test-results/${browserName}-selection-popup.png` })

    const popupBox = await page.evaluate(() => {
      const popup = document.querySelector('rda-annotator-popup')
      if (!popup)
        return null
      const rect = popup.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    })

    if (!popupBox || popupBox.width === 0) {
      await page.screenshot({ path: `test-results/${browserName}-popup-not-found.png` })
      throw new Error('Popup not found or not visible. Check screenshot.')
    }

    await page.mouse.click(
      popupBox.x + popupBox.width / 2,
      popupBox.y + popupBox.height / 2,
    )

    await page.waitForTimeout(2000)
    await page.screenshot({ path: `test-results/${browserName}-sidebar-state.png` })

    const sidebarHost = await page.evaluate(() => {
      const sidebar = document.querySelector('rda-annotator-sidebar')
      if (!sidebar)
        return { exists: false, isOpen: false }
      return {
        exists: true,
        isOpen: sidebar.classList.contains('open'),
      }
    })

    const hasHighlight = await page.evaluate(() => {
      return document.querySelector('rda-highlight') !== null
    })

    await page.screenshot({ path: `test-results/${browserName}-create-form.png` })

    expect(sidebarHost.exists, 'Sidebar host should exist').toBe(true)
    expect(sidebarHost.isOpen, 'Sidebar should be open').toBe(true)
    expect(hasHighlight, 'Temporary highlight should exist').toBe(true)

    // Verify unauthenticated state: Login link should be visible
    const sidebarFrame = page.frames().find(f => f.url().includes('sidebar.html'))
    if (!sidebarFrame) {
      await page.screenshot({
        path: `test-results/${browserName}-no-sidebar-frame.png`,
      })
      throw new Error('Sidebar iframe not found')
    }

    // Should show login prompt with "Please authenticate" message
    const authPrompt = sidebarFrame.locator('text=Please authenticate to create annotations')
    await expect(authPrompt, 'Auth prompt should be visible for unauthenticated user').toBeVisible({
      timeout: 5000,
    })

    // Login link should be visible (it's an <a> tag, not a button)
    const loginLink = sidebarFrame.locator('a:has-text("Login")')
    await expect(loginLink, 'Login link should be visible for unauthenticated user').toBeVisible({
      timeout: 5000,
    })

    // Fragment field should NOT be visible (it's in Create form only)
    const fragmentTextarea = sidebarFrame.locator('#selectedText-textarea')
    await expect(
      fragmentTextarea,
      'Fragment field should NOT be visible for unauthenticated user',
    ).not.toBeVisible()
  })

  test('authenticated annotation shows Create form', async ({
    context,
    browserName,
  }) => {
    const page = await context.newPage()

    await enableExtension(context, browserName)
    await injectMockAuth(context, browserName)

    await page.goto('https://example.com')
    await page.waitForSelector('[data-rda-injected]', { state: 'attached' })

    const h1 = await page.locator('h1').boundingBox()
    if (!h1)
      throw new Error('h1 not found')

    await page.mouse.move(h1.x + 10, h1.y + h1.height / 2)
    await page.mouse.down()
    await page.mouse.move(h1.x + h1.width - 10, h1.y + h1.height / 2)
    await page.mouse.up()
    await page.waitForTimeout(500)

    const popupBox = await page.evaluate(() => {
      const popup = document.querySelector('rda-annotator-popup')
      if (!popup)
        return null
      const rect = popup.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    })

    if (!popupBox || popupBox.width === 0) {
      await page.screenshot({ path: `test-results/${browserName}-auth-popup-not-found.png` })
      throw new Error('Popup not found')
    }

    await page.mouse.click(
      popupBox.x + popupBox.width / 2,
      popupBox.y + popupBox.height / 2,
    )

    await page.waitForTimeout(2000)
    await page.screenshot({ path: `test-results/${browserName}-auth-sidebar-state.png` })

    const sidebarState = await page.evaluate(() => {
      const sidebar = document.querySelector('rda-annotator-sidebar')
      return {
        exists: !!sidebar,
        isOpen: sidebar?.classList.contains('open') ?? false,
      }
    })

    expect(sidebarState.exists, 'Sidebar should exist').toBe(true)
    expect(sidebarState.isOpen, 'Sidebar should be open').toBe(true)

    const hasHighlight = await page.evaluate(
      () => document.querySelector('rda-highlight') !== null,
    )
    expect(hasHighlight, 'Highlight should exist').toBe(true)

    // Verify authenticated state: Create form with annotation fragment should be visible
    const sidebarFrame = page.frames().find(f => f.url().includes('sidebar.html'))
    if (!sidebarFrame) {
      await page.screenshot({
        path: `test-results/${browserName}-auth-no-sidebar-frame.png`,
      })
      throw new Error('Sidebar iframe not found')
    }

    // Wait for Create Annotation heading to confirm we're on the right view
    const createHeading = sidebarFrame.getByRole('heading', { name: 'Create Annotation' })
    await expect(createHeading, 'Create Annotation heading should be visible').toBeVisible({
      timeout: 5000,
    })

    // Fragment textarea should be visible with selected text
    const fragmentTextarea = sidebarFrame.locator('#selectedText-textarea')
    await expect(fragmentTextarea, 'Fragment field should be visible').toBeVisible({
      timeout: 5000,
    })

    // Wait for the textarea to be populated (form values set asynchronously)
    await expect(fragmentTextarea).toHaveValue(/Example Domain|xample Domain/, { timeout: 5000 })

    const fragmentValue = await fragmentTextarea.inputValue()
    expect(
      fragmentValue.length > 0,
      `Fragment should contain selected text, got: "${fragmentValue}"`,
    ).toBe(true)

    await page.screenshot({ path: `test-results/${browserName}-auth-create-form.png` })
  })

  // NOTE: The test for "authentication flow preserves pending annotation" is complex to implement
  // in E2E tests because:
  // 1. We can't easily simulate the real OAuth popup flow
  // 2. The sidebar iframe doesn't support programmatic reload
  // 3. The pending annotation is stored in session storage which persists, but triggering
  //    the sidebar to re-read auth state requires the real OAuth callback mechanism
  //
  // For now, the key behaviors are tested by the above tests:
  // - Unauthenticated: Login prompt shown (test 1)
  // - Authenticated: Create form shown with fragment (test 2)
  //
  // The preservation of pending annotations through auth can be verified manually or
  // by implementing proper OAuth mocking with browser extension testing tools.
})

import { expect, test } from './fixtures'

test.describe('Extension Loading', () => {
  test('extension loads and registers background', async ({
    context,
    extensionId,
    browserName,
  }) => {
    // Verify extension ID was extracted
    expect(extensionId).toBeTruthy()
    expect(extensionId.length).toBeGreaterThan(0)

    // Check background is running
    if (browserName === 'chromium') {
      // Chrome uses service workers for MV3
      const serviceWorkers = context.serviceWorkers()
      expect(serviceWorkers.length).toBeGreaterThan(0)
    }
    else {
      // Firefox MV3 extensions don't expose background pages via Playwright's API
      // in the same way. The fixture extracts the UUID from Firefox's profile.
      // Verify we got a valid UUID (not the fallback gecko.id)
      expect(extensionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    }
  })

  test('content script injects on page load', async ({
    context,
    browserName,
  }) => {
    const page = await context.newPage()
    await page.goto('https://example.com')

    // Wait for content script injection marker (meta tag, so use 'attached' state)
    await page.waitForSelector('[data-rda-injected]', {
      timeout: 10000,
      state: 'attached',
    })

    // Take screenshot to verify extension injection
    await page.screenshot({
      path: `test-results/${browserName}-content-injected.png`,
    })

    const marker = await page.$('[data-rda-injected]')
    expect(marker).toBeTruthy()

    const frameType = await marker?.getAttribute('data-rda-frame-type')
    expect(frameType).toBe('host')
  })

  test('page loads without JavaScript errors', async ({
    context,
    browserName,
  }) => {
    const page = await context.newPage()
    const errors: string[] = []

    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    await page.goto('https://example.com')
    await page.waitForSelector('[data-rda-injected]', {
      timeout: 10000,
      state: 'attached',
    })

    // Give time for any async errors
    await page.waitForTimeout(1000)

    // Take screenshot to capture page state
    await page.screenshot({
      path: `test-results/${browserName}-no-errors.png`,
    })

    // Filter out known acceptable errors
    const criticalErrors = errors.filter(
      e =>
        !e.includes('ResizeObserver')
        && !e.includes('Non-Error promise rejection'),
    )

    expect(criticalErrors).toHaveLength(0)
  })
})

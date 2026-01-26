import type { BrowserContext, Page, Worker } from '@playwright/test'
import type { Server } from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  test as base,

  chromium,
  firefox,

} from '@playwright/test'
import { withExtension } from 'playwright-webextext'

// Re-export mock server functions for tests
export {
  clearCreatedAnnotations,
  getCreatedAnnotations,
  startMockServer,
  startMockServerWithDelay,
  startMockServerWithError,
  stopMockServer,
} from './mocks/mock-api-server'

export type { MockServerConfig } from './mocks/mock-api-server'

// Re-export Server type for use in tests
export type { Server }

// Path to built extensions (ESM-compatible)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHROME_EXTENSION_PATH = path.join(__dirname, '../../.output/chrome-mv3')
const FIREFOX_EXTENSION_PATH = path.join(
  __dirname,
  '../../.output/firefox-mv3',
)

// Store Firefox extension UUID and profile dir for reuse
let firefoxExtensionUUID: string | null = null
let firefoxUserDataDir: string | null = null

/**
 * Get the Firefox extension's internal UUID by reading the profile's extension config.
 * May need to wait for Firefox to write the config files after extension install.
 */
async function getFirefoxExtensionUUID(
  _context: BrowserContext,
): Promise<string> {
  if (firefoxExtensionUUID) {
    return firefoxExtensionUUID
  }

  if (!firefoxUserDataDir) {
    throw new Error('Firefox userDataDir not set')
  }

  // Firefox may take a moment to write prefs after extension install
  // Retry a few times with small delays
  for (let attempt = 0; attempt < 5; attempt++) {
    const prefsPath = path.join(firefoxUserDataDir, 'prefs.js')

    if (fs.existsSync(prefsPath)) {
      try {
        const prefsContent = fs.readFileSync(prefsPath, 'utf-8')

        // Look for webextensions.uuids pref which maps extension IDs to UUIDs
        // Format: user_pref("extensions.webextensions.uuids", "{\"ext-id\":\"uuid\",...}");
        const uuidsMatch = prefsContent.match(
          /user_pref\("extensions\.webextensions\.uuids",\s*"(.+?)"\);/,
        )
        if (uuidsMatch) {
          // Parse the JSON-encoded UUID mapping (escaped quotes)
          const uuidsJson = uuidsMatch[1]
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
          try {
            const uuids = JSON.parse(uuidsJson)
            // Find our extension's UUID
            const uuid = uuids['rda-annotator@tiger.rda-community.org']
            if (uuid) {
              firefoxExtensionUUID = uuid
              return uuid
            }
          }
          catch {
            // JSON parse failed, try next attempt
          }
        }
      }
      catch {
        // File read failed, try next attempt
      }
    }

    // Wait 500ms before retrying
    if (attempt < 4) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  throw new Error(
    'Could not determine Firefox extension UUID from profile after retries',
  )
}

/**
 * Set extension storage values via an extension iframe.
 * For Firefox, we create an iframe pointing to the extension's sidebar page
 * (which is web-accessible) and execute storage commands through it.
 */
async function setStorageViaExtensionPage(
  context: BrowserContext,
  storageData: Record<string, unknown>,
): Promise<void> {
  const uuid = await getFirefoxExtensionUUID(context)
  const sidebarUrl = `moz-extension://${uuid}/sidebar.html`

  // Open a regular page and embed the extension page in an iframe
  const page = await context.newPage()
  await page.goto('https://example.com')

  // Wait for the page to be ready
  await page.waitForLoadState('domcontentloaded')

  // Create an iframe pointing to the extension's sidebar page
  // Since sidebar.html is in web_accessible_resources, this should work
  await page.evaluateHandle((url) => {
    return new Promise<HTMLIFrameElement>((resolve, reject) => {
      const iframe = document.createElement('iframe')
      iframe.src = url
      iframe.style.display = 'none'
      iframe.onload = () => resolve(iframe)
      iframe.onerror = () =>
        reject(new Error('Failed to load extension iframe'))
      document.body.appendChild(iframe)

      // Timeout after 5 seconds
      setTimeout(() => reject(new Error('Iframe load timeout')), 5000)
    })
  }, sidebarUrl)

  // Wait a bit for the iframe to load and frames to update
  await page.waitForTimeout(1000)

  // Get the iframe's frame from Playwright
  const frames = page.frames()
  const extensionFrame = frames.find(f =>
    f.url().includes('moz-extension://'),
  )

  if (extensionFrame) {
    // Set storage values in the extension frame context
    await extensionFrame.evaluate(async (data) => {
      // @ts-ignore - browser is available in extension context
      await browser.storage.local.set(data)
    }, storageData)
  }

  await page.close()
}

/**
 * Mock auth data for testing
 */
function getMockAuthData() {
  const now = Math.floor(Date.now() / 1000)

  // Use a valid ORCID format for identity_provider_identity
  // This is required by the backend validation
  const mockOrcid = '0000-0002-1825-0097'

  const oauth = {
    'access_token': 'mock-test-token-e2e',
    'expires_in': 3600,
    'expires_at': now + 3600,
    'refresh_expires_in': 2592000,
    'refresh_expires_at': now + 2592000,
    'refresh_token': 'mock-refresh-token-e2e',
    'token_type': 'Bearer',
    'id_token': 'mock-id-token',
    'not-before-policy': 0,
    'session_state': 'test-session-123',
    'scope': 'openid email profile',
    'identity_provider_identity': mockOrcid,
  }

  const user = {
    email: 'e2e-test@example.com',
    email_verified: true,
    family_name: 'Tester',
    given_name: 'E2E',
    name: 'E2E Tester',
    preferred_username: 'e2etester',
    resource_access: { account: { roles: [] } },
    sub: mockOrcid,
  }

  return { oauth, user }
}

/**
 * Set extension storage values via appropriate method for each browser.
 * Chrome uses service worker; Firefox uses an extension iframe.
 * Exported for tests that need to set custom storage values (e.g., remember choices).
 */
export async function setStorageSettings(
  context: BrowserContext,
  browserName: string,
  storageData: Record<string, unknown>,
): Promise<void> {
  if (browserName === 'chromium') {
    // Chrome: use service worker
    let [serviceWorker] = context.serviceWorkers()
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker')
    }
    await serviceWorker.evaluate((data) => {
      return chrome.storage.local.set(data)
    }, storageData)
  }
  else {
    // Firefox: use extension page to set storage
    await setStorageViaExtensionPage(context, storageData)
  }
}

/**
 * Helper to inject mock auth into a browser context.
 * Works with both Chrome (via service worker) and Firefox (via extension page).
 */
export async function injectMockAuth(
  context: BrowserContext,
  browserName: string = 'chromium',
) {
  const { oauth, user } = getMockAuthData()
  await setStorageSettings(context, browserName, { oauth, user })
}

/**
 * Get a background worker/page for the extension.
 * Chrome uses service workers; Firefox MV3 doesn't expose background pages easily.
 * Returns null for Firefox.
 */
export async function getExtensionBackground(
  context: BrowserContext,
  browserName: string,
): Promise<Worker | Page | null> {
  if (browserName === 'chromium') {
    let [serviceWorker] = context.serviceWorkers()
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker')
    }
    return serviceWorker
  }
  else {
    // Firefox MV3 doesn't expose background pages via Playwright's API
    // Return null and handle this case in calling code
    return null
  }
}

/**
 * Enable the extension by setting storage flags.
 * Sets both 'extension-enabled' and 'intro-shown' to skip the intro page.
 * Works with both Chrome (via service worker) and Firefox (via extension page).
 */
export async function enableExtension(
  context: BrowserContext,
  browserName: string,
) {
  await setStorageSettings(context, browserName, {
    'extension-enabled': true,
    'intro-shown': true, // Skip the introduction page in tests
  })
}

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
  browserName: string
}>({
  // Browser name from project config
  browserName: async ({ browserName }, use) => {
    await use(browserName)
  },

  // Custom context that loads the extension based on browser type
  context: async ({ browserName }, use) => {
    let context: BrowserContext
    let userDataDir: string | null = null

    // Reset Firefox state for each new context
    firefoxExtensionUUID = null
    firefoxUserDataDir = null

    if (browserName === 'chromium') {
      // Chrome: use withExtension for consistent API
      const browserWithExt = withExtension(chromium, CHROME_EXTENSION_PATH)
      context = await browserWithExt.launchPersistentContext('', {
        headless: false, // Extensions require non-headless mode
        args: ['--no-first-run', '--disable-default-apps'],
      })
    }
    else if (browserName === 'firefox') {
      // Firefox requires a real userDataDir path (not empty string)
      userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rda-firefox-test-'))
      firefoxUserDataDir = userDataDir // Store for UUID lookup
      const browserWithExt = withExtension(firefox, FIREFOX_EXTENSION_PATH)
      context = await browserWithExt.launchPersistentContext(userDataDir, {
        headless: false, // Extensions require non-headless mode
      })
    }
    else {
      throw new Error(`Unsupported browser: ${browserName}`)
    }

    await use(context)
    await context.close()

    // Cleanup temp directory for Firefox
    if (userDataDir) {
      fs.rmSync(userDataDir, { recursive: true, force: true })
    }
  },

  // Extract extension ID from service worker/background page URL
  extensionId: async ({ context, browserName }, use) => {
    let extensionId: string

    if (browserName === 'chromium') {
      // Wait for service worker (Manifest V3)
      let [serviceWorker] = context.serviceWorkers()
      if (!serviceWorker) {
        serviceWorker = await context.waitForEvent('serviceworker')
      }
      // Chrome extension URLs: chrome-extension://EXTENSION_ID/...
      extensionId = serviceWorker.url().split('/')[2]
    }
    else {
      // Firefox: get the internal UUID
      try {
        extensionId = await getFirefoxExtensionUUID(context)
      }
      catch {
        // Fallback to manifest gecko.id if we can't get UUID
        extensionId = 'rda-annotator@tiger.rda-community.org'
      }
    }

    await use(extensionId)
  },
})

export const expect = test.expect

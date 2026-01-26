import type { DataSource } from '@/types/datasource.interface'
import type { Keycloak } from '@/types/keycloak.interface'
import { storage } from '#imports'
import { isPDFURL } from '@/utils/detect-content-type'
import { onMessage, sendMessage } from '@/utils/messaging'
import { parseApiError } from '@/utils/parse-api-error'

/**
 * Get the URL for viewing a PDF in our custom PDF.js viewer
 */
function getPDFViewerURL(pdfUrl: string): string {
  const viewerUrl = browser.runtime.getURL('/pdfjs/web/viewer.html')
  const url = new URL(viewerUrl)
  url.searchParams.set('file', pdfUrl)
  return url.toString()
}

/**
 * Check if a URL is already our PDF viewer
 */
function isOurPDFViewer(url: string): boolean {
  try {
    const viewerPath = 'pdfjs/web/viewer.html'
    return url.includes(viewerPath)
  }
  catch {
    return false
  }
}

async function sendInstallationMetrics() {
  try {
    const manifest = browser.runtime.getManifest()
    const platformInfo = await browser.runtime.getPlatformInfo()

    // getBrowserInfo is Firefox-only API
    let browserInfo: { name?: string, version?: string } | undefined
    if (typeof (browser.runtime as any).getBrowserInfo === 'function') {
      browserInfo = await (browser.runtime as any).getBrowserInfo()
    }

    const userAgent = navigator.userAgent
    let browserName = 'unknown'
    if (browserInfo?.name) {
      browserName = browserInfo.name
    }
    else if (userAgent.includes('Chrome')) {
      browserName = 'chrome'
    }
    else if (userAgent.includes('Firefox')) {
      browserName = 'firefox'
    }
    else if (userAgent.includes('Safari')) {
      browserName = 'safari'
    }
    else if (userAgent.includes('Edge')) {
      browserName = 'edge'
    }

    const metrics = {
      type: 'extension_installed',
      version: manifest.version,
      browser: browserName,
      browserVersion: browserInfo?.version || 'unknown',
      os: platformInfo.os,
      arch: platformInfo.arch,
      locale: browser.i18n.getUILanguage(),
      timestamp: new Date().toISOString(),
    }

    await fetch(`${import.meta.env.WXT_API_ENDPOINT}/knowledge-base/metric`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metrics),
    })
  }
  catch {
    // Silently fail if metrics cannot be sent
  }
}

export default defineBackground(() => {
  storage.defineItem('local:extension-enabled', {
    version: 1,
    fallback: false,
  })

  storage.getItem('local:extension-enabled').then((isEnabled) => {
    browser.action.setBadgeText({
      text: isEnabled ? 'ON' : '',
    })
    browser.action.setBadgeBackgroundColor({
      color: isEnabled ? '#467d2c' : '#666666',
    })
  })

  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === browser.runtime.OnInstalledReason.INSTALL) {
      storage.setItem('local:install-date', new Date().toISOString())
      storage.setItem('local:version', browser.runtime.getManifest().version)

      storage.defineItem('local:intro-shown', {
        version: 1,
        fallback: false,
      })

      storage.defineItem('local:user-settings', {
        version: 1,
        fallback: null,
      })

      storage.defineItem('local:oauth', {
        version: 1,
        fallback: null,
      })

      // Send installation metrics to API
      await sendInstallationMetrics()
    }
  })

  onMessage('storeAnnotation', async (message) => {
    try {
      // Use local storage instead of session storage for Firefox compatibility
      // session storage has cross-context issues in Firefox MV3
      await storage.setItem('local:pendingAnnotation', message.data)
      return { success: true }
    }
    catch {
      return { success: false }
    }
  })

  onMessage('clearPendingAnnotation', async () => {
    try {
      await storage.removeItem('local:pendingAnnotation')
      return { success: true }
    }
    catch {
      return { success: false }
    }
  })

  // Register frame URL - accumulates URLs per tab for sidebar to read
  // Each frame (host or guest) sends its URL directly to background
  onMessage('registerFrameUrl', async (message) => {
    const tabId = message.sender?.tab?.id
    if (!tabId || !message.data?.url)
      return

    const key = `session:frameUrls:${tabId}` as const
    const existing = (await storage.getItem<string[]>(key)) || []

    if (!existing.includes(message.data.url)) {
      const updated = [...existing, message.data.url]
      await storage.setItem(key, updated)
    }
  })

  // Clean up frame URLs when tab is closed
  browser.tabs.onRemoved.addListener(async (tabId) => {
    await storage.removeItem(`session:frameUrls:${tabId}` as const)
  })

  // Also clean up when tab navigates to a new page
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (changeInfo.status === 'loading' && changeInfo.url) {
      // Clear frame URLs when navigating to a new page
      await storage.removeItem(`session:frameUrls:${tabId}` as const)
    }
  })

  onMessage('getExtensionState', async () => {
    const enabled = await storage.getItem('local:extension-enabled')
    return { enabled: !!enabled }
  })

  // API proxy handlers - route requests through background to bypass CORS/Brave Shields
  onMessage('searchAnnotations', async (message) => {
    const { type, urls, submitterUuid, oldSubmitterUuid } = message.data
    const baseUrl = import.meta.env.WXT_API_ENDPOINT

    let query
    if (type === 'byUrl') {
      const urlArray = Array.isArray(urls) ? urls : [urls!]
      const urlQuery
        = urlArray.length === 1
          ? { term: { 'uri.keyword': urlArray[0] } }
          : { terms: { 'uri.keyword': urlArray } }

      query = {
        bool: {
          must: [
            { term: { 'resource_source.keyword': 'Annotation' } },
            urlQuery,
          ],
        },
      }
    }
    else {
      // bySubmitter
      const submitterQuery = oldSubmitterUuid
        ? {
            bool: {
              should: [
                { term: { 'submitter.keyword': submitterUuid } },
                { term: { 'submitter.keyword': oldSubmitterUuid } },
              ],
              minimum_should_match: 1,
            },
          }
        : { term: { 'submitter.keyword': submitterUuid } }

      query = {
        bool: {
          must: [
            { term: { 'resource_source.keyword': 'Annotation' } },
            submitterQuery,
          ],
        },
      }
    }

    const searchRequest = {
      index: 'rda',
      size: 1000,
      track_total_hits: true,
      query,
      sort: [{ dc_date: { order: 'desc' } }],
    }

    const response = await fetch(`${baseUrl}/knowledge-base/rda/_search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchRequest),
    })

    if (!response.ok) {
      throw new Error(`Elasticsearch request failed: ${response.statusText}`)
    }

    return response.json()
  })

  onMessage('fetchVocabularies', async (message) => {
    const baseUrl = import.meta.env.WXT_API_ENDPOINT
    const queryParams = new URLSearchParams()

    Object.entries(message.data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })

    const url = `${baseUrl}/vocabularies${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      // 404 means no results found - return empty array instead of error
      if (response.status === 404) {
        return []
      }
      throw new Error(
        `Failed to fetch vocabularies: ${response.status} ${response.statusText}`,
      )
    }

    const vocabularies = await response.json()

    return vocabularies.map(
      (vocab: {
        value_scheme: string
        value_uri: string
        subject_scheme: string
        namespace: string
        scheme_uri: string
        additional_metadata?: {
          description?: string
          local_name?: string
          url?: string
          taxonomy_parent?: string
          status?: string
        }
      }) =>
        ({
          label: vocab.value_scheme,
          value: vocab.value_uri,
          secondarySearch: vocab.additional_metadata?.description
            || vocab.additional_metadata?.local_name
            || `${vocab.subject_scheme} ${vocab.namespace}`,
          description: vocab.additional_metadata?.description || vocab.scheme_uri,
        } satisfies DataSource),
    )
  })

  onMessage('createAnnotation', async (message) => {
    const baseUrl = import.meta.env.WXT_API_ENDPOINT
    const oauth = await storage.getItem<Keycloak>('local:oauth')

    if (!oauth?.access_token) {
      return { success: false, error: 'No authentication token available' }
    }

    // Debug: Log the payload being sent to the API
    if (import.meta.env.DEV) {
      const payload = message.data.payload as Record<string, unknown>
      const annotationTarget = payload.annotation_target as { source?: string, selector?: Array<{ type?: string }> } | undefined
      console.debug('[Background] Creating annotation:', {
        title: payload.title,
        submitter: payload.submitter,
        hasAnnotationTarget: !!annotationTarget,
        targetSource: annotationTarget?.source,
        hasSelectorArray: Array.isArray(annotationTarget?.selector),
        selectorCount: annotationTarget?.selector?.length || 0,
        selectorTypes: annotationTarget?.selector?.map(s => s.type) || [],
        fullAnnotationTarget: annotationTarget,
      })
    }

    try {
      const response = await fetch(`${baseUrl}/knowledge-base/annotation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${oauth.access_token}`,
        },
        body: JSON.stringify(message.data.payload),
      })

      if (!response.ok) {
        const errorMessage = await parseApiError(response)
        if (import.meta.env.DEV) {
          console.error('[Background] Create annotation failed:', errorMessage)
        }
        return { success: false, error: errorMessage }
      }

      const data = await response.json()

      // Debug: Log the API response
      if (import.meta.env.DEV) {
        console.debug('[Background] Annotation created successfully:', {
          id: data.id || data.uuid,
          responseKeys: Object.keys(data),
          hasAnnotationTarget: 'annotation_target' in data,
          hasTarget: 'target' in data,
        })
      }

      return { success: true, data }
    }
    catch (error) {
      if (import.meta.env.DEV) {
        console.error('[Background] Create annotation error:', error)
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  onMessage('deleteAnnotation', async (message) => {
    const baseUrl = import.meta.env.WXT_API_ENDPOINT
    const oauth = await storage.getItem<Keycloak>('local:oauth')

    if (!oauth?.access_token) {
      return { success: false, error: 'No authentication token available' }
    }

    try {
      const response = await fetch(
        `${baseUrl}/knowledge-base/annotation/${message.data.annotationId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${oauth.access_token}`,
          },
        },
      )

      if (!response.ok) {
        const errorMessage = await parseApiError(response)
        return { success: false, error: errorMessage }
      }

      return { success: true }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  browser.action.onClicked.addListener(async (tab) => {
    const currentState = await storage.getItem('local:extension-enabled')
    const newState = !currentState
    await storage.setItem('local:extension-enabled', newState)

    await browser.action.setBadgeText({
      text: newState ? 'ON' : '',
    })
    await browser.action.setBadgeBackgroundColor({
      color: newState ? '#467d2c' : '#666666',
    })

    if (!tab?.url)
      return

    // If turning OFF and currently in our PDF viewer, redirect back to original PDF
    if (!newState && isOurPDFViewer(tab.url)) {
      try {
        const urlObj = new URL(tab.url)
        const originalURL = urlObj.searchParams.get('file')
        if (originalURL) {
          if (import.meta.env.DEV) {
            console.debug(
              '[RDA Background] Redirecting back to original PDF:',
              originalURL,
            )
          }
          await browser.tabs.update(tab.id!, { url: originalURL })
          return
        }
      }
      catch (error) {
        console.error(
          '[RDA Background] Failed to extract original PDF URL:',
          error,
        )
      }
    }

    // If turning ON and current page is a native PDF, redirect to our viewer
    if (newState && !isOurPDFViewer(tab.url)) {
      // Check if this is a direct PDF URL (not already in our viewer)
      if (isPDFURL(tab.url)) {
        if (import.meta.env.DEV) {
          console.debug(
            '[RDA Background] Redirecting PDF after enable:',
            tab.url,
          )
        }
        const viewerUrl = getPDFViewerURL(tab.url)
        await browser.tabs.update(tab.id!, { url: viewerUrl })
        return
      }
    }

    if (tab?.id != null) {
      try {
        await sendMessage('toggleSidebar', { action: 'toggle' }, tab.id)
      }
      catch (error) {
        if (import.meta.env.DEV) {
          console.warn(
            '[RDA Background] Failed to send toggleSidebar message:',
            error,
          )
        }
      }
    }
  })

  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, _tab) => {
    // Only intercept PDFs if extension is enabled
    if (changeInfo.url && !isOurPDFViewer(changeInfo.url)) {
      const isEnabled = await storage.getItem('local:extension-enabled')

      if (isEnabled && isPDFURL(changeInfo.url)) {
        const viewerUrl = getPDFViewerURL(changeInfo.url)
        await browser.tabs.update(tabId, { url: viewerUrl })
      }
    }
  })
})

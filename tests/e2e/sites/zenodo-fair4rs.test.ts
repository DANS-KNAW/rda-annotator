/**
 * Site-specific E2E test: Zenodo – FAIR4RS Principles record page
 *
 * @external This test depends on https://zenodo.org being accessible.
 * It may fail if the external site is down, has changed its DOM structure,
 * or is unreachable from the test environment.
 *
 * Run separately with: pnpm test:e2e:sites
 */

import type { Server } from 'node:http'
import {
  startMockServer,
  stopMockServer,
  test,
} from '../fixtures'
import {
  runSiteAnnotationTest,
  selectTextByContent,
} from '../helpers/site-annotation-flow'

const ZENODO_URL = 'https://zenodo.org/records/6623556'
const TARGET_TEXT = 'the FAIR for Research Software (FAIR4RS) Working Group has applied the FAIR Guiding Principles'

test.describe('Zenodo FAIR4RS Record', () => {
  let mockServer: Server

  test.beforeAll(async () => {
    mockServer = await startMockServer({ port: 3001 })
  })

  test.afterAll(async () => {
    if (mockServer) {
      await stopMockServer(mockServer)
    }
  })

  test('annotate text on Zenodo FAIR4RS record page', async ({
    context,
    browserName,
  }) => {
    test.setTimeout(90000)

    const { page } = await runSiteAnnotationTest(context, browserName, {
      url: ZENODO_URL,
      name: 'zenodo-fair4rs',
      selectText: async (p) => {
        await selectTextByContent(p, TARGET_TEXT)
      },
      expectedFragment: TARGET_TEXT,
      annotationTitle: 'Zenodo FAIR4RS Record Test',
      navigationTimeout: 60000,
      injectionTimeout: 30000,
      waitUntil: 'networkidle',
      waitForReady: async (p) => {
        // Wait for the description section to render (Zenodo loads content via JS)
        await p.waitForSelector('text=FAIR for Research Software', { timeout: 30000 })
      },
    })

    await page.close()
  })
})

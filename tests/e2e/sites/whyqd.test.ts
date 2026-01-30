/**
 * Site-specific E2E test: whyqd – data wrangling for research data reuse
 *
 * @external This test depends on https://whyqd.com being accessible.
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

const WHYQD_URL = 'https://whyqd.com/about'
const TARGET_TEXT = 'whyqd provides an intuitive method for schema-to-schema data transforms for research data reuse'

test.describe('whyqd About', () => {
  let mockServer: Server

  test.beforeAll(async () => {
    mockServer = await startMockServer({ port: 3001 })
  })

  test.afterAll(async () => {
    if (mockServer) {
      await stopMockServer(mockServer)
    }
  })

  test('annotate text on whyqd about page', async ({
    context,
    browserName,
  }) => {
    test.setTimeout(90000)

    const { page } = await runSiteAnnotationTest(context, browserName, {
      url: WHYQD_URL,
      name: 'whyqd',
      selectText: async (p) => {
        await selectTextByContent(p, TARGET_TEXT)
      },
      expectedFragment: TARGET_TEXT,
      annotationTitle: 'whyqd About Page Test',
      navigationTimeout: 45000,
      injectionTimeout: 15000,
      waitUntil: 'networkidle',
    })

    await page.close()
  })
})

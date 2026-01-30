/**
 * Site-specific E2E test: ARDC CODATA Research Data Management Terminology
 *
 * @external This test depends on https://vocabs.ardc.edu.au being accessible.
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

const ARDC_URL = 'https://vocabs.ardc.edu.au/viewById/685'
const TARGET_TEXT = 'The goal of the CODATA Research Data Management Terminology'

test.describe('ARDC CODATA Vocabulary', () => {
  let mockServer: Server

  test.beforeAll(async () => {
    mockServer = await startMockServer({ port: 3001 })
  })

  test.afterAll(async () => {
    if (mockServer) {
      await stopMockServer(mockServer)
    }
  })

  test('annotate text on ARDC CODATA vocabulary page', async ({
    context,
    browserName,
  }) => {
    test.setTimeout(90000)

    const { page } = await runSiteAnnotationTest(context, browserName, {
      url: ARDC_URL,
      name: 'ardc-codata',
      selectText: async (p) => {
        // Select the description paragraph about CODATA RDM Terminology
        await selectTextByContent(p, TARGET_TEXT)
      },
      expectedFragment: TARGET_TEXT,
      annotationTitle: 'ARDC CODATA Vocabulary Test',
      navigationTimeout: 30000,
      injectionTimeout: 15000,
    })

    await page.close()
  })
})

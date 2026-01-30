/**
 * Site-specific E2E test: RO-Crate – Research Object Crate
 *
 * @external This test depends on https://www.researchobject.org being accessible.
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

const RO_CRATE_URL = 'https://www.researchobject.org/ro-crate/about_ro_crate'
const TARGET_TEXT = 'RO-Crate aims to help people make their research FAIR'

test.describe('RO-Crate About', () => {
  let mockServer: Server

  test.beforeAll(async () => {
    mockServer = await startMockServer({ port: 3001 })
  })

  test.afterAll(async () => {
    if (mockServer) {
      await stopMockServer(mockServer)
    }
  })

  test('annotate text on RO-Crate about page', async ({
    context,
    browserName,
  }) => {
    test.setTimeout(90000)

    const { page } = await runSiteAnnotationTest(context, browserName, {
      url: RO_CRATE_URL,
      name: 'ro-crate',
      selectText: async (p) => {
        await selectTextByContent(p, TARGET_TEXT)
      },
      expectedFragment: TARGET_TEXT,
      annotationTitle: 'RO-Crate About Page Test',
      navigationTimeout: 30000,
      injectionTimeout: 15000,
    })

    await page.close()
  })
})

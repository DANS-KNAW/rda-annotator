import { beforeEach } from 'vitest'
import { fakeBrowser } from 'wxt/testing'

// Reset fake browser state between tests
beforeEach(() => {
  fakeBrowser.reset()
})

import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  imports: {
    eslintrc: {
      enabled: 9,
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: env => ({
    name: `${env.mode === 'development' ? '[DEV] ' : ''}RDA TIGER Annotation`,
    version: '1.2.0',
    permissions: ['storage', 'identity', 'tabs'],
    host_permissions: [import.meta.env.HOST_PERMISSION],
    // Required for Firefox MV3 extensions (used by playwright-webextext for testing)
    browser_specific_settings: {
      gecko: {
        id: 'rda-annotator@tiger.rda-community.org',
      },
    },
    web_accessible_resources: [
      {
        resources: ['sidebar.html', 'chunks/*', 'assets/*'],
        matches: ['<all_urls>'],
      },
      {
        resources: [
          'pdfjs/**/*',
          'pdfjs/web/viewer.html',
          'pdfjs/web/viewer.mjs',
          'pdfjs/web/viewer.css',
          'pdfjs/build/**/*',
          'pdfjs/pdfjs-init.js',
        ],
        matches: ['<all_urls>'],
      },
    ],
    action: {
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
        48: 'icon/48.png',
        128: 'icon/128.png',
      },
    },
  }),
  webExt: {
    startUrls: ['https://www.wikipedia.org/'],
  },
})

import { defineConfig, UserManifest } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: ({ browser }) => {
    const isFirefox = browser === "firefox";

    let manifest: UserManifest = {
      name: "RDA Web Annotator",
      short_name: "RDA Annotator",
      description: "Annotate web pages with the RDA Web Annotator",
      version: "1.0.0",
      minimum_chrome_version: "88",
      offline_enabled: false,
      homepage_url: "https://rda.dansdemo.nl",
      icons: {
        16: "icon/16.png",
        32: "icon/32.png",
        48: "icon/48.png",
        96: "icon/96.png",
        128: "icon/128.png",
      },
      action: {
        default_icon: {
          19: "icon/19-inactive.png",
          38: "icon/38-inactive.png",
        },
      },
      web_accessible_resources: [
        {
          resources: ["client/*", "pdfjs/*", "pdfjs/web/viewer.html"],
          matches: ["<all_urls>"],
        },
      ],
      permissions: ["scripting", "storage", "tabs"],
      host_permissions: ["<all_urls>"],
    };

    if (isFirefox) {
      delete manifest.minimum_chrome_version;
      delete manifest.offline_enabled;
    }

    return manifest;
  },
});

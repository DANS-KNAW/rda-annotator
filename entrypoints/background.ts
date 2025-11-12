import { storage } from "#imports";
import { onMessage, sendMessage } from "@/utils/messaging";
import { isPDFURL } from "@/utils/detect-content-type";

/**
 * Get the URL for viewing a PDF in our custom PDF.js viewer
 */
function getPDFViewerURL(pdfUrl: string): string {
  const viewerUrl = browser.runtime.getURL("/pdfjs/web/viewer.html");
  const url = new URL(viewerUrl);
  url.searchParams.set("file", pdfUrl);
  return url.toString();
}

/**
 * Check if a URL is already our PDF viewer
 */
function isOurPDFViewer(url: string): boolean {
  try {
    const viewerPath = "pdfjs/web/viewer.html";
    return url.includes(viewerPath);
  } catch {
    return false;
  }
}

async function sendInstallationMetrics() {
  try {
    const manifest = browser.runtime.getManifest();
    const platformInfo = await browser.runtime.getPlatformInfo();

    // getBrowserInfo is Firefox-only API
    let browserInfo: { name?: string; version?: string } | undefined;
    if (typeof (browser.runtime as any).getBrowserInfo === "function") {
      browserInfo = await (browser.runtime as any).getBrowserInfo();
    }

    const userAgent = navigator.userAgent;
    let browserName = "unknown";
    if (browserInfo?.name) {
      browserName = browserInfo.name;
    } else if (userAgent.includes("Chrome")) {
      browserName = "chrome";
    } else if (userAgent.includes("Firefox")) {
      browserName = "firefox";
    } else if (userAgent.includes("Safari")) {
      browserName = "safari";
    } else if (userAgent.includes("Edge")) {
      browserName = "edge";
    }

    const metrics = {
      type: "extension_installed",
      version: manifest.version,
      browser: browserName,
      browserVersion: browserInfo?.version || "unknown",
      os: platformInfo.os,
      arch: platformInfo.arch,
      locale: browser.i18n.getUILanguage(),
      timestamp: new Date().toISOString(),
    };

    await fetch(import.meta.env.WXT_API_ENDPOINT + "/knowledge-base/metric", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metrics),
    });
  } catch (error) {
    return;
  }
}

export default defineBackground(() => {
  storage.defineItem("local:extension-enabled", {
    version: 1,
    fallback: false,
  });

  storage.getItem("local:extension-enabled").then((isEnabled) => {
    browser.action.setBadgeText({
      text: isEnabled ? "ON" : "",
    });
    browser.action.setBadgeBackgroundColor({
      color: isEnabled ? "#467d2c" : "#666666",
    });
  });

  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === browser.runtime.OnInstalledReason.INSTALL) {
      storage.setItem("local:install-date", new Date().toISOString());
      storage.setItem("local:version", browser.runtime.getManifest().version);

      storage.defineItem("local:intro-shown", {
        version: 1,
        fallback: false,
      });

      storage.defineItem("local:user-settings", {
        version: 1,
        fallback: null,
      });

      storage.defineItem("local:oauth", {
        version: 1,
        fallback: null,
      });

      // Send installation metrics to API
      await sendInstallationMetrics();
    }
  });

  onMessage("storeAnnotation", async (message) => {
    try {
      await storage.setItem("session:pendingAnnotation", message.data);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  });

  onMessage("getExtensionState", async () => {
    const enabled = await storage.getItem("local:extension-enabled");
    return { enabled: !!enabled };
  });

  browser.action.onClicked.addListener(async (tab) => {
    const currentState = await storage.getItem("local:extension-enabled");
    const newState = !currentState;
    await storage.setItem("local:extension-enabled", newState);

    await browser.action.setBadgeText({
      text: newState ? "ON" : "",
    });
    await browser.action.setBadgeBackgroundColor({
      color: newState ? "#467d2c" : "#666666",
    });

    if (!tab?.url) return;

    // If turning OFF and currently in our PDF viewer, redirect back to original PDF
    if (!newState && isOurPDFViewer(tab.url)) {
      try {
        const urlObj = new URL(tab.url);
        const originalURL = urlObj.searchParams.get("file");
        if (originalURL) {
          console.log(
            "[RDA Background] Redirecting back to original PDF:",
            originalURL
          );
          await browser.tabs.update(tab.id!, { url: originalURL });
          return;
        }
      } catch (error) {
        console.error(
          "[RDA Background] Failed to extract original PDF URL:",
          error
        );
      }
    }

    // If turning ON and current page is a native PDF, redirect to our viewer
    if (newState && !isOurPDFViewer(tab.url)) {
      // Check if this is a direct PDF URL (not already in our viewer)
      if (isPDFURL(tab.url)) {
        console.log("[RDA Background] Redirecting PDF after enable:", tab.url);
        const viewerUrl = getPDFViewerURL(tab.url);
        await browser.tabs.update(tab.id!, { url: viewerUrl });
        return;
      }
    }

    if (tab?.id != null) {
      try {
        await sendMessage("toggleSidebar", { action: "toggle" }, tab.id);
      } catch (error) {
        console.warn(
          "[RDA Background] Failed to send toggleSidebar message:",
          error
        );
      }
    }
  });

  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only intercept PDFs if extension is enabled
    if (changeInfo.url && !isOurPDFViewer(changeInfo.url)) {
      const isEnabled = await storage.getItem("local:extension-enabled");

      if (isEnabled && isPDFURL(changeInfo.url)) {
        const viewerUrl = getPDFViewerURL(changeInfo.url);
        await browser.tabs.update(tabId, { url: viewerUrl });
        return;
      }
    }
  });
});

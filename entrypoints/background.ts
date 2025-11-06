import { storage } from "#imports";
import { onMessage, sendMessage } from "@/utils/messaging";

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

export default defineBackground(async () => {
  storage.defineItem("local:extension-enabled", {
    version: 1,
    fallback: false,
  });

  const isEnabled = await storage.getItem("local:extension-enabled");
  await browser.action.setBadgeText({
    text: isEnabled ? "ON" : "",
  });
  await browser.action.setBadgeBackgroundColor({
    color: isEnabled ? "#467d2c" : "#666666",
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

    if (tab?.id != null) {
      await sendMessage("toggleSidebar", { action: "toggle" }, tab.id);
    }
  });

  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
      const isEnabled = await storage.getItem("local:extension-enabled");

      if (isEnabled) {
        await sendMessage("toggleSidebar", { action: "mount" }, tabId);
      }
    }
  });
});

import { storage } from "#imports";
import { onMessage, sendMessage } from "@/utils/messaging";

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener((details) => {
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

      storage.defineItem("local:extension-enabled", {
        version: 1,
        fallback: false,
      });
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

  browser.action.onClicked.addListener(async (tab) => {
    const currentState = await storage.getItem("local:extension-enabled");
    const newState = !currentState;
    await storage.setItem("local:extension-enabled", newState);

    // Update badge to show enabled/disabled state
    await browser.action.setBadgeText({
      text: newState ? "ON" : "",
    });
    await browser.action.setBadgeBackgroundColor({
      color: newState ? "#467d2c" : "#666666",
    });

    // If there's a current tab, send message to toggle it
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

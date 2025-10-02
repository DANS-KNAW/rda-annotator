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
    }
  });

  browser.action.onClicked.addListener(async (tab) => {
    if (tab?.id != null) {
      await sendMessage("toggleSidebar", undefined, tab.id);
    }
  });
});

import { Extension } from "./extension";
import { ExternalMessage } from "./messages";

/**
 * Link to survey to show users after extension is uninstalled.
 *
 * See https://github.com/hypothesis/product-backlog/issues/1599.
 */
export const uninstallURL =
  "https://docs.google.com/forms/d/e/1FAIpQLSd250Bi4xvxxvL-SgajHRmk8K1LMLZLGRoYkp6WSwT8PDTlLA/viewform?usp=sf_link";

export default defineBackground(async () => {
  const extension = new Extension();
  const initialized = extension.init();

  // Tokens indicating which features the current extension supports.
  const allFeatures = [
    // "activate" message to activate extension on current tab and
    // optionally first navigate to a different URL.
    "activate",
  ];

  browser.runtime.onInstalled.addListener(async (installDetails) => {
    // Check whether this is the inital installation or an update of an existing
    // installation.
    if (installDetails.reason === "install") {
      const extensionInfo = await browser.management.getSelf();
      extension.firstRun(extensionInfo);
    }
  });

  // Respond to messages sent by the JavaScript from https://hyp.is.
  // This is how it knows whether the user has this Chrome extension installed.
  browser.runtime.onMessageExternal.addListener(
    (request: ExternalMessage, sender, sendResponse) => {
      switch (request.type) {
        case "ping":
          {
            const queryFeatures = request.queryFeatures ?? [];
            const features = allFeatures.filter((f) =>
              queryFeatures.includes(f)
            );
            sendResponse({ type: "pong", features });
          }
          break;
        case "activate":
          {
            if (typeof sender.tab?.id !== "number") {
              return;
            }

            const { url, query } = request;
            if (url) {
              browser.tabs.update(sender.tab.id, { url });
            }

            extension.activate(sender.tab.id, {
              afterNavigationTo: url,
              query,
            });

            sendResponse({ active: true });
          }
          break;
      }
    }
  );

  browser.runtime.requestUpdateCheck?.().then(() => {
    browser.runtime.onUpdateAvailable.addListener(() =>
      browser.runtime.reload()
    );
  });

  // Show survey to users after they uninstall extension.
  browser.runtime.setUninstallURL(uninstallURL);

  await initialized;
});

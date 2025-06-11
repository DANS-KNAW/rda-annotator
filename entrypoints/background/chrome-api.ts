// The functions below are wrappers around the extension APIs for scripting
// which abstract over differences between browsers and provide a simpler and
// more strongly typed interface.

export type ExecuteScriptOptions = {
  tabId: number;
  frameId?: number;
  file: string;
};

/**
 * Execute a JavaScript file within a tab.
 */
export async function executeScript({
  tabId,
  frameId,
  file,
}: ExecuteScriptOptions): Promise<unknown> {
  const target: globalThis.Browser.scripting.InjectionTarget = { tabId };
  if (frameId) {
    target.frameIds = [frameId];
  }
  const results = await browser.scripting.executeScript({
    target,
    files: [file],
  });
  return results[0].result;
}

export type ExecuteFunctionOptions<Args extends unknown[], Result> = {
  tabId: number;
  frameId?: number;

  /**
   * Function to execute. This must be self-contained (not reference any
   * identifiers from enclosing scope).
   */
  func: (...args: Args) => Result;

  /** Arguments to pass to `func`. These must be JSON-serializable. */
  args: Args;
};

/**
 * Execute a JavaScript function within a tab.
 */
export async function executeFunction<Args extends unknown[], Result>({
  tabId,
  frameId,
  func,
  args,
}: ExecuteFunctionOptions<Args, Result>): Promise<Result> {
  const target: globalThis.Browser.scripting.InjectionTarget = { tabId };
  if (frameId) {
    target.frameIds = [frameId];
  }
  const results = await browser.scripting.executeScript({
    target,
    func,
    args,
  });
  return results[0].result as Result;
}

export function getExtensionId() {
  return browser.runtime.id;
}

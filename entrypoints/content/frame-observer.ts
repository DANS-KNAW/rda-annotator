import { ContentScriptContext } from "#imports";

export type FrameCallback = (frame: HTMLIFrameElement) => void;

export class FrameObserver {
  private observer: MutationObserver | null = null;
  private ctx: ContentScriptContext;
  private onFrameDiscovered: FrameCallback;
  private discoveredFrames = new WeakSet<HTMLIFrameElement>();

  constructor(ctx: ContentScriptContext, onFrameDiscovered: FrameCallback) {
    this.ctx = ctx;
    this.onFrameDiscovered = onFrameDiscovered;
  }

  start() {
    this.scanExistingFrames();

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;

              if (element.tagName === "IFRAME") {
                this.handleFrame(element as HTMLIFrameElement);
              }

              const iframes = element.querySelectorAll("iframe");
              iframes.forEach((iframe) => {
                this.handleFrame(iframe as HTMLIFrameElement);
              });
            }
          });
        }
      }
    });

    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    this.ctx.onInvalidated(() => {
      this.stop();
    });
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private scanExistingFrames() {
    const existingFrames = document.querySelectorAll("iframe");

    existingFrames.forEach((frame) => {
      this.handleFrame(frame as HTMLIFrameElement);
    });
  }

  private handleFrame(frame: HTMLIFrameElement) {
    if (this.discoveredFrames.has(frame)) {
      return;
    }

    this.discoveredFrames.add(frame);

    let accessible = false;
    try {
      const test = frame.contentWindow?.location.href;
      accessible = true;
    } catch (e) {
      accessible = false;
    }
    this.onFrameDiscovered(frame);
  }
}

import scrollIntoView from "scroll-into-view";

export type DurationOptions = { maxDuration?: number };

/**
 * Smoothly scroll an element into view.
 */
export async function scrollElementIntoView(
  element: HTMLElement,
  { maxDuration = 500 }: DurationOptions = {}
): Promise<void> {
  // Make the body's `tagName` return an upper-case string in XHTML documents
  // like it does in HTML documents. This is a workaround for
  // `scrollIntoView`'s detection of the <body> element. See
  // https://github.com/KoryNunn/scroll-into-view/issues/101.
  const body = element.closest("body");
  if (body && body.tagName !== "BODY") {
    Object.defineProperty(body, "tagName", {
      value: "BODY",
      configurable: true,
    });
  }

  // Ensure that the details are open before scrolling, in case the annotation
  // is within the details tag. This guarantees that the user can promptly view
  // the content on the screen.
  const details = element.closest("details");
  if (details && !details.hasAttribute("open")) {
    details.open = true;
  }

  await new Promise((resolve) =>
    scrollIntoView(element, { time: maxDuration }, resolve)
  );
}

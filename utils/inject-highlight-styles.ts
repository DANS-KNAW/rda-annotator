export function injectHighlightStyles(): void {
  if (document.getElementById('rda-highlight-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'rda-highlight-styles';
  style.textContent = `
    rda-highlight {
      background-color: rgba(174, 219, 153, 0.4) !important;
      cursor: pointer;
      transition: background-color 0.15s ease-in-out;
      display: inline !important;
    }

    rda-highlight:hover {
      background-color: rgba(135, 202, 104, 0.5) !important;
    }

    rda-highlight.rda-highlight-focused {
      background-color: rgba(70, 125, 44, 0.3) !important;
      outline: 2px solid rgba(70, 125, 44, 0.6);
      outline-offset: 1px;
    }

    body:not(.rda-highlights-visible) rda-highlight {
      background-color: transparent !important;
      cursor: inherit !important;
      outline: none !important;
    }
  `;

  document.head.appendChild(style);
}

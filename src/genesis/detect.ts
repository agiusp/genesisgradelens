// Classifies a fetched Genesis page before any detailed parsing.

export type PageState =
  | { kind: 'ok' }
  | { kind: 'signed-out' }
  | { kind: 'gradebook-unavailable'; message: string };

const UNAVAILABLE_RE = /gradebook is not available/i;

export function detectPageState(doc: Document, finalUrl: string): PageState {
  // Genesis sends signed-out users to a login form with a password field.
  if (doc.querySelector('input[type="password"]') || /\/sis\/view|login/i.test(new URL(finalUrl).pathname)) {
    return { kind: 'signed-out' };
  }

  // Read text node by node so neighboring menu labels don't run into the message.
  const walker = doc.createTreeWalker(doc.body ?? doc, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent?.trim() ?? '';
    if (UNAVAILABLE_RE.test(text)) return { kind: 'gradebook-unavailable', message: text };
  }

  return { kind: 'ok' };
}

export function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

import type { GenesisTransport } from '../../genesis/transport';

// The extension has host permission for the Genesis domain, so fetch() carries the
// user's existing Genesis session cookies. No password is ever handled here.
export const extensionTransport: GenesisTransport = {
  async get(url) {
    const res = await fetch(url, { credentials: 'include', redirect: 'follow' });
    if (!res.ok) throw new Error(`Genesis returned ${res.status} for ${new URL(url).pathname}`);
    return { url: res.url, html: await res.text() };
  },
};

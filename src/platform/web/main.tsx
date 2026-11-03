// Bookmark build: runs inside a signed-in Genesis tab. Renders GenesisGradeLens in a full-screen
// panel isolated with Shadow DOM, and reads Genesis pages from the same tab (same origin, so the
// student's existing Genesis login is used; no Genesis password ever reaches GenesisGradeLens).

import { render } from 'preact';
import { AUTH } from '../../config/auth';
import type { GenesisTransport } from '../../genesis/transport';
import { App } from '../../ui/App';
import { AuthGate } from '../../ui/AuthGate';
import themeCss from '../../ui/theme.css?inline';
import stylesCss from '../../ui/styles.css?inline';
import { detectPortal, districtFor, shadowCss } from './host';

declare global {
  interface Window {
    __ggl?: { toggle: () => void };
  }
}

const SITE = new URL('.', (document.currentScript as HTMLScriptElement | null)?.src ?? location.href).href;
const ICON = new URL('icons/icon-48.png', SITE).href;

const sameOrigin: GenesisTransport = {
  async get(url) {
    if (new URL(url).origin !== location.origin) throw new Error('GenesisGradeLens only reads pages from this Genesis site.');
    const res = await fetch(url, { credentials: 'same-origin', redirect: 'follow' });
    if (!res.ok) throw new Error(`Genesis returned ${res.status}`);
    return { url: res.url, html: await res.text() };
  },
};

function mount() {
  const hostEl = document.createElement('div');
  hostEl.id = 'genesisgradelens';
  hostEl.style.cssText = 'position:fixed;inset:0;z-index:2147483647;';
  const shadow = hostEl.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent =
    shadowCss(themeCss + '\n' + stylesCss) +
    `\n:host{all:initial}\n.ggl-body{position:absolute;inset:0;overflow-y:auto;-webkit-overflow-scrolling:touch}\n` +
    `.ggl-body .shell{min-height:100%}`;
  shadow.appendChild(style);

  const body = document.createElement('div');
  body.className = 'ggl-body';
  shadow.appendChild(body);
  document.documentElement.appendChild(hostEl);

  // Stop the Genesis page scrolling behind the panel while it's open.
  const prevOverflow = document.documentElement.style.overflow;
  const setOpen = (open: boolean) => {
    hostEl.style.display = open ? '' : 'none';
    document.documentElement.style.overflow = open ? 'hidden' : prevOverflow;
  };
  setOpen(true);
  window.__ggl = { toggle: () => setOpen(hostEl.style.display === 'none') };

  const close = () => setOpen(false);
  const scrollTop = () => body.scrollTo(0, 0);
  const active = detectPortal(location);

  render(
    active ? (
      <AuthGate config={AUTH} accountUrl={new URL('account.html', SITE).href} iconUrl={ICON}>
        {(session, signOut) => (
          <App
            transport={sameOrigin}
            district={districtFor(active)}
            iconUrl={ICON}
            scrollTop={scrollTop}
            headerActions={
              <>
                {session && (
                  <button class="topbar-button" onClick={signOut} title={`Signed in as ${session.email}`}>
                    Sign out
                  </button>
                )}
                <button class="topbar-button" onClick={close} aria-label="Close GenesisGradeLens">
                  Close ✕
                </button>
              </>
            }
          />
        )}
      </AuthGate>
    ) : (
      <div class="shell">
        <main class="content">
          <section class="card">
            <h2>Open Genesis first</h2>
            <p>
              Sign in to Genesis (for Summit students: <strong>students.summit.k12.nj.us</strong>), then tap the GenesisGradeLens
              bookmark again on that page.
            </p>
            <button class="button" onClick={close}>
              OK
            </button>
          </section>
        </main>
      </div>
    ),
    body,
  );
}

mount();

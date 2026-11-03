// All-in-one bookmark build: this whole file (bundled) lives inside the ★ GradeLens bookmark and
// runs in a signed-in Genesis tab. Genesis's signed-in pages only allow scripts and connections
// to Genesis itself, so this code makes no outside connections: it reads Genesis pages from the
// same tab (using the existing Genesis login; no Genesis password ever reaches GenesisGradeLens),
// and renders in a full-screen panel isolated with Shadow DOM.

import { render } from 'preact';
import iconUrl from '../../assets/icon-48.png'; // inlined as a data: URL (Genesis allows data: images)
import type { GenesisTransport } from '../../genesis/transport';
import { App } from '../../ui/App';
import themeCss from '../../ui/theme.css?inline';
import stylesCss from '../../ui/styles.css?inline';
import { detectPortal, districtFor, shadowCss } from './host';

declare global {
  interface Window {
    __ggl?: { toggle: () => void; version: string };
  }
}

declare const __GGL_VERSION__: string;
const SITE = 'https://agiusp.github.io/genesisgradelens/';

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
    `.ggl-body .shell{min-height:100%}\n.ggl-version{color:var(--chrome-link);font-size:.75rem;opacity:.8}`;
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
  window.__ggl = { toggle: () => setOpen(hostEl.style.display === 'none'), version: __GGL_VERSION__ };

  const close = () => setOpen(false);
  const scrollTop = () => body.scrollTo(0, 0);
  const active = detectPortal(location);

  render(
    active ? (
      <App
        transport={sameOrigin}
        district={districtFor(active)}
        iconUrl={iconUrl}
        scrollTop={scrollTop}
        headerActions={
          <>
            <span class="ggl-version" title={`Get updates at ${SITE}`}>
              v{__GGL_VERSION__}
            </span>
            <button class="topbar-button" onClick={close} aria-label="Close GenesisGradeLens">
              Close ✕
            </button>
          </>
        }
      />
    ) : (
      <div class="shell">
        <main class="content">
          <section class="card">
            <h2>Open Genesis first</h2>
            <p>
              Sign in to Genesis (for Summit students: <strong>students.summit.k12.nj.us</strong>), then click the ★ GradeLens
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

// Clicking the bookmark again toggles the panel instead of opening a second one.
if (window.__ggl) window.__ggl.toggle();
else mount();

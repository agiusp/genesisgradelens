// All-in-one bookmark build: this whole file (bundled) lives inside the ★ GradeLens bookmark and
// runs in a signed-in Genesis tab. Genesis's signed-in pages only allow scripts and connections
// to Genesis itself, so this code makes no outside connections: it reads Genesis pages from the
// same tab (using the existing Genesis login; no Genesis password ever reaches GenesisGradeLens),
// and renders in a full-screen panel isolated with Shadow DOM.

import { render, type ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { daysLeft, formatDate, verifyLicense, type LicenseCheck } from '../../auth/license';
import { AUTH } from '../../config/auth';
import { LICENSE_PUBLIC_KEY } from '../../config/license';
import iconUrl from '../../assets/icon-48.png'; // inlined as a data: URL (Genesis allows data: images)
import type { GenesisTransport } from '../../genesis/transport';
import { App } from '../../ui/App';
import themeCss from '../../ui/theme.css?inline';
import stylesCss from '../../ui/styles.css?inline';
import { detectPortal, districtFor, shadowCss } from './host';

declare global {
  interface Window {
    __ggl?: { toggle: () => void; version: string };
    /** This user's signed pass; the install page puts it at the front of their bookmark. */
    __gglLicense?: string;
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

// Passes are required once GenesisGradeLens sign-in is set up (see src/auth/license.ts).
const PASS_KEY = AUTH ? LICENSE_PUBLIC_KEY : null;

function Message({ title, children, close }: { title: string; children: ComponentChildren; close: () => void }) {
  return (
    <div class="shell">
      <main class="content">
        <section class="card">
          <h2>{title}</h2>
          {children}
          <button class="button" onClick={close}>
            OK
          </button>
        </section>
      </main>
    </div>
  );
}

const siteLink = (
  <a href={SITE} target="_blank" rel="noopener">
    {SITE.replace(/^https:\/\//, '').replace(/\/$/, '')}
  </a>
);

/** Shows the app only with a valid, unexpired pass for this bookmark. */
function PassGate({ token, close, children }: { token?: string; close: () => void; children: (note: string) => ComponentChildren }) {
  const [check, setCheck] = useState<LicenseCheck | 'checking' | 'off'>(PASS_KEY ? 'checking' : 'off');
  useEffect(() => {
    if (PASS_KEY) void verifyLicense(token, PASS_KEY).then(setCheck);
  }, [token]);

  if (check === 'off') return <>{children('')}</>;
  if (check === 'checking') return null;
  if (check.ok) {
    const left = daysLeft(check.license);
    return <>{children(left <= 5 ? `Bookmark expires ${left === 0 ? 'today' : `in ${left} day${left === 1 ? '' : 's'}`}` : '')}</>;
  }
  if (check.reason === 'expired') {
    return (
      <Message title="Time to renew your bookmark" close={close}>
        <p>
          Your ★ GradeLens bookmark expired on {formatDate(check.license.exp)}. Sign in at {siteLink} and replace your bookmark with the new
          one. It takes about a minute.
        </p>
      </Message>
    );
  }
  return (
    <Message title="Sign in to get your bookmark" close={close}>
      <p>
        This bookmark isn't linked to a GenesisGradeLens account. Sign in at {siteLink} to get your own ★ GradeLens bookmark, then replace
        this one.
      </p>
    </Message>
  );
}

function mount(token?: string) {
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
      <PassGate token={token} close={close}>
        {(note) => (
          <App
            transport={sameOrigin}
            district={districtFor(active)}
            iconUrl={iconUrl}
            scrollTop={scrollTop}
            headerActions={
              <>
                <span class="ggl-version" title={`Get updates at ${SITE}`}>
                  {note ? `${note} · ` : ''}v{__GGL_VERSION__}
                </span>
                <button class="topbar-button" onClick={close} aria-label="Close GenesisGradeLens">
                  Close ✕
                </button>
              </>
            }
          />
        )}
      </PassGate>
    ) : (
      <div class="shell">
        <main class="content">
          <section class="card">
            <h2>Open Genesis first</h2>
            <p>
              Sign in to Genesis (for Summit students: <strong>students.summit.k12.nj.us</strong>), then click the ★ GradeLens bookmark
              again on that page.
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
const token = window.__gglLicense;
delete window.__gglLicense;
if (window.__ggl) window.__ggl.toggle();
else mount(token);

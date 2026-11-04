import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { formatDate } from '../src/auth/license';
import type { Session } from '../src/auth/supabase';
import { AUTH } from '../src/config/auth';
import { LICENSE_PUBLIC_KEY } from '../src/config/license';
import { bookmarkletFromCode } from '../src/platform/web/host';
import { AuthGate } from '../src/ui/AuthGate';
import '../src/ui/fonts.css';
import '../src/ui/theme.css';
import '../src/ui/styles.css';
import './site.css';

declare const __GGL_VERSION__: string;
const ACCOUNT_URL = new URL('account.html', location.href).href;

type BookmarkState = { code: string; kb: number; exp?: number } | { error: string } | null;

/** Asks the GenesisGradeLens Supabase function for this user's signed pass (see src/auth/license.ts). */
async function fetchPass(session: Session): Promise<{ license: string; exp: number }> {
  const res = await fetch(`${AUTH!.supabaseUrl}/functions/v1/issue-license`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.accessToken}`, apikey: AUTH!.anonKey },
  }).catch(() => {
    throw new Error("couldn't reach the sign-in service. If this keeps happening, it may be paused; let the site owner know");
  });
  const body = (await res.json().catch(() => ({}))) as { license?: string; exp?: number; error?: string };
  if (!res.ok || !body.license || !body.exp) throw new Error(body.error || `sign-in service error ${res.status}`);
  return { license: body.license, exp: body.exp };
}

/**
 * Builds the all-in-one bookmark from this site's copy of the app (ggl.js). Once sign-in is set
 * up, the user's personal pass goes at the front, where the app checks it.
 */
function useBookmark(session: Session | null) {
  const [state, setState] = useState<BookmarkState>(null);
  useEffect(() => {
    const needsPass = !!(AUTH && LICENSE_PUBLIC_KEY && session);
    Promise.all([
      fetch('./ggl.js', { cache: 'no-cache' }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`ggl.js: ${r.status}`)))),
      needsPass ? fetchPass(session!) : Promise.resolve(null),
    ])
      .then(([js, pass]) => {
        const code = bookmarkletFromCode((pass ? `window.__gglLicense=${JSON.stringify(pass.license)};` : '') + js);
        setState({ code, kb: Math.round(code.length / 1024), exp: pass?.exp });
      })
      .catch((e) => setState({ error: e instanceof Error ? e.message : String(e) }));
  }, [session]);
  return state;
}

function Bookmark({ session, onSignOut }: { session: Session | null; onSignOut: () => void }) {
  const email = session?.email ?? null;
  const bm = useBookmark(session);
  const exp = bm && 'exp' in bm ? bm.exp : undefined;
  const [copied, setCopied] = useState(false);
  const code = bm && 'code' in bm ? bm.code : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      (document.getElementById('code') as HTMLTextAreaElement | null)?.select();
    }
  };

  return (
    <>
      {email && (
        <div class="toolbar">
          <span class="muted small">Signed in as {email}</span>
          <button class="link-button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      )}

      <section class="card">
        <h2>1. Add the bookmark</h2>
        {!bm && <p class="muted">Preparing your bookmark…</p>}
        {bm && 'error' in bm && <p class="status-missing">Couldn't prepare the bookmark ({bm.error}). Reload the page to try again.</p>}
        {code && exp && (
          <p class="small">
            This bookmark is <strong>yours</strong> ({email}) and works until <strong>{formatDate(exp)}</strong>. Before then, come back,
            sign in and replace it with a fresh one. Please don't share it; anyone who needs access can ask for their own account.
          </p>
        )}
        {code && (
          <>
            <h3>Chromebook or computer (Chrome)</h3>
            <ol>
              <li>
                Show the bookmarks bar: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd> (Mac: <kbd>⌘</kbd> + <kbd>Shift</kbd> +{' '}
                <kbd>B</kbd>).
              </li>
              <li>
                Drag this button onto the bookmarks bar:{' '}
                <a class="bookmarklet" href={code} onClick={(e) => e.preventDefault()} title="Drag me to your bookmarks bar">
                  ★ GradeLens
                </a>
              </li>
            </ol>
            <details>
              <summary>Dragging doesn't work? Add it by hand</summary>
              <ol>
                <li>
                  <button class="button secondary" onClick={copy}>
                    {copied ? 'Copied ✓' : 'Copy bookmark'}
                  </button>
                </li>
                <li>
                  Open the bookmark manager: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>O</kbd> (Mac: <kbd>⌘</kbd> + <kbd>Option</kbd> +{' '}
                  <kbd>B</kbd>) and click <strong>Bookmarks bar</strong> on the left.
                </li>
                <li>
                  Click <strong>⋮</strong> (top right) → <strong>Add new bookmark</strong>. Name: <strong>GradeLens</strong>. URL: paste.
                  Save.
                </li>
              </ol>
              <p class="muted small">The bookmark is long (about {bm && 'kb' in bm ? bm.kb : '…'} KB) because the whole app lives inside it. That's expected.</p>
            </details>

            <h3>iPhone or iPad (Safari)</h3>
            <ol>
              <li>
                Tap{' '}
                <button class="button secondary small-btn" onClick={copy}>
                  {copied ? 'Copied ✓' : 'Copy bookmark'}
                </button>
              </li>
              <li>
                Tap Share → <strong>Add Bookmark</strong> → Save.
              </li>
              <li>
                Open Bookmarks → <strong>Edit</strong> → tap the new bookmark → rename it <strong>GradeLens</strong>, replace the address with
                the copied text → Done.
              </li>
            </ol>
          </>
        )}
      </section>

      <section class="card">
        <h2>2. Use it</h2>
        <ol>
          <li>
            Sign in to Genesis: students at <strong>students.summit.k12.nj.us</strong>, parents at <strong>parents.summit.k12.nj.us</strong>.
          </li>
          <li>
            Click <strong>★ GradeLens</strong> on any Genesis page. Click it again (or <strong>Close ✕</strong>) to hide it.
          </li>
          <li>Tap a course to see how it's graded; switch to <strong>What if…</strong> to try scores.</li>
        </ol>
        <p class="muted small">
          <strong>Updates:</strong> the app lives inside your bookmark, so it doesn't update itself. This is version{' '}
          <strong>{__GGL_VERSION__}</strong>; your bookmark shows its version at the top of the app. When there's a new one, come back
          here and replace the bookmark.
        </p>
        <p class="muted small">
          On a school Chromebook, if the bookmark does nothing, the school may block bookmarks like this. Please don't try to work around
          school settings; use a home device instead.
        </p>
      </section>
    </>
  );
}

function Install() {
  return (
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <img src="./icons/icon-48.png" alt="" />
          <h1>GenesisGradeLens</h1>
        </div>
        <span class="district">Summit Public Schools (NJ)</span>
      </header>
      <main class="content site">
        <section class="card">
          <h2>See how your grades are built</h2>
          <p>
            GenesisGradeLens shows every course's grade from Genesis next to its own calculation, how each category and assignment counts,
            and what-if scores for upcoming work.
          </p>
          <p class="muted small">
            It runs as a <strong>bookmark</strong>: sign in to Genesis as usual, then click the bookmark. It reads your grades in that same
            tab and doesn't send them anywhere. Your Genesis password never leaves Genesis.
          </p>
        </section>

        <AuthGate config={AUTH} accountUrl={ACCOUNT_URL} iconUrl="./icons/icon-48.png">
          {(session, signOut) => <Bookmark session={session} onSignOut={signOut} />}
        </AuthGate>

        <p class="muted small">
          GenesisGradeLens is an independent project, not affiliated with Genesis Educational Services or Summit Public Schools.
        </p>
      </main>
    </div>
  );
}

render(<Install />, document.getElementById('app')!);

import { render } from 'preact';
import { useState } from 'preact/hooks';
import { bookmarkletFor } from '../src/platform/web/host';
import '../src/ui/fonts.css';
import '../src/ui/theme.css';
import '../src/ui/styles.css';
import './site.css';

const SITE = new URL('.', location.href).href;
const CODE = bookmarkletFor(SITE);

function Install() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CODE);
      setCopied(true);
    } catch {
      (document.getElementById('code') as HTMLTextAreaElement | null)?.select();
    }
  };

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
            GenesisGradeLens shows every course's grade from Genesis next to its own calculation, how each category and assignment
            counts, and what-if scores for upcoming work.
          </p>
          <p class="muted small">
            It runs as a <strong>bookmark</strong>: sign in to Genesis as usual, then tap the bookmark. It reads your grades in that
            same tab. Your Genesis password never leaves Genesis, and nothing is installed. You need a GenesisGradeLens account
            (ask whoever invited you).
          </p>
        </section>

        <section class="card">
          <h2>1. Add the bookmark</h2>
          <h3>Chromebook or computer</h3>
          <ol>
            <li>
              Show the bookmarks bar: press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd> (Mac: <kbd>⌘</kbd> + <kbd>Shift</kbd> +{' '}
              <kbd>B</kbd>).
            </li>
            <li>
              Drag this button onto the bookmarks bar:{' '}
              <a class="bookmarklet" href={CODE} onClick={(e) => e.preventDefault()} title="Drag me to your bookmarks bar">
                ★ GradeLens
              </a>
            </li>
          </ol>
          <details>
            <summary>Dragging doesn't work? Add it by hand</summary>
            <ol>
              <li>
                <button class="button secondary" onClick={copy}>
                  {copied ? 'Copied ✓' : 'Copy bookmark code'}
                </button>
              </li>
              <li>
                Right-click the bookmarks bar → <strong>Add page…</strong> (or press <kbd>Ctrl</kbd> + <kbd>D</kbd> on any page and
                choose <strong>More…</strong>).
              </li>
              <li>
                Name: <strong>GradeLens</strong>. URL: paste the code. Save.
              </li>
            </ol>
            <textarea id="code" readOnly rows={3} value={CODE} aria-label="Bookmark code" />
          </details>

          <h3>iPhone or iPad (Safari)</h3>
          <ol>
            <li>
              Tap <button class="button secondary small-btn" onClick={copy}>{copied ? 'Copied ✓' : 'Copy bookmark code'}</button>
            </li>
            <li>
              Tap the Share button → <strong>Add Bookmark</strong> → Save (this bookmarks this page).
            </li>
            <li>
              Open Bookmarks, tap <strong>Edit</strong>, tap the new bookmark, rename it <strong>GradeLens</strong>, replace the address
              with the copied code, and tap Done.
            </li>
          </ol>
        </section>

        <section class="card">
          <h2>2. Use it</h2>
          <ol>
            <li>
              Sign in to Genesis: students at <strong>students.summit.k12.nj.us</strong>, parents at{' '}
              <strong>parents.summit.k12.nj.us</strong>.
            </li>
            <li>
              Tap <strong>★ GradeLens</strong>. Sign in with your GenesisGradeLens account the first time.
            </li>
            <li>Tap a course to see how it's graded; switch to <strong>What if…</strong> to try scores.</li>
          </ol>
          <p class="muted small">
            On a school Chromebook, if the bookmark does nothing, the school may block bookmarks like this. Please don't try to work
            around school settings; use a home device instead.
          </p>
        </section>

        <p class="muted small">
          GenesisGradeLens is an independent project, not affiliated with Genesis Educational Services or Summit Public Schools.
        </p>
      </main>
    </div>
  );
}

render(<Install />, document.getElementById('app')!);

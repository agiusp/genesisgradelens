// Landing page for Supabase invite and password-reset links: the user sets their
// GenesisGradeLens password here. The link carries a short-lived token in the URL #fragment.

import { render } from 'preact';
import { useState } from 'preact/hooks';
import { setPassword } from '../src/auth/supabase';
import { AUTH } from '../src/config/auth';
import '../src/ui/fonts.css';
import '../src/ui/theme.css';
import '../src/ui/styles.css';
import './site.css';

const params = new URLSearchParams(location.hash.slice(1));
const token = params.get('access_token');
const type = params.get('type'); // "invite" | "recovery" | ...
const linkError = params.get('error_description');
// Drop the token from the address bar and history.
if (location.hash) history.replaceState(null, '', location.pathname);

function Account() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [state, setState] = useState<'form' | 'busy' | 'done'>('form');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (pw.length < 8) return setError('Use at least 8 characters.');
    if (pw !== pw2) return setError("The two passwords don't match.");
    setState('busy');
    setError(null);
    try {
      await setPassword(AUTH!, token!, pw);
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set the password');
      setState('form');
    }
  };

  let content;
  if (!AUTH) content = <p>Sign-in isn't set up for this site yet.</p>;
  else if (linkError) content = <p>This link didn't work: {linkError}. Ask for a new invite, or use “Forgot password” in the app.</p>;
  else if (!token) content = <p>Open this page from the link in your invite or password-reset email.</p>;
  else if (state === 'done')
    content = (
      <>
        <h2>All set</h2>
        <p>Your password is saved. Open Genesis, tap the ★ GradeLens bookmark and sign in.</p>
        <a class="button" href="./">
          How to add the bookmark
        </a>
      </>
    );
  else
    content = (
      <form class="add-form" onSubmit={submit}>
        <h2>{type === 'invite' ? 'Welcome! Choose a password' : 'Choose a new password'}</h2>
        <p class="muted small">This is your GenesisGradeLens password. Don't reuse your Genesis or school password.</p>
        <label>
          New password
          <input type="password" autoComplete="new-password" value={pw} onInput={(e) => setPw((e.target as HTMLInputElement).value)} required />
        </label>
        <label>
          Type it again
          <input type="password" autoComplete="new-password" value={pw2} onInput={(e) => setPw2((e.target as HTMLInputElement).value)} required />
        </label>
        {error && <p class="small status-missing">{error}</p>}
        <button class="button" type="submit" disabled={state === 'busy'}>
          {state === 'busy' ? 'Saving…' : 'Save password'}
        </button>
      </form>
    );

  return (
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <img src="./icons/icon-48.png" alt="" />
          <h1>GenesisGradeLens</h1>
        </div>
      </header>
      <main class="content site">
        <section class="card">{content}</section>
      </main>
    </div>
  );
}

render(<Account />, document.getElementById('app')!);

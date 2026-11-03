import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { AuthConfig } from '../config/auth';
import { resumeSession, sendPasswordReset, signIn, signOut, type Session } from '../auth/supabase';

interface Props {
  config: AuthConfig | null;
  /** account.html on the GenesisGradeLens site (for password-reset links). */
  accountUrl: string;
  iconUrl: string;
  children: (session: Session | null, signOut: () => void) => ComponentChildren;
}

type State = { kind: 'checking' } | { kind: 'signed-out' } | { kind: 'signed-in'; session: Session };

export function AuthGate({ config, accountUrl, iconUrl, children }: Props) {
  const [state, setState] = useState<State>({ kind: 'checking' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (!config) return;
    resumeSession(config).then((s) => setState(s ? { kind: 'signed-in', session: s } : { kind: 'signed-out' }));
  }, [config]);

  if (!config) {
    return (
      <>
        <div class="setup-banner">GenesisGradeLens sign-in isn't set up yet, so anyone with the bookmark can use it.</div>
        {children(null, () => undefined)}
      </>
    );
  }

  if (state.kind === 'checking') return <p class="card gate-wait">Checking your GenesisGradeLens sign-in…</p>;

  if (state.kind === 'signed-in') {
    return (
      <>
        {children(state.session, () => {
          void signOut(config);
          setState({ kind: 'signed-out' });
        })}
      </>
    );
  }

  const submit = async (e: Event) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const session = await signIn(config, email.trim(), password);
      setPassword('');
      setState({ kind: 'signed-in', session });
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Sign-in failed' });
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email.trim()) {
      setMessage({ kind: 'error', text: 'Type your email first, then tap “Forgot password”.' });
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(config, email.trim(), accountUrl);
      setMessage({ kind: 'info', text: 'If that email has access, a reset link is on its way.' });
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Could not send the reset email' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="gate">
      <form class="card gate-card" onSubmit={submit}>
        <div class="brand gate-brand">
          <img src={iconUrl} alt="" />
          <h2>GenesisGradeLens</h2>
        </div>
        <p class="muted small">
          Sign in with the GenesisGradeLens account you were invited to. This is <strong>not</strong> your Genesis password.
        </p>
        <label>
          Email
          <input type="email" autoComplete="username" value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} required />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
            required
          />
        </label>
        {message && <p class={`small ${message.kind === 'error' ? 'status-missing' : 'muted'}`}>{message.text}</p>}
        <button class="button" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <button class="link-button" type="button" onClick={reset} disabled={busy}>
          Forgot password
        </button>
      </form>
    </div>
  );
}

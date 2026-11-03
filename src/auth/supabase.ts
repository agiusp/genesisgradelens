// Minimal Supabase Auth client (email + password, invite-only). Talks to the Supabase REST API
// directly to keep the bookmark script small.

import type { AuthConfig } from '../config/auth';

export interface Session {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms */
  expiresAt: number;
  email: string;
}

const STORE_KEY = 'ggl:auth';

async function call<T>(cfg: AuthConfig, path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const res = await fetch(`${cfg.supabaseUrl}/auth/v1/${path}`, {
    ...init,
    headers: {
      apikey: cfg.anonKey,
      'Content-Type': 'application/json',
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (body as { error_description?: string; msg?: string; message?: string });
    throw new Error(msg.error_description || msg.msg || msg.message || `Sign-in service error ${res.status}`);
  }
  return body as T;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { email?: string };
}

const toSession = (t: TokenResponse): Session => ({
  accessToken: t.access_token,
  refreshToken: t.refresh_token,
  expiresAt: Date.now() + t.expires_in * 1000,
  email: t.user?.email ?? '',
});

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function store(s: Session | null) {
  try {
    if (s) localStorage.setItem(STORE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}

export async function signIn(cfg: AuthConfig, email: string, password: string): Promise<Session> {
  const s = toSession(
    await call<TokenResponse>(cfg, 'token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) }),
  );
  store(s);
  return s;
}

/** Returns a valid session (refreshing if needed), or null if the user must sign in again. */
export async function resumeSession(cfg: AuthConfig): Promise<Session | null> {
  const s = loadSession();
  if (!s) return null;
  if (s.expiresAt - Date.now() > 60_000) return s;
  try {
    const fresh = toSession(
      await call<TokenResponse>(cfg, 'token?grant_type=refresh_token', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: s.refreshToken }),
      }),
    );
    store(fresh);
    return fresh;
  } catch {
    store(null); // revoked, deleted user, or expired refresh token
    return null;
  }
}

export async function signOut(cfg: AuthConfig): Promise<void> {
  const s = loadSession();
  store(null);
  if (s) await call(cfg, 'logout', { method: 'POST', token: s.accessToken }).catch(() => undefined);
}

export async function sendPasswordReset(cfg: AuthConfig, email: string, redirectTo: string): Promise<void> {
  await call(cfg, `recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/** Used by account.html after an invite or reset link: set the user's password. */
export async function setPassword(cfg: AuthConfig, accessToken: string, password: string): Promise<void> {
  await call(cfg, 'user', { method: 'PUT', token: accessToken, body: JSON.stringify({ password }) });
}

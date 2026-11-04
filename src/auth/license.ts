// Personal, expiring bookmark passes ("licenses").
//
// Genesis's signed-in pages block every connection outside Genesis, so the bookmark can't ask a
// server whether its user may still use the app. Instead, the install page asks the
// GenesisGradeLens Supabase function (supabase/functions/issue-license) for a pass after the user
// signs in, and builds it into their bookmark. The pass names the user and an expiry date and is
// signed with a private key only that function has; the app checks the signature against the
// public key in src/config/license.ts using the browser's built-in WebCrypto (no connection).
//
// Format: "v1.<base64url JSON payload>.<base64url ECDSA P-256 / SHA-256 signature>", where the
// signature covers the text "v1.<payload>". The Supabase function builds the same format.

export interface License {
  email: string;
  /** Issued at, Unix seconds */
  iat: number;
  /** Expires at, Unix seconds */
  exp: number;
}

export type LicenseCheck =
  | { ok: true; license: License }
  | { ok: false; reason: 'missing' | 'invalid' }
  | { ok: false; reason: 'expired'; license: License };

const ALG = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const SIG = { name: 'ECDSA', hash: 'SHA-256' } as const;
const PREFIX = 'v1.';

export function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('bad base64url');
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const utf8 = (s: string) => new TextEncoder().encode(s);

/** Builds a pass. The real signer is the Supabase function; this is used by tests. */
export async function signLicense(license: License, privateKey: CryptoKey): Promise<string> {
  const body = PREFIX + b64urlEncode(utf8(JSON.stringify(license)));
  const sig = new Uint8Array(await crypto.subtle.sign(SIG, privateKey, utf8(body)));
  return `${body}.${b64urlEncode(sig)}`;
}

/** Checks a pass's signature and expiry, offline. */
export async function verifyLicense(token: string | undefined | null, publicJwk: JsonWebKey, nowMs = Date.now()): Promise<LicenseCheck> {
  if (!token) return { ok: false, reason: 'missing' };
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'v1') return { ok: false, reason: 'invalid' };
    const { kty, crv, x, y } = publicJwk;
    const key = await crypto.subtle.importKey('jwk', { kty, crv, x, y }, ALG, false, ['verify']);
    const good = await crypto.subtle.verify(SIG, key, b64urlDecode(parts[2]), utf8(`${parts[0]}.${parts[1]}`));
    if (!good) return { ok: false, reason: 'invalid' };
    const lic = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1]))) as License;
    if (typeof lic.email !== 'string' || typeof lic.exp !== 'number' || typeof lic.iat !== 'number') return { ok: false, reason: 'invalid' };
    if (lic.exp * 1000 <= nowMs) return { ok: false, reason: 'expired', license: lic };
    return { ok: true, license: lic };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

/** Whole days left on a pass (0 on its last day). */
export const daysLeft = (lic: License, nowMs = Date.now()) => Math.max(0, Math.floor((lic.exp * 1000 - nowMs) / 86_400_000));

export const formatDate = (unixSeconds: number) =>
  new Date(unixSeconds * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

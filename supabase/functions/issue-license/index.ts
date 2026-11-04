// Supabase Edge Function: issue-license
//
// Called by the GenesisGradeLens install page right after a user signs in. Confirms the sign-in
// with Supabase Auth (so deleted users are refused), then returns a pass, valid for LICENSE_DAYS,
// signed with LICENSE_PRIVATE_KEY. The pass is built into that user's bookmark; the app checks it
// offline against the public key in src/config/license.ts. Same format as src/auth/license.ts.
//
// Secrets (set with `supabase secrets set`):
//   LICENSE_PRIVATE_KEY  required; the private JWK from scripts/make-license-keys.mjs
//   LICENSE_DAYS         optional; default 30
//   ALLOWED_ORIGINS      optional; comma-separated sites allowed to call this function
// SUPABASE_URL and SUPABASE_ANON_KEY are provided by Supabase automatically.

const DAYS = Number(Deno.env.get('LICENSE_DAYS') ?? '30');
const ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://agiusp.github.io,http://localhost:8080,http://127.0.0.1:8080')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

let signingKey: Promise<CryptoKey> | null = null;
const getKey = () =>
  (signingKey ??= crypto.subtle.importKey(
    'jwk',
    JSON.parse(Deno.env.get('LICENSE_PRIVATE_KEY') ?? 'null'),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  ));

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin') ?? '';
  const cors: Record<string, string> = {
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    Vary: 'Origin',
  };
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'Use POST.' });

  // Confirm the caller is a current GenesisGradeLens user (deleted users fail here).
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return reply(401, { error: 'Please sign in again.' });
  const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: ANON_KEY } });
  if (!who.ok) return reply(401, { error: 'Please sign in again.' });
  const user = (await who.json()) as { email?: string; is_anonymous?: boolean };
  if (!user.email || user.is_anonymous) return reply(403, { error: 'This account can’t get a bookmark.' });

  try {
    const iat = Math.floor(Date.now() / 1000);
    const payload = { email: user.email, iat, exp: iat + Math.round(DAYS * 86400) };
    const body = 'v1.' + b64url(new TextEncoder().encode(JSON.stringify(payload)));
    const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await getKey(), new TextEncoder().encode(body)));
    return reply(200, { license: `${body}.${b64url(sig)}`, exp: payload.exp });
  } catch (e) {
    console.error('issue-license: signing failed', e);
    signingKey = null;
    return reply(500, { error: 'The bookmark service isn’t set up correctly.' });
  }
});

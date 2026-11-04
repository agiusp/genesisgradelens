// Creates the key pair for bookmark passes.
//   Public key  -> src/config/license.ts (committed; built into the app)
//   Private key -> .secrets/license-private.jwk.json (never committed; goes to Supabase as a secret)
// Usage: node scripts/make-license-keys.mjs [--force]
// --force makes a NEW pair, which invalidates every bookmark already handed out.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const PRIVATE = new URL('../.secrets/license-private.jwk.json', import.meta.url);
const PUBLIC_TS = new URL('../src/config/license.ts', import.meta.url);

if (existsSync(PRIVATE) && !process.argv.includes('--force')) {
  console.error('A key already exists in .secrets/. Re-run with --force to replace it (all current bookmarks will stop working).');
  process.exit(1);
}

const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const priv = await crypto.subtle.exportKey('jwk', pair.privateKey);
const { kty, crv, x, y } = await crypto.subtle.exportKey('jwk', pair.publicKey);

mkdirSync(new URL('../.secrets/', import.meta.url), { recursive: true });
writeFileSync(PRIVATE, JSON.stringify(priv), { mode: 0o600 });
writeFileSync(
  PUBLIC_TS,
  `// Public key that checks bookmark passes (see src/auth/license.ts). Made by
// scripts/make-license-keys.mjs; its private half lives only in Supabase (LICENSE_PRIVATE_KEY).
// Public by design. Passes are only checked once AUTH in src/config/auth.ts is set.

export const LICENSE_PUBLIC_KEY: JsonWebKey | null = ${JSON.stringify({ kty, crv, x, y })};
`,
);
console.log('Wrote src/config/license.ts (public) and .secrets/license-private.jwk.json (private, keep it out of git).');

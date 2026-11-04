// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { b64urlDecode, b64urlEncode, daysLeft, signLicense, verifyLicense, type License } from './license';

const ALG = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const keys = () => crypto.subtle.generateKey(ALG, true, ['sign', 'verify']) as Promise<CryptoKeyPair>;
const now = Date.UTC(2026, 10, 4);
const lic: License = { email: 'parent@example.com', iat: now / 1000, exp: now / 1000 + 30 * 86400 };

describe('license', () => {
  it('round-trips base64url', () => {
    const bytes = new Uint8Array([0, 251, 255, 62, 63, 1]);
    expect([...b64urlDecode(b64urlEncode(bytes))]).toEqual([...bytes]);
    expect(b64urlEncode(bytes)).not.toMatch(/[+/=]/);
  });

  it('accepts a valid pass and reports days left', async () => {
    const k = await keys();
    const pub = await crypto.subtle.exportKey('jwk', k.publicKey);
    const token = await signLicense(lic, k.privateKey);
    const r = await verifyLicense(token, pub, now);
    expect(r).toEqual({ ok: true, license: lic });
    expect(daysLeft(lic, now)).toBe(30);
  });

  it('rejects expired, tampered, foreign-key and missing passes', async () => {
    const k = await keys();
    const other = await keys();
    const pub = await crypto.subtle.exportKey('jwk', k.publicKey);
    const token = await signLicense(lic, k.privateKey);

    expect(await verifyLicense(token, pub, (lic.exp + 1) * 1000)).toMatchObject({ ok: false, reason: 'expired' });

    const [v, , sig] = token.split('.');
    const forged = b64urlEncode(new TextEncoder().encode(JSON.stringify({ ...lic, exp: lic.exp + 999999 })));
    expect(await verifyLicense(`${v}.${forged}.${sig}`, pub, now)).toEqual({ ok: false, reason: 'invalid' });

    expect(await verifyLicense(await signLicense(lic, other.privateKey), pub, now)).toEqual({ ok: false, reason: 'invalid' });
    expect(await verifyLicense('garbage', pub, now)).toEqual({ ok: false, reason: 'invalid' });
    expect(await verifyLicense(undefined, pub, now)).toEqual({ ok: false, reason: 'missing' });
  });
});

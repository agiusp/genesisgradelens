// Public key that checks bookmark passes (see src/auth/license.ts). Made by
// scripts/make-license-keys.mjs; its private half lives only in Supabase (LICENSE_PRIVATE_KEY).
// Public by design. Passes are only checked once AUTH in src/config/auth.ts is set.

export const LICENSE_PUBLIC_KEY: JsonWebKey | null = {"kty":"EC","crv":"P-256","x":"x8Hfmj0lCEgfGFXoNndv8BkskfENvPFMJhxXgRw_kZw","y":"wwZ4RCoBhQcGwbGrluupXpvfOMP_F5gRl4RJ8pcSLCs"};

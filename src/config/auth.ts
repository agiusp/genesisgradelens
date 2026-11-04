// GenesisGradeLens's own sign-in (who may use the app), separate from the Genesis login.
// Uses a Supabase project with public sign-ups turned OFF: only people you invite can sign in.
// See docs/hosting-setup.md. Both values below are public by design (the "anon" key is meant
// to ship in browser code); never put the "service_role" key here.

export interface AuthConfig {
  /** e.g. https://abcdefgh.supabase.co */
  supabaseUrl: string;
  /** Project's anon / publishable key. */
  anonKey: string;
}

// While null, the app shows a "sign-in not set up" banner and does not restrict access.
export const AUTH: AuthConfig | null = {
  supabaseUrl: 'https://qjzpzansjqifqpwgncba.supabase.co',
  anonKey: 'sb_publishable_8U28E1-a28ceitYjQnNS4A_5buD1P8w',
};

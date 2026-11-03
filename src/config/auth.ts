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

// Fill these in after creating the Supabase project. While null, the app shows a
// "sign-in not set up" banner and does not restrict access.
export const AUTH: AuthConfig | null = null;

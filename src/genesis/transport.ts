// The only platform-specific piece: how a Genesis page is fetched with the user's login.
//  - Chrome extension: fetch() with the browser's existing Genesis cookies.
//  - Phone app (later): native HTTP using cookies from an in-app Genesis sign-in.
// Everything above this (parsers, grade engine, UI) is shared.

export interface FetchedPage {
  /** Final URL after redirects (a redirect to the login page means signed out). */
  url: string;
  html: string;
}

export interface GenesisTransport {
  get(url: string): Promise<FetchedPage>;
}

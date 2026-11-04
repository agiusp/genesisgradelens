# Hosting GenesisGradeLens online (bookmark version)

The online version is four pieces, all free:

| Piece | Where | What it does |
|---|---|---|
| Website | GitHub Pages (this repo) | Install page and account page; hands out the bookmark |
| Bookmark | Each user's browser | The whole app (`ggl.js`) plus that user's personal pass, run inside their signed-in Genesis tab |
| Sign-in | Supabase Auth (free tier) | GenesisGradeLens accounts. Invite-only, so you decide who can use it |
| Pass signer | Supabase Edge Function `issue-license` | Gives each signed-in user a pass, valid for 30 days, that goes inside their bookmark |

Genesis passwords never reach any of these. The app reads grades from inside the user's own
Genesis tab.

**Why passes:** Genesis's signed-in pages block every connection outside Genesis, so the bookmark
can't check with Supabase when it opens. Instead, the pass inside the bookmark carries the user's
email and an expiry date, signed with a private key that only your Supabase function has. The app
checks the signature with a public key built into it (`src/config/license.ts`), without
connecting anywhere. A bookmark that's expired, edited, or made without signing in shows a
"sign in to get your bookmark" screen instead of grades.

## 1. Publish the website (GitHub Pages)

1. Create a repository on GitHub (e.g. `genesisgradelens`). Free GitHub Pages needs a public repo.
   The code has no secrets or student data. Real Genesis pages and the private key are kept out by
   `.gitignore`.
2. Push this project to it (`main` branch).
3. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. The **Deploy website** workflow runs on each push. Your site appears at
   `https://<your-username>.github.io/<repo>/`.

**Security:** the bookmark runs this site's code inside people's signed-in Genesis tabs. Anyone
who can push to this repo can change that code, so turn on two-factor authentication for your
GitHub account and don't add collaborators you wouldn't trust with your kids' Genesis sessions.

## 2. Create the Supabase project

The free plan allows two active projects per organization, so this can sit next to an existing one.

1. supabase.com → **New project**. Name it `genesisgradelens`; pick any region and database password
   (the app doesn't use the database).
2. **Authentication → Sign In / Providers**:
   - **Email**: on.
   - **Allow new users to sign up**: **off**. This makes it invite-only.
   - Turn off every other provider.
3. **Authentication → URL Configuration**:
   - **Site URL**: `https://<your-username>.github.io/<repo>/account.html`
   - **Redirect URLs**: add the same address.
4. **Project Settings → API** (or **API Keys**): note the **Project URL** and the
   **anon / publishable** key. Never copy the `service_role` / secret key anywhere in this project.
5. Note the **project ref**: the `abcdefgh` in `https://abcdefgh.supabase.co`.

## 3. Install the pass signer

The key pair was made by `node scripts/make-license-keys.mjs`. The public half is in
`src/config/license.ts`; the private half is `.secrets/license-private.jwk.json` on the computer
that ran the script (never in git). Run these from the project folder (`gradelens/`):

```sh
supabase login
supabase secrets set --project-ref <project-ref> LICENSE_PRIVATE_KEY="$(cat .secrets/license-private.jwk.json)"
supabase functions deploy issue-license --project-ref <project-ref> --no-verify-jwt
```

Optional secrets: `LICENSE_DAYS` (default `30`) and `ALLOWED_ORIGINS` (default
`https://agiusp.github.io` plus local preview addresses).

`--no-verify-jwt` is intended: the function checks the caller's sign-in itself, with Supabase Auth,
which also refuses deleted users.

**Lost or leaked private key?** Run `node scripts/make-license-keys.mjs --force`, repeat the
`secrets set` line, commit, and push. Every existing bookmark stops working, and everyone signs in
again for a new one.

## 4. Switch it on

Put the Project URL and anon key into `src/config/auth.ts`, then commit and push. From then on:

- the install page asks for a GenesisGradeLens sign-in before showing the bookmark;
- each bookmark is personal and works for 30 days. The app warns in its top bar during the last
  5 days.

Bookmarks made **before** this step have no pass check built in and keep working. Replace them
with new ones.

## 5. Add, remove and manage users

- **Add someone:** Supabase → **Authentication → Users → Add user → Send invitation**, with their
  email. They get a link, choose a password on the account page, sign in, and add their bookmark.
- **Remove someone:** delete the user. They can't get a new bookmark, and their current one stops
  working when its pass expires (at most 30 days). For a faster cut-off, set a shorter
  `LICENSE_DAYS`, or rotate the key (see above) to end everyone's bookmarks at once.
- **Forgotten passwords:** users tap **Forgot password** on the install page and get a reset email.

Supabase's built-in email sender is rate-limited (a few emails an hour), which is fine for a
handful of families.

## Limits to know about

- **Paused projects:** a free Supabase project pauses after about a week without activity. Then
  sign-in on the install page fails until you click **Restore project** in the Supabase
  dashboard. Bookmarks people already have keep working, because they don't contact Supabase.
- **A gate, not a vault.** The code is public and runs in the user's own browser, so a
  technically skilled person could remove the pass check. Passes stop casual sharing; they don't
  protect secret data. Each user only ever sees their own Genesis grades.
- **School Chromebooks:** a school can block bookmarks like this. If it does nothing on a school
  device, use a home device, and don't work around school settings.
- **Student portal:** detection is built in, but the student portal's pages haven't been checked
  with a real student login yet.

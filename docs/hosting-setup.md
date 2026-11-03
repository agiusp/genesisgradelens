# Hosting GenesisGradeLens online (bookmark version)

The online version is three things, all free:

| Piece | Where | What it does |
|---|---|---|
| Website | GitHub Pages (this repo) | Install page, account page, and `ggl.js`, the app the bookmark loads |
| Bookmark | Each user's browser | Loads `ggl.js` into their signed-in Genesis tab |
| Sign-in | Supabase (free tier) | GenesisGradeLens accounts. Invite-only, so you decide who can use it |

Genesis passwords never reach any of these. The app reads grades from inside the user's own
Genesis tab.

## 1. Publish the website (GitHub Pages)

1. Create a repository on GitHub (e.g. `genesisgradelens`). **Free GitHub Pages needs a public
   repo** (private repos need GitHub Pro). The code has no secrets or student data, so it can
   be public. Real Genesis pages are kept out by `.gitignore`.
2. Push this project to it (`main` branch).
3. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. The **Deploy website** workflow runs on each push. Your site appears at
   `https://<your-username>.github.io/<repo>/`.

**Security:** the bookmark runs this site's code inside people's signed-in Genesis tabs. Anyone
who can push to this repo can change that code, so:
- turn on two-factor authentication for your GitHub account;
- don't add collaborators you wouldn't trust with your kids' Genesis sessions.

## 2. Set up sign-in (Supabase)

1. Create a free project at supabase.com.
2. **Authentication → Sign In / Providers**:
   - **Email**: on.
   - **Allow new users to sign up**: **off**. This makes it invite-only.
   - Turn off every other provider.
3. **Authentication → URL Configuration**:
   - **Site URL**: `https://<your-username>.github.io/<repo>/account.html`
   - **Redirect URLs**: add the same address.
4. **Project Settings → API**: copy the **Project URL** and the **anon / publishable** key into
   `src/config/auth.ts`. Never copy the `service_role` key anywhere in this project.
5. Commit and push. The site rebuilds, and the app now asks for a GenesisGradeLens sign-in.

## 3. Add, remove and manage users

- **Add someone:** Supabase → **Authentication → Users → Add user → Send invitation**, with their
  email. They get a link, choose a password on the account page, and can then sign in.
- **Remove someone:** delete the user. They're signed out the next time their session refreshes
  (within about an hour).
- **Forgotten passwords:** users tap **Forgot password** in the app and get a reset email.

Supabase's built-in email sender is rate-limited (a few emails an hour), which is fine for a
handful of families. For more, connect your own email provider in Supabase.

## Limits to know about

- **School Chromebooks:** a school can block bookmarks like this. If it does nothing on a school
  device, use a home device, and don't work around school settings.
- **Sign-in is a gate, not a vault.** The app runs in the user's browser on their own data, so
  the sign-in controls who gets the tool. It isn't protecting secret data.
- **Student portal:** detection is built in, but the student portal's pages haven't been checked
  with a real student login yet.

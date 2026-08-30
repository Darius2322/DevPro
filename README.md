# DevPro — Core

Repo: https://github.com/Darius2322/DevPro.git

A private, secure workspace for organizing everything tied to your software
projects: files, credentials, URLs, and (in follow-ups) APIs, GitHub records,
database schemas, and AI-tool tracking.

Stack: **React (Vite) + React Router + Supabase** (Postgres, Auth, Storage,
Edge Functions). Dark, restrained developer-tool UI — Inter for interface
text, JetBrains Mono for values/code.

## What's built

- Email/password auth (Supabase Auth) with name + phone collected at signup,
  protected routes, sign-out-everywhere, and a skippable one-time onboarding
  step (GitHub username, profession) shown once after first sign-in
- Projects: create, list, search/filter/sort, pin, archive-aware queries
- Project detail with eleven tabs: Overview, Files, URLs, Secrets, APIs,
  GitHub, Database, AI, Notes, Team, Activity
- Files: drag-and-drop upload, download via short-lived signed URLs, delete —
  stored in a **private** Supabase Storage bucket, never public
- **Secrets Vault**: values are encrypted server-side (AES-GCM) inside a
  Supabase Edge Function. The browser and the database only ever see
  ciphertext + metadata. Reveal and copy both require re-entering your
  password first; revealed values auto-hide after 20 seconds
- **APIs**: endpoint/method/auth-type tracking; API keys are referenced from
  the Secrets Vault rather than duplicated
- **GitHub**: repo URL, branch, account, org, Actions/deployment notes;
  the access token is referenced from the Secrets Vault, never stored here
- **Database**: provider, connection URL, project ref, schema/RLS/Edge
  Function notes — actual SQL files live in the Files tab
- **AI Tools**: a dated log of which AI tool was used for what, with
  filtering by provider — tracking only, never stores AI account passwords
- **Notes**: freeform per-project notes
- **Team**: invite collaborators by email (Admin/Editor/Viewer roles),
  remove members — enforced by RLS via `project_members`, not just hidden
  buttons
- **Share links**: generate a read-only public link with an optional
  password and expiration, choosing which sections to include. Secrets and
  private notes are never includable — there's no toggle for them, by
  design — and a Supabase Edge Function (`share-manage`) validates the
  token/password server-side before returning anything
- **Real-time updates**: Files, URLs, Secrets (metadata only), APIs, Notes,
  Activity, and the Projects list all subscribe to Supabase Realtime —
  changes from teammates show up without a refresh. RLS still applies to
  realtime events, so you only ever receive updates for rows you could
  already see
- **Notifications**: an in-app bell with unread count. You're notified when
  someone shares a project, when you're added to a project, and (via a daily
  `pg_cron` job) when a secret is within 14 days of its expiration date
- **Profile page**: view your details and join date, change password, sign out
- **Real light/dark theme toggle** in the header (persisted, applied before
  first paint so there's no flash of the wrong theme)
- **Global search** (magnifying-glass icon) — searches project names, URLs,
  APIs, notes, and secret *names* (never values) and jumps straight to the
  result. Separate from the ⌘K command palette, which is static commands
- **AI Accounts** — a global tracker for which AI subscriptions you have
  (ChatGPT, Claude, Copilot, etc.), their plan, and when usage resets
- **Connections** — a record of which GitHub/GitLab/Vercel/Supabase accounts
  you use. This is manual bookkeeping, not live OAuth — real one-click
  account linking would need an OAuth app registered with each provider
  plus a callback server, which isn't set up
- **Materials** — a personal file library (uploads, private per user) for
  reusable assets that aren't tied to one project, separate from each
  project's own Files tab
- **Devices** (in Settings) — a best-effort list of devices that have
  signed in, since Supabase's client SDK has no API to list live sessions.
  "Sign out of all devices" (also in Settings) is the one that actually
  revokes every session right now
- **Per-project Progress tab** — a completion-percent slider plus a
  checklist of milestones
- **Per-project Hosting tab** — provider, hosting URL, build/deploy
  commands, env var notes, last-deploy timestamp
- **Structured tech stack** on each project — languages, frameworks, and
  databases as separate tags, plus an SDLC methodology field (Agile/Scrum,
  Kanban, Waterfall, Lean, DevOps)
- Project detail now has thirteen tabs: Overview, Progress, Files, URLs,
  Secrets, APIs, GitHub, Database, Hosting, AI, Notes, Team, Activity
- **Export / Import**: export a project as a `.zip` (metadata + actual file
  bytes, bundled client-side with JSZip). Secrets are never included —
  there's no toggle, they're simply left out entirely. Import re-creates the
  bundle as a brand-new project (never overwrites an existing one)
- **Two-factor authentication**: TOTP via Supabase's built-in MFA — enroll
  in Settings (QR code + manual key), and it's actually enforced: signing in
  afterward requires the 6-digit code before the app loads, not just an
  option that sits unused
- **Activity**: per-project timeline grouped by day, filterable by resource
  type — metadata only, never secret values or file contents
- Global URLs and Secrets pages (across all projects) plus per-project views
- Dashboard with live counts + recent activity feed
- Command palette (⌘K / Ctrl+K) for quick navigation and actions
- Responsive shell: sidebar on desktop, bottom nav on mobile
- PWA manifest + basic install support (offline shell only — no caching of
  API/storage responses, by design, so nothing sensitive is cached)

## Not yet built

Every major section from the original spec now has a first pass. What's
left is smaller/polish-level: folders inside file storage, a file preview
pane, project-level security dashboard/score, and the recovery-codes flow
for 2FA (if you lose your authenticator device, removing the factor
currently has to be done by disabling it directly in the Supabase dashboard
under Authentication — there's no in-app recovery path yet).

## Setup

1. **Create a Supabase project** at supabase.com.
2. **Run the schema**: open the SQL editor and run `supabase/schema.sql`.
   This creates all tables (projects, files, secrets, urls, apis,
   github_repositories, databases, ai_usage, notes, shares, notifications,
   activity_logs), RLS policies, the private `project-files` storage bucket,
   the daily secret-expiry check (`pg_cron` — enable that extension under
   Database > Extensions if the schema run errors on it), and adds the
   realtime tables to the `supabase_realtime` publication.

   **Already have a DevPro project running?** Don't re-run the full
   `schema.sql` — it'll error on tables that already exist. Instead run, in
   order:
   - `supabase/migrations/002_profile_onboarding.sql`
   - `supabase/migrations/003_extended_features.sql`

   Both are safe to run more than once.
3. **Deploy the Edge Functions**:
   ```bash
   supabase functions deploy secrets-vault
   supabase functions deploy share-manage
   supabase secrets set SECRETS_ENCRYPTION_KEY=$(openssl rand -base64 32)
   ```
   The function also needs `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` — Supabase sets the first and third
   automatically; if `SUPABASE_ANON_KEY` isn't already present in your
   function's env, add it with `supabase secrets set`.
4. **Configure the frontend**:
   ```bash
   cp .env.example .env
   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from
   # Project Settings > API — never put the service-role key here
   ```
5. **Install and run**:
   ```bash
   npm install
   npm run dev
   ```
   (this pulls in `jszip`, used for project export/import bundling)

## Security notes

- The service-role key and the encryption key exist **only** as Edge
  Function secrets — never in frontend code, `.env`, or version control.
- Every table has row-level security scoped to project ownership/membership.
- Secret values are never written to `localStorage`, URLs, console logs, or
  the activity log — only encrypted ciphertext is persisted, and only the
  Edge Function can decrypt it.
- Files live in a private bucket; downloads use 60-second signed URLs, not
  permanent public links.
- This is a solid foundation, not a security audit. Before handling real
  production credentials, get a second set of eyes on the RLS policies and
  the Edge Function, and turn on Supabase's own MFA/rate-limiting settings.

## Known gaps to close before "production"

- No automated tests yet.
- The "rotate" button on secrets is wired to the re-auth flow but the
  rotate-value form itself isn't finished — currently only create/reveal/
  delete/copy are complete end-to-end.
- Icons in `public/icons/` are placeholders — swap in real app icons.

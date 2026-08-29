# DevPro — Core

Repo: https://github.com/Darius2322/DevPro.git

A private, secure workspace for organizing everything tied to your software
projects: files, credentials, URLs, and (in follow-ups) APIs, GitHub records,
database schemas, and AI-tool tracking.

Stack: **React (Vite) + React Router + Supabase** (Postgres, Auth, Storage,
Edge Functions). Dark, restrained developer-tool UI — Inter for interface
text, JetBrains Mono for values/code.

## What's built in this pass

- Email/password auth (Supabase Auth), protected routes, sign-out-everywhere
- Projects: create, list, search/filter/sort, pin, archive-aware queries
- Project detail with Overview / Files / URLs / Secrets tabs
- Files: drag-and-drop upload, download via short-lived signed URLs, delete —
  stored in a **private** Supabase Storage bucket, never public
- **Secrets Vault**: values are encrypted server-side (AES-GCM) inside a
  Supabase Edge Function. The browser and the database only ever see
  ciphertext + metadata. Reveal and copy both require re-entering your
  password first; revealed values auto-hide after 20 seconds
- Global URLs and Secrets pages (across all projects) plus per-project views
- Activity log (metadata only — never secret values or file contents)
- Dashboard with live counts + recent activity feed
- Responsive shell: sidebar on desktop, bottom nav on mobile
- PWA manifest + basic install support (offline shell only — no caching of
  API/storage responses, by design, so nothing sensitive is cached)

## Not yet built (by design, per our phased plan)

APIs manager, GitHub records, Database/schema section, AI-tool tracking,
sharing/share-links, notifications, real-time collaboration, command palette,
full audit-log timeline UI, import/export, 2FA/MFA, folders inside file
storage, file preview pane. These slot into the same patterns already
established (a `*Panel` component + a table + RLS-protected table) — happy to
build any of them next.

## Setup

1. **Create a Supabase project** at supabase.com.
2. **Run the schema**: open the SQL editor and run `supabase/schema.sql`.
   This creates all tables, RLS policies, and the private `project-files`
   storage bucket.
3. **Deploy the secrets Edge Function**:
   ```bash
   supabase functions deploy secrets-vault
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

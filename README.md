# Nivaar — real, deployable civic issue reporting app

"Take one photo. Nivaar handles the rest."

This is a full Next.js 14 (App Router, TypeScript) application backed by
Supabase (Postgres + Auth + Storage), with real AI photo classification,
real voice transcription, real GPS + reverse geocoding, real duplicate
detection, and a real admin dashboard. It preserves the visual design
(neo-brutalist: bold flat colors, hard shadows, chunky rounded type) from
the original Nivaar prototype.

---

## 0. What's real vs. what's a starting point

**Fully real, working end-to-end once you add your own keys:**
- Photo upload → Supabase Storage → Claude vision classification (server-side)
- Voice recording → Supabase Storage → Whisper transcription → combined into the AI-composed report
- Browser GPS → OpenStreetMap reverse geocoding
- Geospatial + category duplicate detection (real haversine distance query against the database)
- Report creation, status history, resolution photos + AI before/after comparison
- Row Level Security on every table, enforced by real Supabase Auth (anonymous sign-in, not a spoofable cookie)
- Admin dashboard with real stats, filters, and status updates that write to `status_history`

**Deliberately a starting point, documented so you can upgrade it later:**
- **Admin auth** is a single shared passcode (`ADMIN_ACCESS_CODE`) that grants `is_admin = true` to your current session. Fine for one or a few trusted admins to get started; see "Upgrading admin auth" below before giving this to a real team.
- **Authority routing** is a hardcoded lookup table for Bengaluru (`src/lib/routing.ts`) — there is no real government API integration, matching your explicit instruction not to fake one. It's structured to be easy to extend per-city.
- **Google Maps** is stubbed to fall back to a free OpenStreetMap-based map. If you set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, wire in a `GoogleMapView` alongside `LeafletMap` in `src/components/MapView.tsx` (same props contract).

---

## A. Files to copy into VS Code

Copy the entire project folder as-is. Everything under `src/`, `supabase/`,
plus `package.json`, `next.config.mjs`, `tailwind.config.ts`,
`tsconfig.json`, `postcss.config.js`, `.env.example`, `.gitignore`, and this
README.

## B. Create the Supabase project

1. Go to https://supabase.com/dashboard → **New project**.
2. Pick a name, a database password (save it somewhere), and a region close to your users.
3. Wait for provisioning to finish (~2 min).

## C. Where to paste the SQL

1. In your Supabase project: **SQL Editor → New query**.
2. Paste the entire contents of `supabase/schema.sql` and click **Run**.
   This creates every table, index, trigger, RLS policy, and the two storage
   buckets (`evidence`, `resolution`).
3. **Enable Anonymous Sign-ins**: Authentication → Providers → scroll to
   **Anonymous Sign-ins** → toggle on. This is required — without it,
   `ensureAuthenticated()` in `src/lib/supabase/client.ts` cannot start a
   session, and every RLS policy (which checks `auth.uid()`) will reject
   everything.
4. (Optional, for trying the admin dashboard with sample data) open the app
   once locally so an anonymous user + profile row exists, then run
   `supabase/seed.sql` in the SQL Editor.

## D. Storage buckets

Already created by `schema.sql` (`evidence` and `resolution`, both public
for read, with an RLS policy restricting uploads to `{your-user-id}/...`
paths). Nothing more to do here.

## E. Environment variables you need

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (⚠️ secret) |
| `AI_API_KEY` | https://platform.openai.com/api-keys — used for photo classification + report composition via `gpt-4o` (⚠️ secret) |
| `STT_API_KEY` | https://platform.openai.com/api-keys — used for Whisper voice transcription; can be the same key as `AI_API_KEY` (⚠️ secret) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional — leave blank to use the free map |
| `ADMIN_ACCESS_CODE` | Make up your own passphrase (⚠️ secret) |

## F. Where each API key goes

All the `⚠️ secret` keys above are used **only** inside `src/app/api/**`
route handlers and `src/lib/supabase/server.ts` — never imported into any
`"use client"` file. Next.js will refuse to expose a variable to the browser
unless it's prefixed `NEXT_PUBLIC_`, so this is enforced structurally, not
just by convention.

## G. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll land on the language screen, then Home.
The app requests microphone/camera/location permissions as you use those
features (browser will prompt).

## H. Push to GitHub

```bash
git init
git add .
git commit -m "Nivaar: real full-stack app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nivaar.git
git push -u origin main
```

(`.env.local` is already in `.gitignore` — your keys will not be committed.)

## I. Deploy on Vercel

1. https://vercel.com/new → import your GitHub repo.
2. In **Environment Variables**, add every variable from your `.env.local`
   (same names, same values) — Vercel does not read your local `.env.local`
   file.
3. Deploy. Vercel auto-detects Next.js; no build config changes needed.
4. Once deployed, your Supabase project doesn't need any change — the same
   anon key + RLS policies work from any domain.

## J. Test the complete flow

1. Visit your deployed URL → pick a language → Home.
2. Tap the camera button → upload a real photo of something (or take one on mobile).
3. Watch it actually call Claude and return a real classification + confidence.
4. Confirm → pick severity → optionally record a voice note (mic permission prompt) → confirm location (GPS permission prompt).
5. If no similar report exists nearby, you'll go straight to Review; edit the AI-written description if you want, then Submit.
6. You land on the tracking page with a real `report_number` (e.g. `NIV-20001`) — refresh the page, it's still there (real database row).
7. Go to `/admin`, enter your `ADMIN_ACCESS_CODE`, and you should see your new report in the dashboard. Open it and change its status — refresh the citizen-facing tracking page and the new status/timeline entry is there too.
8. Mark it "Resolved," go back to the tracking page, upload an "after" photo — you'll get a real AI before/after comparison.

If anything in that flow 500s, check your Vercel function logs first — almost
always a missing/misnamed environment variable.

---

## Fixed: mobile AI analysis failure ("Request Entity Too Large")

**Root cause:** phone camera photos (often 3–12MB+) were base64-encoded and
sent as JSON directly to `/api/ai/classify`. Vercel Serverless Functions
enforce a hard ~4.5MB request body limit at the platform level — this can't
be raised via Next.js config. Oversized requests were rejected with a
plain-text `413 Request Entity Too Large` response *before* the route
handler ever ran, and the client's `response.json()` then threw trying to
parse that plain text — the `"Unexpected token 'R', "Request En"..."` error.
Desktop appeared to work only because typical test images happened to be
smaller than the limit; it was never actually safe.

**Fix, two layers:**
1. `src/lib/imageCompress.ts` — every photo is resized (max 1600px long
   edge) and re-encoded as JPEG client-side, immediately on selection,
   before it's ever sent anywhere. This keeps the classify payload to
   typically 200–700KB regardless of original camera resolution, comfortably
   under the platform limit. Falls back to the original file if canvas
   decoding fails for a given photo (extremely rare format edge case) rather
   than blocking the user.
2. `src/lib/safeFetch.ts` — every client→API call now checks the response's
   `content-type` before calling `.json()`. If the server (or the platform)
   ever returns non-JSON again for any reason, the user sees a clean error
   message instead of a raw parse exception.

Server routes (`classify`, `transcribe`, `compose`) also gained a
size-guard rejection with proper JSON output, and structured
`console.error`/`console.log` calls so failures are diagnosable from
Vercel's Runtime Logs dashboard. One caveat: a request rejected at the
*platform* level (the original bug) never reaches your function at all, so
it won't appear in your function's logs — only in Vercel's edge/proxy-level
logs. That's exactly why the client-side compression fix matters: it keeps
you from ever hitting that platform wall in the first place.

**No new environment variables are required for this fix** — it's entirely
code-level (client compression + defensive parsing + server guards).



Replace the passcode gate with real role assignment:
1. In Supabase Table Editor → `profiles`, manually set `is_admin = true` for
   specific trusted user rows (you can look up a citizen's `auth.users` row
   by whatever identifying info you collect if you add real login later).
2. Remove or restrict `src/app/api/admin/claim/route.ts` once you don't need
   the bootstrap-a-first-admin flow anymore.
3. Consider adding real Supabase Auth (email/phone OTP) so admins have
   durable, nameable accounts instead of anonymous sessions.

## Known trade-off: transitive PostCSS advisory

`npm audit` will show a couple of "high" severity advisories against a
PostCSS copy bundled *inside* Next.js 14.2.35 itself (not your own `postcss`
dependency, which is already pinned to the latest patched release). This is
a build-time-only tool with no exposure to attacker-controlled input in this
app's usage pattern. It clears entirely if you later upgrade to Next 16.x —
that's a bigger migration (Next 15+ made several App Router APIs like
`cookies()` and route `params` asynchronous) so it's left as a deliberate
follow-up rather than bundled into this delivery.

## Database schema reference

See `supabase/schema.sql` for the authoritative source. Summary:

- **profiles** — one row per auth user (real Supabase Auth, including anonymous sessions), `is_admin` flag
- **reports** — the core table; every field from the spec plus `is_demo`, `affected_count`, `duplicate_of`
- **status_history** — append-only; a trigger keeps `reports.status` in sync whenever a row is inserted
- **resolution_images** — after-photos + AI verification JSON

## Project structure

```
src/
  app/
    page.tsx                    Language selection
    (main)/home, nearby, reports, profile   Bottom-nav tabs
    report/page.tsx             The full report-creation flow (client state machine)
    reports/[id]/page.tsx       Tracking + resolution photo
    admin/                      Admin dashboard + report management
    api/
      ai/classify, transcribe, compose      Server-only AI calls
      reports/                  CRUD + duplicates + status + resolution
      admin/claim, stats
  lib/
    supabase/client.ts          Browser client + anonymous auth + storage upload helpers
    supabase/server.ts          Session-scoped + service-role server clients
    ai/provider.ts              Anthropic vision classify/compose/verify (server-only)
    ai/transcribe.ts            Whisper transcription (server-only)
    routing.ts                  Authority routing table
    i18n/                       Central translation dictionary
  components/                   Buttons, Pill, TopBar, BottomNav, MapView — ported from the prototype's design tokens
supabase/
  schema.sql                    Full schema + RLS + storage policies
  seed.sql                      Optional demo data, clearly separate from production
```

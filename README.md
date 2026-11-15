# Beer Money

Single-user daily rewards dashboard. This repo currently has the Next.js shell, Supabase Auth, and the database schema. Design tokens, shared components, and screens come in later pull requests.

## Hard constraints

- No seed phrases, private keys, or wallet secrets in the repo, the database, or the browser.
- No automated logins, claims, or form submissions on rewards, casino, or financial accounts. The claimer reminds only. `opportunities.remind_only` defaults to true.
- Nothing is posted until you approve it. Every `posts` row requires a non-blank disclosure. The default is `#ad`.
- The anon key (or the newer publishable key) is the only Supabase key used in client code. The service-role key stays on the server.
- No Plaid tokens, wallet session tokens, or other third-party credentials in the browser. The Supabase session is an auth cookie managed by `@supabase/ssr`, not a token in `localStorage`.
- Scheduled jobs are not in this version. When they are added, they will run in Supabase with `pg_cron` (or a scheduled Supabase function), not Vercel Cron.
- Push notifications only remind. Tapping one opens a page. It does not sign in, submit a form, or claim a reward.

## Stack

Next.js (App Router, TypeScript, Tailwind) on Vercel, with Supabase Postgres and Auth.

## 1. Create a Supabase project

Create a project in the [Supabase dashboard](https://supabase.com/dashboard).

In Authentication → Providers, keep Email enabled. The shell supports email and password, and an email magic link.

In Authentication → URL configuration:

- Site URL: `http://localhost:3000` for local development, and the production origin after you deploy.
- Redirect URLs: `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback`.

`supabase/config.toml` sets those local URLs, enables email auth, and requires passwords of at least 8 characters. Local email confirmation is off so password sign-in works without mail. A hosted project often requires confirmation. The `/auth/callback` route accepts that link.

This product is single-user. After your account exists, disable public sign-ups in the dashboard (Authentication → Sign In / Providers, or `enable_signup = false` for local config). Row Level Security still limits every account to its own rows.

## 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in the three names from Project Settings → API Keys. `.env.example` has names only.

| Name | Where it is used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server. Use the anon key, or the newer publishable key (`sb_publishable_...`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Use the service_role key, or the newer secret key (`sb_secret_...`). Never prefix this with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Browser and server. The public half of the VAPID key pair. |
| `VAPID_PRIVATE_KEY` | Server only. Never prefix this with `NEXT_PUBLIC_`. |
| `VAPID_SUBJECT` | Server only. A `mailto:` or `https:` contact for the push provider. |
| `NOTIFY_SECRET` | Server only. Callers send it in the `x-notify-secret` header. |

Add the same three variables to the Vercel project before the first deployment build. Next.js inlines `NEXT_PUBLIC_` values at build time, so a build without them bakes in an unconfigured client.

`src/lib/supabase/service-role.ts` imports `server-only`. A Client Component that imports it fails the build. The signed-in test button does not call it. `POST /api/notify` uses it only to call the push functions, because that route has no user session. The shell and the test button use the anon key plus your session, and RLS applies.

## 3. Apply the migrations

With the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started):

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

You can also run `supabase/migrations/*.sql` in filename order in the dashboard SQL editor.

Docker is required for a full local Supabase stack:

```bash
npx supabase start
npx supabase db reset
```

`db reset` applies migrations. It does not load the sample file.

## 4. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create an account or send yourself a magic link, then sign out from the same page.

## Sample data

`supabase/seed.sample.sql` is fictional. Every row is marked `SAMPLE` and points at `example.com`. It is not real offer, payout, or account data, and it is not loaded by `supabase db reset`.

After you have signed up once:

```bash
npx supabase db query -f supabase/seed.sample.sql
```

Or paste the file into the SQL editor. It attaches rows to the earliest auth user and does nothing if those rows are already there.

## Schema

Bots write only through these tables.

| Table | Purpose |
| --- | --- |
| `opportunities` | Tasks, with source, app, platform, payout, estimated minutes, vetter score, and status. |
| `offers` | Offers to compare. Sort by payout. The winner is not stored. |
| `referral_links` | Referral URL, rate, sign-ups, and priority. |
| `payouts` | Expected or received amounts. |
| `posts` | Channel, approval state, and a required disclosure. |
| `push_subscriptions` | Browser push endpoints for reminders. |
| `notifications` | Log of reminder pushes. A row does not mean anything was claimed. |

`reward_status` is `new`, `vetted`, `queued`, `claimed`, `paid`, `rejected`. Opportunities, offers, referral links, and payouts use it.

Posts use a separate `post_approval_state`: `draft`, `needs_review`, `approved`, `scheduled`. There is no published state. A scheduled post also needs `scheduled_for`.

Money is integer USD cents. `dollars_per_hour` is generated from `payout_cents` and `est_minutes`, and it is the canonical rate. `referral_rate_percent` is a percent from 0 to 100, so 10 means 10%, not 0.10.

`app` is the product name, `platform` is where it runs (`ios`, `android`, `web`), `source` is where the lead came from, and `channel` is where a post would go.

Row Level Security is enabled and forced on every table. Policies are owner-only: `(select auth.uid()) = user_id`. The `anon` role has no privileges on these tables. Foreign keys to another row must belong to the same user.

There is no wallet table in this version. When wallet data is added, it will be a public address only.

## Component gallery

`/dev/components` previews the shared shell and components with fictional sample data. It is not a product screen.

`/today` is the home screen after sign-in. It reads your opportunities and payouts. An empty account shows an empty state. Sample numbers appear only if you open Preview with sample data.

## Installable app and push notifications

The app can be saved to an iPhone home screen. Web push on iOS works only from that installed app, on iOS 16.4 or later. In Safari, tap Share, then Add to Home Screen, open Beer Money from the icon, and use Settings → Notifications → Enable notifications.

A notification such as “Shuffle.us daily bonus ready” opens its URL inside the app. You claim the reward on that site yourself.

Generate a VAPID key pair once and keep it. New keys invalidate existing subscriptions.

```bash
npx web-push generate-vapid-keys
```

Put the public key in `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and the private key in `VAPID_PRIVATE_KEY`. Set `VAPID_SUBJECT` to a contact such as `mailto:you@example.com`. Set `NOTIFY_SECRET` to a long random string:

```bash
openssl rand -base64 32
```

Do not commit any of these values. Add them to `.env.local` and to the Vercel project. The public key is inlined at build time, so redeploy after setting it.

The Enable, Send test notification, and Disable buttons use your signed-in session. Row Level Security limits them to your rows. The test button does not use `NOTIFY_SECRET`.

A reminder caller uses the shared secret. This example does not sign in or claim anything:

```bash
curl -X POST https://beer-money.vercel.app/api/notify \
  -H "content-type: application/json" \
  -H "x-notify-secret: $NOTIFY_SECRET" \
  -d '{"title":"Shuffle.us daily bonus ready","body":"Open Beer Money and claim it yourself.","url":"/today","source":"shuffle"}'
```

The route writes one `notifications` row per account that has a device, sends to those devices, and deletes endpoints the push service reports as gone (HTTP 404 or 410).

`POST /api/notify` has no user cookie, so `auth.uid()` is null and RLS would hide every subscription. That route uses the service-role key only to call `begin_owner_notifications` and `finish_owner_notification`. Those functions are security definer, live in the unexposed `private` schema, and reject any JWT whose role is not `service_role`. The public wrappers are security invoker and executable only by `service_role`. The signed-in test button never takes that path.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

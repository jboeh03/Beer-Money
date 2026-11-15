-- Beer Money schema.
-- Bots and server jobs write only through these tables.
-- This schema stores no seed phrases, private keys, wallet secrets, or
-- third-party account tokens. Claims stay manual: remind_only defaults to true.

create type public.reward_status as enum (
  'new',
  'vetted',
  'queued',
  'claimed',
  'paid',
  'rejected'
);

create type public.post_approval_state as enum (
  'draft',
  'needs_review',
  'approved',
  'scheduled'
);

comment on type public.reward_status is
  'Shared lifecycle for opportunities, offers, referral links, and payouts.';

comment on type public.post_approval_state is
  'Content studio approval. Posts do not use reward_status. Nothing is posted until the owner sets approved or scheduled.';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.clock_timestamp();
  return new;
end;
$$;

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  source text,
  app text,
  platform text,
  category text,
  status public.reward_status not null default 'new',
  payout_cents integer,
  est_minutes integer,
  dollars_per_hour numeric(12, 2) generated always as (
    case
      when payout_cents is null or est_minutes is null or est_minutes = 0 then null
      else round((payout_cents::numeric / 100) * (60::numeric / est_minutes), 2)
    end
  ) stored,
  currency text not null default 'USD',
  vetter_score smallint,
  priority integer not null default 0,
  external_url text,
  notes text,
  remind_only boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunities_title_not_blank check (char_length(btrim(title)) > 0),
  constraint opportunities_payout_nonnegative check (payout_cents is null or payout_cents >= 0),
  constraint opportunities_est_minutes_positive check (est_minutes is null or est_minutes > 0),
  constraint opportunities_vetter_score_range check (
    vetter_score is null or vetter_score between 0 and 100
  ),
  constraint opportunities_currency_usd check (currency = 'USD')
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  opportunity_id uuid references public.opportunities (id) on delete set null,
  title text not null,
  source text,
  app text,
  platform text,
  status public.reward_status not null default 'new',
  payout_cents integer,
  est_minutes integer,
  dollars_per_hour numeric(12, 2) generated always as (
    case
      when payout_cents is null or est_minutes is null or est_minutes = 0 then null
      else round((payout_cents::numeric / 100) * (60::numeric / est_minutes), 2)
    end
  ) stored,
  currency text not null default 'USD',
  vetter_score smallint,
  terms_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offers_title_not_blank check (char_length(btrim(title)) > 0),
  constraint offers_payout_nonnegative check (payout_cents is null or payout_cents >= 0),
  constraint offers_est_minutes_positive check (est_minutes is null or est_minutes > 0),
  constraint offers_vetter_score_range check (
    vetter_score is null or vetter_score between 0 and 100
  ),
  constraint offers_currency_usd check (currency = 'USD')
);

create table public.referral_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  opportunity_id uuid references public.opportunities (id) on delete set null,
  label text not null,
  category text,
  app text,
  platform text,
  url text not null,
  referral_rate_percent numeric(7, 3),
  payout_per_signup_cents integer,
  signups integer not null default 0,
  priority integer not null default 0,
  status public.reward_status not null default 'new',
  currency text not null default 'USD',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referral_links_label_not_blank check (char_length(btrim(label)) > 0),
  constraint referral_links_url_not_blank check (char_length(btrim(url)) > 0),
  constraint referral_links_rate_range check (
    referral_rate_percent is null
    or (referral_rate_percent >= 0 and referral_rate_percent <= 100)
  ),
  constraint referral_links_payout_nonnegative check (
    payout_per_signup_cents is null or payout_per_signup_cents >= 0
  ),
  constraint referral_links_signups_nonnegative check (signups >= 0),
  constraint referral_links_currency_usd check (currency = 'USD')
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  opportunity_id uuid references public.opportunities (id) on delete set null,
  offer_id uuid references public.offers (id) on delete set null,
  source text,
  app text,
  category text,
  amount_cents integer not null,
  currency text not null default 'USD',
  status public.reward_status not null default 'new',
  expected_on date,
  paid_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payouts_amount_nonnegative check (amount_cents >= 0),
  constraint payouts_currency_usd check (currency = 'USD')
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  referral_link_id uuid references public.referral_links (id) on delete set null,
  channel text not null,
  title text,
  body text not null default '',
  approval_state public.post_approval_state not null default 'draft',
  disclosure text not null default '#ad',
  character_count integer generated always as (char_length(body)) stored,
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_channel_not_blank check (char_length(btrim(channel)) > 0),
  constraint posts_disclosure_not_blank check (char_length(btrim(disclosure)) > 0),
  constraint posts_scheduled_requires_time check (
    approval_state <> 'scheduled' or scheduled_for is not null
  )
);

comment on table public.opportunities is
  'Tasks the owner may do. Bots write only through this schema and never claim on the owner''s behalf.';
comment on column public.opportunities.source is
  'Where the lead came from, such as a manual entry or an aggregator name.';
comment on column public.opportunities.app is
  'Rewards product name.';
comment on column public.opportunities.platform is
  'Where the task runs, such as ios, android, or web.';
comment on column public.opportunities.payout_cents is
  'USD payout in cents.';
comment on column public.opportunities.dollars_per_hour is
  'Canonical rate, derived from payout_cents and est_minutes. The app uses dollars per hour, not a second stored unit.';
comment on column public.opportunities.vetter_score is
  '0-100. Display scale: red below 50, amber 50-74, green 75 and up.';
comment on column public.opportunities.remind_only is
  'Claimer prepares and reminds only. Rewards apps ban bots. No column here authorizes an automated login, claim, or form submission.';

comment on table public.offers is
  'Comparable offers. The matcher winner is the highest payout and is not stored.';
comment on column public.offers.dollars_per_hour is
  'Canonical rate, derived from payout_cents and est_minutes.';

comment on table public.referral_links is
  'Referral URLs the owner copies by hand. referral_rate_percent is 0-100, not a fraction.';
comment on column public.referral_links.referral_rate_percent is
  'Percent from 0 to 100. A 10% rate is stored as 10, not 0.10.';

comment on table public.payouts is
  'Money the owner expects or has received. amount_cents is USD cents.';

comment on table public.posts is
  'Drafts stay drafts until the owner approves them. disclosure is required on every row.';
comment on column public.posts.channel is
  'Destination channel, such as x or reddit. Free text so a new channel does not need a migration.';
comment on column public.posts.approval_state is
  'draft, needs_review, approved, or scheduled. There is no posted state: nothing publishes automatically.';
comment on column public.posts.disclosure is
  'Required referral disclosure. Default is #ad. An equivalent disclosure may replace it, but it cannot be blank.';
comment on column public.posts.character_count is
  'Stored length of body, for the channel character counter.';

create or replace function public.enforce_same_user_reference()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  row_json jsonb := to_jsonb(new);
  opportunity_id uuid := nullif(row_json ->> 'opportunity_id', '')::uuid;
  offer_id uuid := nullif(row_json ->> 'offer_id', '')::uuid;
  referral_link_id uuid := nullif(row_json ->> 'referral_link_id', '')::uuid;
  owner uuid;
begin
  if opportunity_id is not null then
    select o.user_id into owner
    from public.opportunities as o
    where o.id = opportunity_id;

    if owner is distinct from new.user_id then
      raise exception 'opportunity_id must belong to the same user';
    end if;
  end if;

  if offer_id is not null then
    select o.user_id into owner
    from public.offers as o
    where o.id = offer_id;

    if owner is distinct from new.user_id then
      raise exception 'offer_id must belong to the same user';
    end if;
  end if;

  if referral_link_id is not null then
    select r.user_id into owner
    from public.referral_links as r
    where r.id = referral_link_id;

    if owner is distinct from new.user_id then
      raise exception 'referral_link_id must belong to the same user';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon;
revoke all on function public.enforce_same_user_reference() from public, anon;
grant execute on function public.set_updated_at() to authenticated, service_role;
grant execute on function public.enforce_same_user_reference() to authenticated, service_role;

create trigger opportunities_set_updated_at
  before update on public.opportunities
  for each row execute function public.set_updated_at();

create trigger offers_set_updated_at
  before update on public.offers
  for each row execute function public.set_updated_at();

create trigger offers_enforce_same_user
  before insert or update on public.offers
  for each row execute function public.enforce_same_user_reference();

create trigger referral_links_set_updated_at
  before update on public.referral_links
  for each row execute function public.set_updated_at();

create trigger referral_links_enforce_same_user
  before insert or update on public.referral_links
  for each row execute function public.enforce_same_user_reference();

create trigger payouts_set_updated_at
  before update on public.payouts
  for each row execute function public.set_updated_at();

create trigger payouts_enforce_same_user
  before insert or update on public.payouts
  for each row execute function public.enforce_same_user_reference();

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

create trigger posts_enforce_same_user
  before insert or update on public.posts
  for each row execute function public.enforce_same_user_reference();

create index opportunities_user_status_idx
  on public.opportunities (user_id, status);

create index opportunities_user_rate_idx
  on public.opportunities (user_id, dollars_per_hour desc nulls last);

create index offers_user_status_idx
  on public.offers (user_id, status);

create index offers_user_payout_idx
  on public.offers (user_id, payout_cents desc nulls last);

create index offers_opportunity_id_idx
  on public.offers (opportunity_id);

create index referral_links_user_category_idx
  on public.referral_links (user_id, category);

create index referral_links_user_priority_idx
  on public.referral_links (user_id, priority desc);

create index referral_links_opportunity_id_idx
  on public.referral_links (opportunity_id);

create index payouts_user_status_idx
  on public.payouts (user_id, status);

create index payouts_opportunity_id_idx
  on public.payouts (opportunity_id);

create index payouts_offer_id_idx
  on public.payouts (offer_id);

create index posts_user_approval_idx
  on public.posts (user_id, approval_state);

create index posts_user_channel_idx
  on public.posts (user_id, channel);

create index posts_referral_link_id_idx
  on public.posts (referral_link_id);

alter table public.opportunities enable row level security;
alter table public.opportunities force row level security;
alter table public.offers enable row level security;
alter table public.offers force row level security;
alter table public.referral_links enable row level security;
alter table public.referral_links force row level security;
alter table public.payouts enable row level security;
alter table public.payouts force row level security;
alter table public.posts enable row level security;
alter table public.posts force row level security;

create policy opportunities_select_own
  on public.opportunities
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy opportunities_insert_own
  on public.opportunities
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy opportunities_update_own
  on public.opportunities
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy opportunities_delete_own
  on public.opportunities
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy offers_select_own
  on public.offers
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy offers_insert_own
  on public.offers
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy offers_update_own
  on public.offers
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy offers_delete_own
  on public.offers
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy referral_links_select_own
  on public.referral_links
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy referral_links_insert_own
  on public.referral_links
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy referral_links_update_own
  on public.referral_links
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy referral_links_delete_own
  on public.referral_links
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy payouts_select_own
  on public.payouts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy payouts_insert_own
  on public.payouts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy payouts_update_own
  on public.payouts
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy payouts_delete_own
  on public.payouts
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy posts_select_own
  on public.posts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy posts_insert_own
  on public.posts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy posts_update_own
  on public.posts
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy posts_delete_own
  on public.posts
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant usage on schema public to authenticated, service_role;

revoke all on table public.opportunities from public, anon;
revoke all on table public.offers from public, anon;
revoke all on table public.referral_links from public, anon;
revoke all on table public.payouts from public, anon;
revoke all on table public.posts from public, anon;

grant select, insert, update, delete on table public.opportunities to authenticated, service_role;
grant select, insert, update, delete on table public.offers to authenticated, service_role;
grant select, insert, update, delete on table public.referral_links to authenticated, service_role;
grant select, insert, update, delete on table public.payouts to authenticated, service_role;
grant select, insert, update, delete on table public.posts to authenticated, service_role;

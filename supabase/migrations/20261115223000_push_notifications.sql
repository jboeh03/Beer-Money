-- Push subscriptions and a reminder log.
-- A notification tells the owner something is ready. It never signs in,
-- submits a form, or claims a reward. The owner does that on the destination site.
--
-- POST /api/notify has no user session, so auth.uid() is null and row level
-- security would hide every subscription. private.begin_owner_notifications and
-- private.finish_owner_notification are security definer and live outside the
-- exposed API schema. They refuse any JWT whose role is not service_role.
-- public wrappers are security invoker and executable only by service_role,
-- so the route can call them through PostgREST. The signed-in test button does
-- not use these functions. It writes through the owner policies below.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;
grant usage on schema private to service_role;

comment on schema private is
  'Not exposed by the Data API. Security-definer helpers for the notify route.';

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  constraint push_subscriptions_endpoint_unique unique (endpoint),
  constraint push_subscriptions_endpoint_not_blank check (char_length(btrim(endpoint)) > 0),
  constraint push_subscriptions_endpoint_length check (char_length(endpoint) <= 2000),
  constraint push_subscriptions_endpoint_https check (
    endpoint ~ '^https://[A-Za-z0-9]'
    or endpoint ~ '^http://(localhost|127\.0\.0\.1)(:[0-9]+)?(/|$)'
  ),
  constraint push_subscriptions_keys_base64url check (
    p256dh ~ '^[A-Za-z0-9_-]{16,200}$'
    and auth ~ '^[A-Za-z0-9_-]{16,200}$'
  ),
  constraint push_subscriptions_user_agent_length check (
    user_agent is null or char_length(user_agent) <= 512
  )
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  body text,
  url text,
  source text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  error text,
  constraint notifications_title_not_blank check (char_length(btrim(title)) > 0),
  constraint notifications_title_length check (char_length(title) <= 120),
  constraint notifications_body_length check (body is null or char_length(body) <= 280),
  constraint notifications_source_length check (source is null or char_length(source) <= 80),
  constraint notifications_url_safe check (
    url is null
    or (
      char_length(url) <= 2000
      and url !~ '[[:space:]]'
      and (
        url ~ '^/[A-Za-z0-9]'
        or (
          url ~ '^https://[A-Za-z0-9]'
          and url !~ '^https://[^/[:space:]]*@'
        )
        or url ~ '^http://(localhost|127\.0\.0\.1)(:[0-9]+)?(/|$)'
      )
    )
  )
);

comment on table public.push_subscriptions is
  'Browser push endpoints for reminders. Keys let the server deliver a notice. They do not authorize a login or a claim.';
comment on column public.push_subscriptions.endpoint is
  'Push service URL from PushManager.subscribe. Unique because one browser endpoint belongs to one device.';
comment on column public.push_subscriptions.p256dh is
  'Browser public key for this subscription. Not a VAPID key.';
comment on column public.push_subscriptions.auth is
  'Browser auth secret for this subscription. Not a VAPID key.';

comment on table public.notifications is
  'Log of reminder pushes. A row records that the owner was told. It never records a claim, a login, or a submitted form.';
comment on column public.notifications.url is
  'In-app path or https URL opened when the notification is tapped. The owner claims on that site themselves.';
comment on column public.notifications.source is
  'Name of the reminder, such as a daily bonus. It does not authorize an automated action.';
comment on column public.notifications.sent_at is
  'Set when at least one device accepted the push. Null when nothing was delivered.';
comment on column public.notifications.error is
  'Delivery problem, without push endpoint URLs.';

create index push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.push_subscriptions enable row level security;
alter table public.push_subscriptions force row level security;
alter table public.notifications enable row level security;
alter table public.notifications force row level security;

create policy push_subscriptions_select_own
  on public.push_subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy push_subscriptions_insert_own
  on public.push_subscriptions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy push_subscriptions_update_own
  on public.push_subscriptions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy push_subscriptions_delete_own
  on public.push_subscriptions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy notifications_select_own
  on public.notifications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy notifications_insert_own
  on public.notifications
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy notifications_update_own
  on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy notifications_delete_own
  on public.notifications
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.push_subscriptions from public, anon;
revoke all on table public.notifications from public, anon;

grant select, insert, update, delete on table public.push_subscriptions to authenticated, service_role;
grant select, insert, update, delete on table public.notifications to authenticated, service_role;

create or replace function private.begin_owner_notifications(
  p_title text,
  p_body text,
  p_url text,
  p_source text
)
returns table (
  notification_id uuid,
  user_id uuid,
  subscription_id uuid,
  endpoint text,
  p256dh text,
  auth_secret text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_title text := pg_catalog.nullif(pg_catalog.btrim(p_title), '');
  clean_body text := pg_catalog.nullif(pg_catalog.btrim(p_body), '');
  clean_url text := pg_catalog.nullif(pg_catalog.btrim(p_url), '');
  clean_source text := pg_catalog.nullif(pg_catalog.btrim(p_source), '');
  sole_count integer;
  sole_owner uuid;
begin
  if pg_catalog.coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role' then
    raise exception 'begin_owner_notifications is restricted to the notify route';
  end if;

  if clean_title is null or pg_catalog.char_length(clean_title) > 120 then
    raise exception 'title is required and must be at most 120 characters';
  end if;

  if clean_body is not null and pg_catalog.char_length(clean_body) > 280 then
    raise exception 'body must be at most 280 characters';
  end if;

  if clean_source is not null and pg_catalog.char_length(clean_source) > 80 then
    raise exception 'source must be at most 80 characters';
  end if;

  if clean_url is not null and (
    pg_catalog.char_length(clean_url) > 2000
    or clean_url ~ '[[:space:]]'
    or pg_catalog.strpos(clean_url, '\') > 0
    or not (
      clean_url ~ '^/[A-Za-z0-9]'
      or (
        clean_url ~ '^https://[A-Za-z0-9]'
        and clean_url !~ '^https://[^/[:space:]]*@'
      )
      or clean_url ~ '^http://(localhost|127\.0\.0\.1)(:[0-9]+)?(/|$)'
    )
  ) then
    raise exception 'url must be an in-app path or https URL';
  end if;

  return query
  with owners as (
    select distinct s.user_id
    from public.push_subscriptions as s
  ),
  inserted as (
    insert into public.notifications (user_id, title, body, url, source)
    select o.user_id, clean_title, clean_body, clean_url, clean_source
    from owners as o
    returning id, user_id
  )
  select
    inserted.id,
    s.user_id,
    s.id,
    s.endpoint,
    s.p256dh,
    s.auth
  from inserted
  join public.push_subscriptions as s on s.user_id = inserted.user_id
  order by s.created_at;

  if found then
    return;
  end if;

  select count(*)::integer into sole_count
  from auth.users;

  if sole_count = 1 then
    select u.id into sole_owner
    from auth.users as u
    limit 1;

    insert into public.notifications (user_id, title, body, url, source, error)
    values (
      sole_owner,
      clean_title,
      clean_body,
      clean_url,
      clean_source,
      'No push subscriptions'
    );
  end if;
end;
$$;

create or replace function private.finish_owner_notification(
  p_notification_id uuid,
  p_sent boolean,
  p_error text,
  p_prune_endpoints text[],
  p_used_endpoints text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  clean_error text := pg_catalog.nullif(pg_catalog.btrim(pg_catalog.coalesce(p_error, '')), '');
begin
  if pg_catalog.coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role' then
    raise exception 'finish_owner_notification is restricted to the notify route';
  end if;

  if p_notification_id is null then
    raise exception 'notification_id is required';
  end if;

  select n.user_id into owner
  from public.notifications as n
  where n.id = p_notification_id;

  if owner is null then
    raise exception 'notification not found';
  end if;

  update public.notifications
  set
    sent_at = case
      when p_sent then pg_catalog.coalesce(sent_at, pg_catalog.now())
      else null
    end,
    error = clean_error
  where id = p_notification_id
    and user_id = owner;

  delete from public.push_subscriptions
  where user_id = owner
    and endpoint = any (pg_catalog.coalesce(p_prune_endpoints, '{}'::text[]));

  update public.push_subscriptions
  set last_used_at = pg_catalog.now()
  where user_id = owner
    and endpoint = any (pg_catalog.coalesce(p_used_endpoints, '{}'::text[]));
end;
$$;

comment on function private.begin_owner_notifications(text, text, text, text) is
  'Records one notifications row per subscription owner and returns the devices to notify. Service-role JWT only. Does not claim or sign in.';

comment on function private.finish_owner_notification(uuid, boolean, text, text[], text[]) is
  'Marks a reminder sent or failed, drops 404/410 endpoints, and stamps last_used_at. Service-role JWT only.';

create or replace function public.begin_owner_notifications(
  p_title text,
  p_body text,
  p_url text,
  p_source text
)
returns table (
  notification_id uuid,
  user_id uuid,
  subscription_id uuid,
  endpoint text,
  p256dh text,
  auth_secret text
)
language sql
security invoker
set search_path = ''
as $$
  select
    result.notification_id,
    result.user_id,
    result.subscription_id,
    result.endpoint,
    result.p256dh,
    result.auth_secret
  from private.begin_owner_notifications(p_title, p_body, p_url, p_source) as result;
$$;

create or replace function public.finish_owner_notification(
  p_notification_id uuid,
  p_sent boolean,
  p_error text,
  p_prune_endpoints text[],
  p_used_endpoints text[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.finish_owner_notification(
    p_notification_id,
    p_sent,
    p_error,
    p_prune_endpoints,
    p_used_endpoints
  );
end;
$$;

comment on function public.begin_owner_notifications(text, text, text, text) is
  'Service-role PostgREST wrapper. Execute is revoked from anon and authenticated. The body calls the private security-definer function.';

comment on function public.finish_owner_notification(uuid, boolean, text, text[], text[]) is
  'Service-role PostgREST wrapper for recording a push result.';

revoke all on function private.begin_owner_notifications(text, text, text, text) from public, anon, authenticated;
revoke all on function private.finish_owner_notification(uuid, boolean, text, text[], text[]) from public, anon, authenticated;
revoke all on function public.begin_owner_notifications(text, text, text, text) from public, anon, authenticated;
revoke all on function public.finish_owner_notification(uuid, boolean, text, text[], text[]) from public, anon, authenticated;

grant execute on function private.begin_owner_notifications(text, text, text, text) to service_role;
grant execute on function private.finish_owner_notification(uuid, boolean, text, text[], text[]) to service_role;
grant execute on function public.begin_owner_notifications(text, text, text, text) to service_role;
grant execute on function public.finish_owner_notification(uuid, boolean, text, text[], text[]) to service_role;

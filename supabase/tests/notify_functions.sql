-- Executes the fixed notify functions against a throwaway database.
-- Requires the anon, authenticated, and service_role roles, which Supabase
-- provides and this script creates when they are missing.

select format('create role %I', role_name)
from (values ('anon'), ('authenticated'), ('service_role')) as roles(role_name)
where not exists (select 1 from pg_catalog.pg_roles where rolname = roles.role_name)
\gexec

create extension if not exists pgcrypto;

create schema if not exists auth;
create schema if not exists private;

create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select case
    when pg_catalog.current_setting('request.jwt.claims', true) is null
      or btrim(pg_catalog.current_setting('request.jwt.claims', true)) = ''
    then null::jsonb
    else pg_catalog.current_setting('request.jwt.claims', true)::jsonb
  end;
$$;

drop table if exists public.notifications;
drop table if exists public.push_subscriptions;
drop table if exists auth.users;

create table auth.users (
  id uuid primary key default gen_random_uuid()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text,
  url text,
  source text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  error text
);

\ir ../migrations/20261115230000_fix_notify_functions.sql

do $$
declare
  definer boolean;
  config text[];
begin
  select p.prosecdef, p.proconfig
  into definer, config
  from pg_catalog.pg_proc as p
  join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'private'
    and p.proname = 'begin_owner_notifications';

  if definer is not true
    or config is null
    or not exists (
      select 1
      from pg_catalog.unnest(config) as item
      where item like 'search_path=%'
    )
  then
    raise exception 'begin_owner_notifications lost security definer or search_path';
  end if;

  if pg_catalog.has_function_privilege(
    'service_role',
    'private.begin_owner_notifications(text,text,text,text)',
    'execute'
  ) is not true then
    raise exception 'service_role cannot execute begin_owner_notifications';
  end if;

  if pg_catalog.has_function_privilege(
    'anon',
    'private.begin_owner_notifications(text,text,text,text)',
    'execute'
  ) then
    raise exception 'anon can execute begin_owner_notifications';
  end if;
end
$$;

do $$
begin
  perform pg_catalog.set_config('request.jwt.claims', '{"role":"authenticated"}', true);
  perform 1
  from private.begin_owner_notifications('Ready', null, '/today', 'test');
  raise exception 'authenticated call should have been rejected';
exception
  when others then
    if sqlerrm not like '%restricted to the notify route%' then
      raise;
    end if;
end
$$;

do $$
declare
  owner uuid := '11111111-1111-1111-1111-111111111111';
  notification uuid;
  returned_title text;
  returned_body text;
  returned_endpoint text;
  row_count integer;
  sent timestamptz;
  logged_error text;
  used timestamptz;
  remaining integer;
begin
  perform pg_catalog.set_config('request.jwt.claims', '{"role":"service_role"}', true);

  insert into auth.users (id) values (owner);
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (owner, 'https://push.example/device', 'key', 'secret');

  select count(*) into row_count
  from private.begin_owner_notifications(
    ' Shuffle.us daily bonus ready ',
    '   ',
    '/today',
    'shuffle'
  );

  if row_count <> 1 then
    raise exception 'expected one subscription row, got %', row_count;
  end if;

  select n.id, n.title, n.body
  into notification, returned_title, returned_body
  from public.notifications as n
  where n.user_id = owner
  order by n.created_at desc
  limit 1;

  select g.endpoint
  into returned_endpoint
  from private.begin_owner_notifications('Again', null, '/today', 'shuffle') as g;

  if returned_title is distinct from 'Shuffle.us daily bonus ready'
    or returned_body is not null
    or returned_endpoint is distinct from 'https://push.example/device' then
    raise exception 'begin_owner_notifications returned unexpected values';
  end if;

  -- The second call inserted another log row. Finish the first one.
  perform private.finish_owner_notification(
    notification,
    true,
    null,
    array[]::text[],
    array['https://push.example/device']
  );

  select n.sent_at, n.error, s.last_used_at
  into sent, logged_error, used
  from public.notifications as n
  join public.push_subscriptions as s on s.user_id = n.user_id
  where n.id = notification;

  if sent is null or logged_error is not null or used is null then
    raise exception 'finish_owner_notification did not record a successful send';
  end if;

  perform private.finish_owner_notification(
    notification,
    false,
    'gone',
    array['https://push.example/device'],
    array[]::text[]
  );

  select n.sent_at, n.error into sent, logged_error
  from public.notifications as n
  where n.id = notification;

  select count(*) into remaining
  from public.push_subscriptions
  where endpoint = 'https://push.example/device';

  if sent is not null or logged_error is distinct from 'gone' or remaining <> 0 then
    raise exception 'finish_owner_notification did not prune the expired endpoint';
  end if;

  delete from public.notifications where user_id = owner;

  select count(*) into row_count
  from private.begin_owner_notifications('Ready', null, '/today', 'test');

  if row_count <> 0 then
    raise exception 'expected no devices when the owner has no subscription';
  end if;

  select n.error into logged_error
  from public.notifications as n
  where n.user_id = owner
  order by n.created_at desc
  limit 1;

  if logged_error is distinct from 'No push subscriptions' then
    raise exception 'expected a no-subscription log row, got %', logged_error;
  end if;
end
$$;

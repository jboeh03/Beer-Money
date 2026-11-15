-- The applied 20261115223000 migration calls pg_catalog.nullif and
-- pg_catalog.coalesce. Those are SQL syntax, not functions, so the calls
-- fail at runtime with 42883. Replace the two private functions.
-- Signatures, security definer, empty search_path, and grants stay the same.
-- Notifications still only inform. Nothing here signs in or claims.

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
  clean_title text := nullif(pg_catalog.btrim(p_title), '');
  clean_body text := nullif(pg_catalog.btrim(p_body), '');
  clean_url text := nullif(pg_catalog.btrim(p_url), '');
  clean_source text := nullif(pg_catalog.btrim(p_source), '');
  sole_count integer;
  sole_owner uuid;
begin
  if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role' then
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
    insert into public.notifications as notification_row (user_id, title, body, url, source)
    select o.user_id, clean_title, clean_body, clean_url, clean_source
    from owners as o
    returning notification_row.id, notification_row.user_id
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
  clean_error text := nullif(pg_catalog.btrim(coalesce(p_error, '')), '');
begin
  if coalesce(auth.jwt() ->> 'role', '') is distinct from 'service_role' then
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
      when p_sent then coalesce(sent_at, pg_catalog.now())
      else null
    end,
    error = clean_error
  where id = p_notification_id
    and user_id = owner;

  delete from public.push_subscriptions
  where user_id = owner
    and endpoint = any (coalesce(p_prune_endpoints, '{}'::text[]));

  update public.push_subscriptions
  set last_used_at = pg_catalog.now()
  where user_id = owner
    and endpoint = any (coalesce(p_used_endpoints, '{}'::text[]));
end;
$$;

comment on function private.begin_owner_notifications(text, text, text, text) is
  'Records one notifications row per subscription owner and returns the devices to notify. Service-role JWT only. Does not claim or sign in.';

comment on function private.finish_owner_notification(uuid, boolean, text, text[], text[]) is
  'Marks a reminder sent or failed, drops 404/410 endpoints, and stamps last_used_at. Service-role JWT only.';

revoke all on function private.begin_owner_notifications(text, text, text, text) from public, anon, authenticated;
revoke all on function private.finish_owner_notification(uuid, boolean, text, text[], text[]) from public, anon, authenticated;

grant execute on function private.begin_owner_notifications(text, text, text, text) to service_role;
grant execute on function private.finish_owner_notification(uuid, boolean, text, text[], text[]) to service_role;

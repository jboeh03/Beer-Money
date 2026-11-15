-- Bring-your-own provider API keys.
-- The browser can read the safe view. Ciphertext stays on the server.
-- The service role writes a row only after the session user id is checked.
-- anon and authenticated cannot select ciphertext, iv, or auth_tag.

create table public.user_api_keys (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  key_hint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_tested_at timestamptz,
  last_test_ok boolean,
  primary key (user_id, provider),
  constraint user_api_keys_provider_known check (
    provider in ('gemini', 'openai', 'anthropic', 'xai', 'firecrawl', 'higgsfield')
  ),
  constraint user_api_keys_hint_length check (char_length(key_hint) = 4),
  constraint user_api_keys_secret_length check (
    char_length(ciphertext) between 1 and 4096
    and char_length(iv) between 1 and 64
    and char_length(auth_tag) between 1 and 64
  )
);

comment on table public.user_api_keys is
  'Encrypted provider API keys. Owners can read the safe columns. The server writes ciphertext.';

comment on column public.user_api_keys.ciphertext is
  'AES-256-GCM ciphertext, base64. Not selectable by anon or authenticated.';

comment on column public.user_api_keys.iv is
  'AES-256-GCM nonce, base64. Not selectable by anon or authenticated.';

comment on column public.user_api_keys.auth_tag is
  'AES-256-GCM authentication tag, base64. Not selectable by anon or authenticated.';

comment on column public.user_api_keys.key_hint is
  'Last four characters of the key. Not enough to use the key.';

comment on column public.user_api_keys.last_tested_at is
  'When the server last made a read-only provider check. Null when the key was not tested.';

comment on column public.user_api_keys.last_test_ok is
  'True when the last read-only check was accepted. Null when the key was not tested.';

alter table public.user_api_keys enable row level security;
alter table public.user_api_keys force row level security;

create policy user_api_keys_select_own
  on public.user_api_keys
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.user_api_keys from public, anon, authenticated;

grant select (
  user_id,
  provider,
  key_hint,
  created_at,
  updated_at,
  last_tested_at,
  last_test_ok
) on table public.user_api_keys to authenticated;

grant select, insert, update, delete on table public.user_api_keys to service_role;

create view public.user_api_keys_safe
with (security_invoker = true, security_barrier = true) as
select
  user_id,
  provider,
  key_hint,
  created_at,
  updated_at,
  last_tested_at,
  last_test_ok
from public.user_api_keys;

comment on view public.user_api_keys_safe is
  'Owner-visible API key status. Omits ciphertext, iv, and auth_tag. security_invoker so row level security applies.';

revoke all on table public.user_api_keys_safe from public, anon, authenticated;
grant select on table public.user_api_keys_safe to authenticated;
grant select on table public.user_api_keys_safe to service_role;

-- Owner account book and public wallet addresses.
-- Never store passwords, seed phrases, private keys, or tokens.

create table public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  app_name text not null,
  category text not null,
  username text,
  referral_url text,
  referral_code text,
  cadence text not null default 'none',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connected_accounts_app_name_not_blank check (char_length(btrim(app_name)) > 0),
  constraint connected_accounts_category_not_blank check (char_length(btrim(category)) > 0),
  constraint connected_accounts_cadence check (
    cadence in ('daily', '24h', 'weekly', 'monthly', 'none')
  ),
  constraint connected_accounts_notes_no_secrets check (
    notes is null
    or notes !~* '(seed phrase|private key|mnemonic|password|api token|secret key)'
  )
);

create table public.wallet_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text,
  address text not null,
  created_at timestamptz not null default now(),
  constraint wallet_addresses_address_public check (
    address !~ '\s'
    and char_length(address) between 8 and 128
    and address !~* '(seed|private|mnemonic|secret)'
  )
);

comment on table public.connected_accounts is
  'Apps the owner uses. Passwords, seed phrases, private keys, and tokens are not columns and must not be stored.';

comment on table public.wallet_addresses is
  'Public wallet addresses only. Not a key, seed phrase, or session token.';

comment on column public.connected_accounts.cadence is
  'daily, 24h (from last claim), weekly, monthly, or none. No claim is automated.';

create trigger connected_accounts_set_updated_at
  before update on public.connected_accounts
  for each row execute function public.set_updated_at();

create index connected_accounts_user_category_idx
  on public.connected_accounts (user_id, category);

create index wallet_addresses_user_id_idx
  on public.wallet_addresses (user_id);

alter table public.connected_accounts enable row level security;
alter table public.connected_accounts force row level security;
alter table public.wallet_addresses enable row level security;
alter table public.wallet_addresses force row level security;

create policy connected_accounts_select_own
  on public.connected_accounts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy connected_accounts_insert_own
  on public.connected_accounts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy connected_accounts_update_own
  on public.connected_accounts
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy connected_accounts_delete_own
  on public.connected_accounts
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy wallet_addresses_select_own
  on public.wallet_addresses
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy wallet_addresses_insert_own
  on public.wallet_addresses
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy wallet_addresses_delete_own
  on public.wallet_addresses
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.connected_accounts from public, anon;
revoke all on table public.wallet_addresses from public, anon;

grant select, insert, update, delete on table public.connected_accounts to authenticated, service_role;
grant select, insert, delete on table public.wallet_addresses to authenticated, service_role;

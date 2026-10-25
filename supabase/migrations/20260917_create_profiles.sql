-- ============================================================================
-- Iahbrary profiles
-- Stores the public display name only. Login email lives in auth.users and is
-- never copied into an app-readable table.
-- RLS is enabled and denied by default; policies are added in
-- 20261025_secure_rls.sql.
-- ============================================================================

create table if not exists public.profiles (
  id text primary key,
  username text unique not null,
  created_at bigint not null,
  updated_at bigint not null
);

-- Case-insensitive uniqueness. The app normalizes to lowercase, and this index
-- is the database-level guard against casing tricks and signup races.
create unique index if not exists idx_profiles_username_lower
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

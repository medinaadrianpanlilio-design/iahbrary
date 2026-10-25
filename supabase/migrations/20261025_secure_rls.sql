-- ============================================================================
-- Iahbrary security hardening
--
-- What this migration does:
--   1. Makes the shared catalog read-only for clients (insert-only for new
--      discoveries; no client updates or deletes).
--   2. Scopes every personal row to auth.uid() with Row Level Security.
--   3. Removes the copied email column from profiles.
--   4. Creates the profile from auth metadata in the same transaction as the
--      auth user, so signup cannot leave a half-created account.
--   5. Adds narrow SECURITY DEFINER RPCs for the two operations that need
--      cross-row access: username availability and account deletion.
--   6. Creates the missing book_highlights table with owner-only RLS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Book highlights (referenced by the app but missing from the prototype)
-- ---------------------------------------------------------------------------
create table if not exists public.book_highlights (
  id text primary key,
  user_id text not null,
  book_id text not null references public.books(id) on delete cascade,
  user_book_id text references public.user_books(id) on delete cascade,
  quote text not null,
  page integer,
  note text,
  created_at bigint not null
);

alter table public.book_highlights add column if not exists user_id text;
alter table public.book_highlights add column if not exists book_id text;
alter table public.book_highlights add column if not exists user_book_id text;
alter table public.book_highlights add column if not exists quote text;
alter table public.book_highlights add column if not exists page integer;
alter table public.book_highlights add column if not exists note text;
alter table public.book_highlights add column if not exists created_at bigint;

alter table public.book_highlights enable row level security;
create index if not exists idx_book_highlights_user_id on public.book_highlights(user_id);
create index if not exists idx_book_highlights_user_book_id on public.book_highlights(user_book_id);

-- ---------------------------------------------------------------------------
-- 1. Profiles: remove the public email copy and deny direct cross-user reads
-- ---------------------------------------------------------------------------
drop index if exists public.idx_profiles_email;
alter table public.profiles drop column if exists email;

alter table public.profiles
  drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[a-z0-9_.-]{3,24}$') not valid;

drop policy if exists "Profiles are readable by everyone" on public.profiles;
drop policy if exists "Profiles can be inserted by anyone" on public.profiles;
drop policy if exists "Profiles can be updated by anyone" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid()::text = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid()::text = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid()::text = id)
  with check (auth.uid()::text = id);

create policy "profiles_delete_own"
  on public.profiles for delete
  to authenticated
  using (auth.uid()::text = id);

-- Backfill profiles for accounts created before the trigger existed. Invalid
-- or duplicate usernames are skipped rather than failing the migration.
insert into public.profiles (id, username, created_at, updated_at)
select
  u.id::text,
  lower(trim(u.raw_user_meta_data->>'username')),
  (extract(epoch from now()) * 1000)::bigint,
  (extract(epoch from now()) * 1000)::bigint
from auth.users u
where u.raw_user_meta_data->>'username' is not null
  and lower(trim(u.raw_user_meta_data->>'username')) ~ '^[a-z0-9_.-]{3,24}$'
  and not exists (
    select 1 from public.profiles p where p.id = u.id::text
  )
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 2. Books: shared catalog, public read, authenticated insert-only
-- ---------------------------------------------------------------------------
drop policy if exists "Books are viewable by everyone" on public.books;
drop policy if exists "Books can be inserted by anyone" on public.books;
drop policy if exists "Books can be updated by anyone" on public.books;
drop policy if exists "books_select_public" on public.books;
drop policy if exists "books_insert_authenticated" on public.books;

create policy "books_select_public"
  on public.books for select
  using (true);

create policy "books_insert_authenticated"
  on public.books for insert
  to authenticated
  with check (
    length(trim(title)) > 0
    and length(trim(id)) > 0
  );

-- No update or delete policy: catalog rows are immutable for clients.

-- ---------------------------------------------------------------------------
-- 3. User books: strictly owner-scoped
-- ---------------------------------------------------------------------------
drop policy if exists "User books are accessible" on public.user_books;
drop policy if exists "user_books_select_own" on public.user_books;
drop policy if exists "user_books_insert_own" on public.user_books;
drop policy if exists "user_books_update_own" on public.user_books;
drop policy if exists "user_books_delete_own" on public.user_books;

create policy "user_books_select_own"
  on public.user_books for select
  to authenticated
  using (auth.uid()::text = user_id);

create policy "user_books_insert_own"
  on public.user_books for insert
  to authenticated
  with check (auth.uid()::text = user_id);

create policy "user_books_update_own"
  on public.user_books for update
  to authenticated
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy "user_books_delete_own"
  on public.user_books for delete
  to authenticated
  using (auth.uid()::text = user_id);

create unique index if not exists idx_user_books_user_book
  on public.user_books(user_id, book_id)
  where user_id is not null;

-- ---------------------------------------------------------------------------
-- 4. Reading sessions: ownership comes from the parent user_book
-- ---------------------------------------------------------------------------
drop policy if exists "Reading sessions are accessible" on public.reading_sessions;
drop policy if exists "reading_sessions_select_own" on public.reading_sessions;
drop policy if exists "reading_sessions_insert_own" on public.reading_sessions;
drop policy if exists "reading_sessions_update_own" on public.reading_sessions;
drop policy if exists "reading_sessions_delete_own" on public.reading_sessions;

create policy "reading_sessions_select_own"
  on public.reading_sessions for select
  to authenticated
  using (
    exists (
      select 1 from public.user_books ub
      where ub.id = reading_sessions.user_book_id
        and ub.user_id = auth.uid()::text
    )
  );

create policy "reading_sessions_insert_own"
  on public.reading_sessions for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_books ub
      where ub.id = reading_sessions.user_book_id
        and ub.user_id = auth.uid()::text
        and ub.book_id = reading_sessions.book_id
    )
  );

create policy "reading_sessions_update_own"
  on public.reading_sessions for update
  to authenticated
  using (
    exists (
      select 1 from public.user_books ub
      where ub.id = reading_sessions.user_book_id
        and ub.user_id = auth.uid()::text
    )
  )
  with check (
    exists (
      select 1 from public.user_books ub
      where ub.id = reading_sessions.user_book_id
        and ub.user_id = auth.uid()::text
        and ub.book_id = reading_sessions.book_id
    )
  );

create policy "reading_sessions_delete_own"
  on public.reading_sessions for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_books ub
      where ub.id = reading_sessions.user_book_id
        and ub.user_id = auth.uid()::text
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Book reviews: same parent-ownership pattern
-- ---------------------------------------------------------------------------
drop policy if exists "Book reviews are accessible" on public.book_reviews;
drop policy if exists "book_reviews_select_own" on public.book_reviews;
drop policy if exists "book_reviews_insert_own" on public.book_reviews;
drop policy if exists "book_reviews_update_own" on public.book_reviews;
drop policy if exists "book_reviews_delete_own" on public.book_reviews;

create policy "book_reviews_select_own"
  on public.book_reviews for select
  to authenticated
  using (
    exists (
      select 1 from public.user_books ub
      where ub.id = book_reviews.user_book_id
        and ub.user_id = auth.uid()::text
    )
  );

create policy "book_reviews_insert_own"
  on public.book_reviews for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_books ub
      where ub.id = book_reviews.user_book_id
        and ub.user_id = auth.uid()::text
        and ub.book_id = book_reviews.book_id
    )
  );

create policy "book_reviews_update_own"
  on public.book_reviews for update
  to authenticated
  using (
    exists (
      select 1 from public.user_books ub
      where ub.id = book_reviews.user_book_id
        and ub.user_id = auth.uid()::text
    )
  )
  with check (
    exists (
      select 1 from public.user_books ub
      where ub.id = book_reviews.user_book_id
        and ub.user_id = auth.uid()::text
        and ub.book_id = book_reviews.book_id
    )
  );

create policy "book_reviews_delete_own"
  on public.book_reviews for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_books ub
      where ub.id = book_reviews.user_book_id
        and ub.user_id = auth.uid()::text
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Highlights: owner-scoped by user_id
-- ---------------------------------------------------------------------------
drop policy if exists "book_highlights_select_own" on public.book_highlights;
drop policy if exists "book_highlights_insert_own" on public.book_highlights;
drop policy if exists "book_highlights_update_own" on public.book_highlights;
drop policy if exists "book_highlights_delete_own" on public.book_highlights;

create policy "book_highlights_select_own"
  on public.book_highlights for select
  to authenticated
  using (auth.uid()::text = user_id);

create policy "book_highlights_insert_own"
  on public.book_highlights for insert
  to authenticated
  with check (
    auth.uid()::text = user_id
    and (
      user_book_id is null
      or exists (
        select 1 from public.user_books ub
        where ub.id = book_highlights.user_book_id
          and ub.user_id = auth.uid()::text
      )
    )
  );

create policy "book_highlights_update_own"
  on public.book_highlights for update
  to authenticated
  using (auth.uid()::text = user_id)
  with check (
    auth.uid()::text = user_id
    and (
      user_book_id is null
      or exists (
        select 1 from public.user_books ub
        where ub.id = book_highlights.user_book_id
          and ub.user_id = auth.uid()::text
      )
    )
  );

create policy "book_highlights_delete_own"
  on public.book_highlights for delete
  to authenticated
  using (auth.uid()::text = user_id);

-- ---------------------------------------------------------------------------
-- 7. Username availability without exposing the profiles table
-- ---------------------------------------------------------------------------
create or replace function public.is_username_available(desired_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    desired_username is not null
    and lower(trim(desired_username)) ~ '^[a-z0-9_.-]{3,24}$'
    and not exists (
      select 1
      from public.profiles
      where lower(username) = lower(trim(desired_username))
    ),
    false
  );
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. Create the profile in the same transaction as the auth user
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  desired_username text;
  now_ms bigint;
begin
  desired_username := lower(trim(new.raw_user_meta_data->>'username'));

  if desired_username is null or desired_username = '' then
    return new;
  end if;

  if desired_username !~ '^[a-z0-9_.-]{3,24}$' then
    raise exception 'Invalid username format';
  end if;

  now_ms := (extract(epoch from now()) * 1000)::bigint;

  insert into public.profiles (id, username, created_at, updated_at)
  values (new.id::text, desired_username, now_ms, now_ms);

  return new;
end;
$$;

drop trigger if exists iahbrary_on_auth_user_created on auth.users;
create trigger iahbrary_on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 9. One transactional, self-only account deletion
-- ---------------------------------------------------------------------------
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id text := auth.uid()::text;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.book_highlights
  where user_id = current_user_id
     or (
       user_id is null
       and user_book_id in (
         select id from public.user_books where user_id = current_user_id
       )
     );

  delete from public.book_reviews
  where user_book_id in (
    select id from public.user_books where user_id = current_user_id
  );

  delete from public.reading_sessions
  where user_book_id in (
    select id from public.user_books where user_id = current_user_id
  );

  delete from public.user_books where user_id = current_user_id;
  delete from public.profiles where id = current_user_id;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

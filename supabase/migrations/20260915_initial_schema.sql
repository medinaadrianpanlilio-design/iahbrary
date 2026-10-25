-- ============================================================================
-- Iahbrary base schema
-- Catalog + reading tables. Identity lives in Supabase's auth schema.
-- RLS is enabled here and denied by default; policies are added in the
-- hardened migration at 20261025_secure_rls.sql.
-- ============================================================================

create table if not exists public.books (
  id text primary key,
  title text not null,
  authors jsonb not null default '[]'::jsonb,
  description text,
  thumbnail_url text,
  total_pages integer not null default 300,
  current_page integer not null default 0,
  status text not null default 'WANT_TO_READ',
  created_at bigint not null,
  updated_at bigint not null
);

create table if not exists public.reading_sessions (
  id text primary key,
  book_id text not null references public.books(id) on delete cascade,
  start_time bigint not null,
  end_time bigint not null,
  duration_seconds integer not null default 0,
  start_page integer not null default 0,
  end_page integer not null default 0,
  pages_read integer not null default 0,
  notes text,
  created_at bigint not null
);

create table if not exists public.book_reviews (
  id text primary key,
  book_id text not null references public.books(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  finished_at bigint not null
);

create index if not exists idx_books_status on public.books(status);
create index if not exists idx_reading_sessions_book_id on public.reading_sessions(book_id);
create index if not exists idx_reading_sessions_created_at on public.reading_sessions(created_at);
create index if not exists idx_book_reviews_book_id on public.book_reviews(book_id);

alter table public.books enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.book_reviews enable row level security;

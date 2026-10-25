-- ============================================================================
-- Iahbrary Database Architecture Migration
-- Decouples Book, UserBook, ReadingSession, and BookReview
-- Target: Supabase PostgreSQL
-- ============================================================================

-- 1. EXPAND 'books' TABLE WITH GLOBAL BIBLIOGRAPHIC METADATA
ALTER TABLE IF EXISTS public.books
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS isbn10 TEXT,
  ADD COLUMN IF NOT EXISTS isbn13 TEXT,
  ADD COLUMN IF NOT EXISTS publisher TEXT,
  ADD COLUMN IF NOT EXISTS published_date TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS api_source TEXT DEFAULT 'curated',
  ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Update cover_url from thumbnail_url if thumbnail_url exists
UPDATE public.books
SET cover_url = thumbnail_url
WHERE cover_url IS NULL AND thumbnail_url IS NOT NULL;

-- 2. CREATE 'user_books' TABLE
CREATE TABLE IF NOT EXISTS public.user_books (
  id TEXT PRIMARY KEY,
  user_id TEXT, -- Ready for Supabase auth.users(id)
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  total_pages INTEGER NOT NULL DEFAULT 300,
  current_page INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'WANT_TO_READ',
  date_added BIGINT NOT NULL,
  date_started BIGINT,
  date_finished BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Index for fast user library queries
CREATE INDEX IF NOT EXISTS idx_user_books_book_id ON public.user_books(book_id);
CREATE INDEX IF NOT EXISTS idx_user_books_status ON public.user_books(status);
CREATE INDEX IF NOT EXISTS idx_user_books_user_id ON public.user_books(user_id);

-- 3. MIGRATE EXISTING USER READING DATA INTO 'user_books'
-- Backfill user_books from existing books so user's active reading progress is preserved
INSERT INTO public.user_books (id, book_id, total_pages, current_page, status, date_added, created_at, updated_at)
SELECT
  'ub_' || id,
  id,
  COALESCE(total_pages, 300),
  COALESCE(current_page, 0),
  COALESCE(status, 'WANT_TO_READ'),
  created_at,
  created_at,
  updated_at
FROM public.books
ON CONFLICT (id) DO NOTHING;

-- 4. UPDATE 'reading_sessions' WITH 'user_book_id'
ALTER TABLE IF EXISTS public.reading_sessions
  ADD COLUMN IF NOT EXISTS user_book_id TEXT REFERENCES public.user_books(id) ON DELETE CASCADE;

-- Backfill user_book_id for existing sessions
UPDATE public.reading_sessions rs
SET user_book_id = 'ub_' || rs.book_id
WHERE rs.user_book_id IS NULL AND EXISTS (
  SELECT 1 FROM public.user_books ub WHERE ub.id = 'ub_' || rs.book_id
);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_book_id ON public.reading_sessions(user_book_id);

-- 5. UPDATE 'book_reviews' WITH 'user_book_id' AND STANDARD TIMESTAMPS
ALTER TABLE IF EXISTS public.book_reviews
  ADD COLUMN IF NOT EXISTS user_book_id TEXT REFERENCES public.user_books(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS date_finished BIGINT,
  ADD COLUMN IF NOT EXISTS created_at BIGINT,
  ADD COLUMN IF NOT EXISTS updated_at BIGINT;

-- Backfill user_book_id and timestamps for existing reviews
UPDATE public.book_reviews br
SET
  user_book_id = 'ub_' || br.book_id,
  date_finished = COALESCE(br.date_finished, br.finished_at),
  created_at = COALESCE(br.created_at, br.finished_at, EXTRACT(EPOCH FROM NOW())::BIGINT * 1000),
  updated_at = COALESCE(br.updated_at, br.finished_at, EXTRACT(EPOCH FROM NOW())::BIGINT * 1000)
WHERE br.user_book_id IS NULL AND EXISTS (
  SELECT 1 FROM public.user_books ub WHERE ub.id = 'ub_' || br.book_id
);

CREATE INDEX IF NOT EXISTS idx_book_reviews_user_book_id ON public.book_reviews(user_book_id);

-- 6. ROW LEVEL SECURITY
-- Keep every table denied by default. The least-privilege policies live in
-- 20261025_secure_rls.sql so a half-applied setup never exposes user rows.
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;

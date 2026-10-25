export type BookStatus = 'WANT_TO_READ' | 'READING' | 'FINISHED';

/**
 * 1. BOOK ENTITY
 * Bibliographic work metadata (from Google Books, Open Library, or Curated catalog).
 * Global and shared across users; does NOT contain user-specific tracking.
 */
export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  authors: string[];
  description?: string;
  coverUrl?: string;
  thumbnailUrl?: string; // Backwards compatibility with existing UI
  isbn10?: string;
  isbn13?: string;
  publisher?: string;
  publishedDate?: string;
  language?: string;
  apiSource?: 'google_books' | 'open_library' | 'curated';
  externalId?: string;
  createdAt: number;
  updatedAt: number;

  // Legacy fields kept during transition from monolithic Book to UserBook
  totalPages: number;
  currentPage: number;
  status: BookStatus;
}

/**
 * 2. USER LIBRARY RECORD (UserBook)
 * Represents a user's individual copy/relationship with a book.
 * Holds edition-specific page count, current progress, and reading dates.
 */
export interface UserBook {
  id: string;
  userId?: string;
  bookId: string;
  totalPages: number; // Specific edition page count chosen by user
  currentPage: number;
  status: BookStatus;
  dateAdded: number;
  dateStarted?: number;
  dateFinished?: number;
  createdAt: number;
  updatedAt: number;

  // Hydrated bibliographic reference for UI convenience
  book?: Book;
}

/**
 * 3. READING SESSION ENTITY
 * Represents one discrete session of reading.
 */
export interface ReadingSession {
  id: string;
  userBookId?: string;
  bookId: string; // Backwards compatibility with Supabase reading_sessions
  startTime: number;
  endTime: number;
  durationSeconds: number;
  startPage: number;
  endPage: number;
  pagesRead: number;
  notes?: string;
  createdAt: number;
}

/**
 * 4. BOOK REVIEW ENTITY
 * User review and rating for their completed book.
 */
export interface BookReview {
  id: string;
  userBookId?: string;
  bookId: string; // Backwards compatibility with Supabase book_reviews
  rating: number; // 1 to 5 stars
  comment?: string;
  dateFinished?: number;
  finishedAt?: number; // Backwards compatibility with legacy Supabase column
  createdAt?: number;
  updatedAt?: number;
}

export interface ReadingStats {
  totalDurationSeconds: number;
  totalPagesRead: number;
  totalBooksFinished: number;
  activeBooksCount: number;
  averageMinutesPerPage: number;
  sessionsCount: number;
}

/**
 * 5. BOOK HIGHLIGHT & QUOTE ENTITY
 * Represents an excerpt, key takeaway, or quotation captured from a book.
 */
export interface BookHighlight {
  id: string;
  bookId: string;
  userBookId?: string;
  quote: string;
  page?: number;
  note?: string;
  createdAt: number;
}

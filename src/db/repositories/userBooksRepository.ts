import { supabase } from '@/services/supabase';
import { UserBook, Book, BookStatus } from '@/types';

interface UserBookRow {
  id: string;
  user_id: string | null;
  book_id: string;
  total_pages: number;
  current_page: number;
  status: string;
  date_added: number;
  date_started: number | null;
  date_finished: number | null;
  created_at: number;
  updated_at: number;
  books?: any;
}

function mapRowToUserBook(row: UserBookRow): UserBook {
  let book: Book | undefined = undefined;
  if (row.books) {
    const b = row.books;
    let authors: string[] = [];
    if (Array.isArray(b.authors)) {
      authors = b.authors;
    } else if (typeof b.authors === 'string') {
      try {
        authors = JSON.parse(b.authors);
      } catch {
        authors = [b.authors];
      }
    }

    book = {
      id: b.id,
      title: b.title,
      subtitle: b.subtitle || undefined,
      authors,
      description: b.description || undefined,
      coverUrl: b.cover_url || b.thumbnail_url || undefined,
      thumbnailUrl: b.thumbnail_url || b.cover_url || undefined,
      isbn10: b.isbn10 || undefined,
      isbn13: b.isbn13 || undefined,
      publisher: b.publisher || undefined,
      publishedDate: b.published_date || undefined,
      language: b.language || 'en',
      apiSource: b.api_source || 'curated',
      externalId: b.external_id || undefined,
      totalPages: Number(b.total_pages || row.total_pages),
      currentPage: Number(row.current_page),
      status: row.status as BookStatus,
      createdAt: Number(b.created_at || row.created_at),
      updatedAt: Number(b.updated_at || row.updated_at),
    };
  }

  return {
    id: row.id,
    userId: row.user_id || undefined,
    bookId: row.book_id,
    totalPages: Number(row.total_pages),
    currentPage: Number(row.current_page),
    status: row.status as BookStatus,
    dateAdded: Number(row.date_added),
    dateStarted: row.date_started ? Number(row.date_started) : undefined,
    dateFinished: row.date_finished ? Number(row.date_finished) : undefined,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    book,
  };
}

/**
 * Get all books in user's library with joined bibliographic book metadata
 */
export async function getAllUserBooks(): Promise<UserBook[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('user_books')
      .select('*, books(*)')
      .order('updated_at', { ascending: false });

    if (user?.id) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Supabase getAllUserBooks error (table might need migration):', error.message);
      return [];
    }
    return (data || []).map(mapRowToUserBook);
  } catch (e) {
    console.error('getAllUserBooks exception:', e);
    return [];
  }
}

/**
 * Get user books filtered by status ('WANT_TO_READ', 'READING', 'FINISHED')
 */
export async function getUserBooksByStatus(status: BookStatus): Promise<UserBook[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('user_books')
      .select('*, books(*)')
      .eq('status', status)
      .order('updated_at', { ascending: false });

    if (user?.id) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Supabase getUserBooksByStatus error:', error.message);
      return [];
    }
    return (data || []).map(mapRowToUserBook);
  } catch (e) {
    console.error('getUserBooksByStatus exception:', e);
    return [];
  }
}

/**
 * Get specific user_book record by its id
 */
export async function getUserBookById(id: string): Promise<UserBook | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('user_books')
      .select('*, books(*)')
      .eq('id', id);

    if (user?.id) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) return null;
    return mapRowToUserBook(data);
  } catch (e) {
    console.error('getUserBookById exception:', e);
    return null;
  }
}

/**
 * Get specific user_book record by its book_id
 */
export async function getUserBookByBookId(bookId: string): Promise<UserBook | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    let query = supabase
      .from('user_books')
      .select('*, books(*)')
      .eq('book_id', bookId);

    if (user?.id) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.limit(1).maybeSingle();
    if (error || !data) return null;
    return mapRowToUserBook(data);
  } catch (e) {
    console.error('getUserBookByBookId exception:', e);
    return null;
  }
}

/**
 * Ensures a user_books record exists for a book.
 * If one already exists, returns it; otherwise creates a new record.
 */
export async function ensureUserBook(
  book: Book | { id: string; totalPages?: number; currentPage?: number; status?: BookStatus }
): Promise<UserBook> {
  const existing = await getUserBookByBookId(book.id);
  if (existing) {
    return existing;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) {
    throw new Error('You must be signed in to add a book to your library.');
  }

  const ubId = `ub_${user.id}_${book.id}`;
  const now = Date.now();

  const newUserBook: UserBook = {
    id: ubId,
    userId: user.id,
    bookId: book.id,
    totalPages: book.totalPages || 300,
    currentPage: book.currentPage || 0,
    status: book.status || 'WANT_TO_READ',
    dateAdded: now,
    dateStarted: book.status === 'READING' ? now : undefined,
    createdAt: now,
    updatedAt: now,
    book: 'title' in book ? (book as Book) : undefined,
  };

  await addUserBook(newUserBook);
  return newUserBook;
}

/**
 * Add or update a user's library tracking copy.
 * Uses currently authenticated user's ID if not explicitly specified.
 */
export async function addUserBook(userBook: UserBook): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      throw new Error('You must be signed in to update your library.');
    }

    const effectiveUserId = userBook.userId || user.id;
    if (effectiveUserId !== user.id) {
      throw new Error('You can only update your own library.');
    }

    const { error } = await supabase.from('user_books').upsert({
      id: userBook.id,
      user_id: effectiveUserId,
      book_id: userBook.bookId,
      total_pages: userBook.totalPages,
      current_page: userBook.currentPage,
      status: userBook.status,
      date_added: userBook.dateAdded,
      date_started: userBook.dateStarted || null,
      date_finished: userBook.dateFinished || null,
      created_at: userBook.createdAt,
      updated_at: userBook.updatedAt,
    });

    if (error) {
      console.error('Supabase addUserBook error:', error.message);
    }
  } catch (e) {
    console.error('addUserBook exception:', e);
  }
}

/**
 * Update user's current reading progress for their specific copy
 */
export async function updateUserBookProgress(
  userBookId: string,
  currentPage: number,
  status?: BookStatus
): Promise<void> {
  try {
    const now = Date.now();
    const updateData: any = {
      current_page: currentPage,
      updated_at: now,
    };

    if (status) {
      updateData.status = status;
      if (status === 'READING') {
        updateData.date_started = now;
      } else if (status === 'FINISHED') {
        updateData.date_finished = now;
      }
    }

    const { error } = await supabase
      .from('user_books')
      .update(updateData)
      .eq('id', userBookId);

    if (error) {
      console.error('Supabase updateUserBookProgress error:', error.message);
    }
  } catch (e) {
    console.error('updateUserBookProgress exception:', e);
  }
}

/**
 * Sets a book as the active reading book by book_id.
 * Demotes all other READING books to WANT_TO_READ first,
 * then promotes the target book to READING with a fresh updated_at.
 * This ensures the home screen always picks the correct active book.
 */
export async function setActiveReadingBook(bookId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const now = Date.now();

    // Step 0: Ensure target book has a user_books record
    await ensureUserBook({ id: bookId, status: 'READING' });

    // Step 1: Demote all currently READING books (except the target) to WANT_TO_READ
    let demoteQuery = supabase
      .from('user_books')
      .update({ status: 'WANT_TO_READ', updated_at: now - 1 })
      .eq('status', 'READING')
      .neq('book_id', bookId);

    if (user?.id) {
      demoteQuery = demoteQuery.eq('user_id', user.id);
    }
    await demoteQuery;

    // Step 2: Promote the target book to READING (always bump updated_at)
    let promoteQuery = supabase
      .from('user_books')
      .update({ status: 'READING', updated_at: now })
      .eq('book_id', bookId);

    if (user?.id) {
      promoteQuery = promoteQuery.eq('user_id', user.id);
    }

    const { error } = await promoteQuery;
    if (error) {
      console.error('Supabase setActiveReadingBook error:', error.message);
    }
  } catch (e) {
    console.error('setActiveReadingBook exception:', e);
  }
}


/**
 * Delete a book from the user's library
 */
export async function deleteUserBook(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('user_books').delete().eq('id', id);
    if (error) {
      console.error('Supabase deleteUserBook error:', error.message);
    }
  } catch (e) {
    console.error('deleteUserBook exception:', e);
  }
}

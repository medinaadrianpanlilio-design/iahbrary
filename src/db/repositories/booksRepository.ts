import { supabase } from '@/services/supabase';
import { Book, BookStatus } from '@/types';
import {
  ensureUserBook,
  getUserBookByBookId,
  setActiveReadingBook,
  updateUserBookProgress,
} from './userBooksRepository';

interface BookRow {
  id: string;
  title: string;
  authors: string[] | string;
  description: string | null;
  thumbnail_url: string | null;
  total_pages: number;
  current_page: number;
  status: string;
  created_at: number;
  updated_at: number;
}

function mapRowToBook(row: BookRow): Book {
  let authors: string[] = [];
  if (Array.isArray(row.authors)) {
    authors = row.authors;
  } else if (typeof row.authors === 'string') {
    try {
      authors = JSON.parse(row.authors);
    } catch {
      authors = [row.authors];
    }
  }

  return {
    id: row.id,
    title: row.title,
    authors,
    description: row.description || undefined,
    thumbnailUrl: row.thumbnail_url || undefined,
    totalPages: row.total_pages,
    currentPage: row.current_page,
    status: row.status as BookStatus,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export async function getAllBooks(): Promise<Book[]> {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Supabase getAllBooks error:', error.message);
      return [];
    }
    return (data || []).map(mapRowToBook);
  } catch (e) {
    console.error('getAllBooks exception:', e);
    return [];
  }
}

export async function getBooksByStatus(status: BookStatus): Promise<Book[]> {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('status', status)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Supabase getBooksByStatus error:', error.message);
      return [];
    }
    return (data || []).map(mapRowToBook);
  } catch (e) {
    console.error('getBooksByStatus exception:', e);
    return [];
  }
}

export async function getBookById(id: string): Promise<Book | null> {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return mapRowToBook(data);
  } catch (e) {
    console.error('getBookById exception:', e);
    return null;
  }
}

export async function addBook(book: Book): Promise<void> {
  try {
    // The catalog is shared and immutable for clients: insert a missing book
    // but never overwrite a row that another user may already be reading.
    // ON CONFLICT DO NOTHING needs only the INSERT policy, not UPDATE.
    const { error } = await supabase.from('books').upsert(
      {
        id: book.id,
        title: book.title,
        authors: book.authors,
        description: book.description || null,
        thumbnail_url: book.thumbnailUrl || null,
        total_pages: book.totalPages,
        current_page: book.currentPage,
        status: book.status,
        created_at: book.createdAt,
        updated_at: book.updatedAt,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

    if (error) {
      console.error('Supabase addBook error:', error.message);
    }

    // Ensure corresponding user_books record exists so reading sessions/reviews satisfy FK constraint
    await ensureUserBook(book);

    // If marked as READING, activate it in user_books so home screen displays it immediately
    if (book.status === 'READING') {
      await setActiveReadingBook(book.id);
    }
  } catch (e) {
    console.error('addBook exception:', e);
  }
}

export async function updateBookProgress(
  id: string,
  currentPage: number,
  status?: BookStatus
): Promise<void> {
  try {
    // Only update user_books — the books table is a shared catalog, not per-user
    const ub = await getUserBookByBookId(id);
    if (ub) {
      await updateUserBookProgress(ub.id, currentPage, status);
    } else {
      await ensureUserBook({ id, currentPage, status });
    }
  } catch (e) {
    console.error('updateBookProgress exception:', e);
  }
}

export async function updateBookStatus(id: string, status: BookStatus): Promise<void> {
  try {
    // Only update user_books — the books table is a shared catalog, not per-user
    if (status === 'READING') {
      await setActiveReadingBook(id);
    } else {
      const ub = await getUserBookByBookId(id);
      if (ub) {
        await updateUserBookProgress(ub.id, ub.currentPage, status);
      }
    }
  } catch (e) {
    console.error('updateBookStatus exception:', e);
  }
}

export async function deleteBook(id: string): Promise<void> {
  try {
    // Delete only the current user's user_books record (not the shared catalog entry)
    const { data: { user } } = await supabase.auth.getUser();
    const query = supabase.from('user_books').delete().eq('book_id', id);
    if (user?.id) {
      await query.eq('user_id', user.id);
    } else {
      await query;
    }
  } catch (e) {
    console.error('deleteBook exception:', e);
  }
}

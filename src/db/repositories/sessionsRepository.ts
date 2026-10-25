import { supabase } from '@/services/supabase';
import { ReadingSession, ReadingStats } from '@/types';
import { ensureUserBook } from './userBooksRepository';
import { queueOfflineSession, flushOfflineSessionsQueue } from '@/services/offlineQueue';

interface SessionRow {
  id: string;
  user_book_id?: string | null;
  book_id: string;
  start_time: number;
  end_time: number;
  duration_seconds: number;
  start_page: number;
  end_page: number;
  pages_read: number;
  notes: string | null;
  created_at: number;
}

function mapRowToSession(row: SessionRow): ReadingSession {
  return {
    id: row.id,
    userBookId: row.user_book_id || undefined,
    bookId: row.book_id,
    startTime: Number(row.start_time),
    endTime: Number(row.end_time),
    durationSeconds: Number(row.duration_seconds),
    startPage: Number(row.start_page),
    endPage: Number(row.end_page),
    pagesRead: Number(row.pages_read),
    notes: row.notes || undefined,
    createdAt: Number(row.created_at),
  };
}

/**
 * Returns all user_book IDs belonging to the current user.
 * Used to scope session queries per-user reliably.
 */
async function getCurrentUserBookIds(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return [];

  const { data, error } = await supabase
    .from('user_books')
    .select('id')
    .eq('user_id', user.id);

  if (error || !data) return [];
  return data.map((row) => row.id);
}

export async function addSession(session: ReadingSession): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Resolve a valid user_book_id belonging to the current user
    let validUserBookId: string | null = null;

    if (session.userBookId) {
      // Verify it exists AND belongs to the current user
      const query = supabase
        .from('user_books')
        .select('id')
        .eq('id', session.userBookId);
      if (user?.id) query.eq('user_id', user.id);
      const { data } = await query.maybeSingle();
      if (data) validUserBookId = data.id;
    }

    if (!validUserBookId && session.bookId) {
      // Find this user's user_books record for this book
      const query = supabase
        .from('user_books')
        .select('id')
        .eq('book_id', session.bookId);
      if (user?.id) query.eq('user_id', user.id);
      const { data: ubByBook } = await query.limit(1).maybeSingle();

      if (ubByBook) {
        validUserBookId = ubByBook.id;
      } else {
        try {
          const ensured = await ensureUserBook({ id: session.bookId });
          validUserBookId = ensured.id;
        } catch {
          validUserBookId = null;
        }
      }
    }

    const { error } = await supabase.from('reading_sessions').insert({
      id: session.id,
      user_book_id: validUserBookId,
      book_id: session.bookId,
      start_time: session.startTime,
      end_time: session.endTime,
      duration_seconds: session.durationSeconds,
      start_page: session.startPage,
      end_page: session.endPage,
      pages_read: session.pagesRead,
      notes: session.notes || null,
      created_at: session.createdAt,
    });

    if (error) {
      console.warn('Supabase addSession error, saving to offline queue:', error.message);
      await queueOfflineSession(session);
    } else {
      // Sync any previously pending offline sessions in background
      flushOfflineSessionsQueue().catch(() => {});
    }
  } catch (e) {
    console.warn('addSession network exception, saving to offline queue:', e);
    await queueOfflineSession(session);
  }
}

export async function getSessionsForBook(bookId: string): Promise<ReadingSession[]> {
  try {
    const userBookIds = await getCurrentUserBookIds();
    if (userBookIds.length === 0) return [];

    const { data, error } = await supabase
      .from('reading_sessions')
      .select('*')
      .eq('book_id', bookId)
      .in('user_book_id', userBookIds)
      .order('start_time', { ascending: false });

    if (error || !data) return [];
    return data.map(mapRowToSession);
  } catch (e) {
    console.error('getSessionsForBook exception:', e);
    return [];
  }
}

/** Returns the single most recent session for a book, or null if none exist. */
export async function getLastSessionForBook(bookId: string): Promise<ReadingSession | null> {
  try {
    const userBookIds = await getCurrentUserBookIds();
    if (userBookIds.length === 0) return null;

    const { data, error } = await supabase
      .from('reading_sessions')
      .select('*')
      .eq('book_id', bookId)
      .in('user_book_id', userBookIds)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return mapRowToSession(data);
  } catch (e) {
    console.error('getLastSessionForBook exception:', e);
    return null;
  }
}

export async function getAllSessions(): Promise<ReadingSession[]> {
  try {
    const userBookIds = await getCurrentUserBookIds();
    if (userBookIds.length === 0) return [];

    const { data, error } = await supabase
      .from('reading_sessions')
      .select('*')
      .in('user_book_id', userBookIds)
      .order('start_time', { ascending: false });

    if (error || !data) return [];
    return data.map(mapRowToSession);
  } catch (e) {
    console.error('getAllSessions exception:', e);
    return [];
  }
}

/** Returns average minutes-per-page for a specific book across all its sessions. Returns 0 if no pages logged. */
export async function getBookPaceMinutesPerPage(bookId: string): Promise<number> {
  try {
    const sessions = await getSessionsForBook(bookId);
    let totalSeconds = 0;
    let totalPages = 0;
    sessions.forEach((s) => {
      totalSeconds += s.durationSeconds;
      totalPages += s.pagesRead;
    });
    if (totalPages === 0) return 0;
    return Number(((totalSeconds / 60) / totalPages).toFixed(1));
  } catch (e) {
    console.error('getBookPaceMinutesPerPage exception:', e);
    return 0;
  }
}

export async function getReadingStats(): Promise<ReadingStats> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return {
        totalDurationSeconds: 0,
        totalPagesRead: 0,
        totalBooksFinished: 0,
        activeBooksCount: 0,
        averageMinutesPerPage: 0,
        sessionsCount: 0,
      };
    }

    const sessions = await getAllSessions();

    // Count books from user_books scoped to current user
    const { data: userBooks } = await supabase
      .from('user_books')
      .select('status')
      .eq('user_id', user.id);

    let totalDurationSeconds = 0;
    let totalPagesRead = 0;

    sessions.forEach((s) => {
      totalDurationSeconds += s.durationSeconds;
      totalPagesRead += s.pagesRead;
    });

    let totalBooksFinished = 0;
    let activeBooksCount = 0;

    (userBooks || []).forEach((b) => {
      if (b.status === 'FINISHED') totalBooksFinished++;
      if (b.status === 'READING') activeBooksCount++;
    });

    const totalMinutes = totalDurationSeconds / 60;
    const averageMinutesPerPage =
      totalPagesRead > 0 ? Number((totalMinutes / totalPagesRead).toFixed(1)) : 0;

    return {
      totalDurationSeconds,
      totalPagesRead,
      totalBooksFinished,
      activeBooksCount,
      averageMinutesPerPage,
      sessionsCount: sessions.length,
    };
  } catch (e) {
    console.error('getReadingStats exception:', e);
    return {
      totalDurationSeconds: 0,
      totalPagesRead: 0,
      totalBooksFinished: 0,
      activeBooksCount: 0,
      averageMinutesPerPage: 0,
      sessionsCount: 0,
    };
  }
}

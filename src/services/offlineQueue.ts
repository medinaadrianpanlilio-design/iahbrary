import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { ReadingSession } from '@/types';
import { ensureUserBook } from '@/db/repositories/userBooksRepository';

const OFFLINE_SESSIONS_KEY = 'iahbrary_offline_sessions_queue';

/**
 * Get all queued offline sessions.
 */
export async function getOfflineSessionsQueue(): Promise<ReadingSession[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Queue a session locally when offline or when network call fails.
 */
export async function queueOfflineSession(session: ReadingSession): Promise<void> {
  try {
    const currentQueue = await getOfflineSessionsQueue();
    // Prevent duplicate entries
    if (!currentQueue.some((s) => s.id === session.id)) {
      currentQueue.push(session);
      await AsyncStorage.setItem(OFFLINE_SESSIONS_KEY, JSON.stringify(currentQueue));
    }
  } catch (err) {
    console.error('Failed to queue offline session:', err);
  }
}

/**
 * Attempt to flush and sync all queued offline sessions to Supabase.
 */
export async function flushOfflineSessionsQueue(): Promise<{ synced: number; remaining: number }> {
  try {
    const queue = await getOfflineSessionsQueue();
    if (queue.length === 0) return { synced: 0, remaining: 0 };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { synced: 0, remaining: queue.length };

    const remainingQueue: ReadingSession[] = [];
    let syncedCount = 0;

    for (const session of queue) {
      try {
        let validUserBookId: string | null = session.userBookId || null;
        if (!validUserBookId && session.bookId) {
          const { data: ub } = await supabase
            .from('user_books')
            .select('id')
            .eq('book_id', session.bookId)
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();

          if (ub) {
            validUserBookId = ub.id;
          } else {
            const ensured = await ensureUserBook({ id: session.bookId });
            validUserBookId = ensured.id;
          }
        }

        const { error } = await supabase.from('reading_sessions').upsert({
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
          remainingQueue.push(session);
        } else {
          syncedCount++;
        }
      } catch {
        remainingQueue.push(session);
      }
    }

    await AsyncStorage.setItem(OFFLINE_SESSIONS_KEY, JSON.stringify(remainingQueue));
    return { synced: syncedCount, remaining: remainingQueue.length };
  } catch (err) {
    console.error('Error flushing offline sessions queue:', err);
    return { synced: 0, remaining: 0 };
  }
}

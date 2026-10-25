import { supabase } from '@/services/supabase';
import { BookReview } from '@/types';
import { ensureUserBook } from './userBooksRepository';

interface ReviewRow {
  id: string;
  user_book_id?: string | null;
  book_id: string;
  rating: number;
  comment: string | null;
  finished_at?: number;
  date_finished?: number;
  created_at?: number;
  updated_at?: number;
}

function mapRowToReview(row: ReviewRow): BookReview {
  return {
    id: row.id,
    userBookId: row.user_book_id || undefined,
    bookId: row.book_id,
    rating: row.rating,
    comment: row.comment || undefined,
    dateFinished: Number(row.date_finished || row.finished_at || Date.now()),
    finishedAt: Number(row.finished_at || row.date_finished || Date.now()),
    createdAt: row.created_at ? Number(row.created_at) : undefined,
    updatedAt: row.updated_at ? Number(row.updated_at) : undefined,
  };
}

export async function saveReview(review: BookReview): Promise<void> {
  try {
    const now = Date.now();

    // Resolve a valid user_book_id that strictly satisfies the user_books foreign key
    let validUserBookId: string | null = null;

    if (review.userBookId) {
      const { data } = await supabase
        .from('user_books')
        .select('id')
        .eq('id', review.userBookId)
        .maybeSingle();

      if (data) {
        validUserBookId = data.id;
      }
    }

    if (!validUserBookId && review.bookId) {
      const { data: { user } } = await supabase.auth.getUser();
      let ubQuery = supabase
        .from('user_books')
        .select('id')
        .eq('book_id', review.bookId);
      if (user?.id) ubQuery = ubQuery.eq('user_id', user.id);
      const { data: ubByBook } = await ubQuery.limit(1).maybeSingle();

      if (ubByBook) {
        validUserBookId = ubByBook.id;
      } else {
        try {
          const ensured = await ensureUserBook({ id: review.bookId, status: 'FINISHED' });
          validUserBookId = ensured.id;
        } catch {
          validUserBookId = null;
        }
      }
    }

    const { error } = await supabase.from('book_reviews').upsert({
      id: review.id,
      user_book_id: validUserBookId,
      book_id: review.bookId,
      rating: review.rating,
      comment: review.comment || null,
      finished_at: review.finishedAt || review.dateFinished || now,
      date_finished: review.dateFinished || review.finishedAt || now,
      created_at: review.createdAt || now,
      updated_at: now,
    });

    if (error) {
      console.error('Supabase saveReview error:', error.message);
    }
  } catch (e) {
    console.error('saveReview exception:', e);
  }
}

export async function getReviewForBook(bookId: string): Promise<BookReview | null> {
  try {
    // Scope to current user by joining through their user_books
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return null;

    // Find the current user's user_book for this book
    const { data: userBook } = await supabase
      .from('user_books')
      .select('id')
      .eq('book_id', bookId)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!userBook) return null;

    const { data, error } = await supabase
      .from('book_reviews')
      .select('*')
      .eq('book_id', bookId)
      .eq('user_book_id', userBook.id)
      .maybeSingle();

    if (error || !data) return null;
    return mapRowToReview(data);
  } catch (e) {
    console.error('getReviewForBook exception:', e);
    return null;
  }
}

export async function deleteReview(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('book_reviews').delete().eq('id', id);
    if (error) {
      console.error('Supabase deleteReview error:', error.message);
    }
  } catch (e) {
    console.error('deleteReview exception:', e);
  }
}

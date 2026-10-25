import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { BookHighlight } from '@/types';

const STORAGE_KEY = '@iahbrary_highlights';

async function getStoredHighlights(): Promise<BookHighlight[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading highlights from AsyncStorage:', e);
    return [];
  }
}

async function setStoredHighlights(items: BookHighlight[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving highlights to AsyncStorage:', e);
  }
}

export async function saveHighlight(highlight: BookHighlight): Promise<void> {
  try {
    const current = await getStoredHighlights();
    // Add new highlight to top
    const updated = [highlight, ...current.filter((h) => h.id !== highlight.id)];
    await setStoredHighlights(updated);

    // Best-effort sync to Supabase if connected
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase.from('book_highlights').upsert({
          id: highlight.id,
          user_id: user.id,
          book_id: highlight.bookId,
          user_book_id: highlight.userBookId || null,
          quote: highlight.quote,
          page: highlight.page || null,
          note: highlight.note || null,
          created_at: highlight.createdAt,
        });
      }
    } catch {
      // Offline fallback already persisted in AsyncStorage
    }
  } catch (e) {
    console.error('saveHighlight error:', e);
  }
}

export async function getHighlightsForBook(bookId: string): Promise<BookHighlight[]> {
  try {
    const all = await getStoredHighlights();
    return all.filter((h) => h.bookId === bookId);
  } catch (e) {
    console.error('getHighlightsForBook error:', e);
    return [];
  }
}

export async function getAllHighlights(): Promise<BookHighlight[]> {
  return getStoredHighlights();
}

export async function deleteHighlight(id: string): Promise<void> {
  try {
    const current = await getStoredHighlights();
    const filtered = current.filter((h) => h.id !== id);
    await setStoredHighlights(filtered);

    // Best-effort remote deletion
    try {
      await supabase.from('book_highlights').delete().eq('id', id);
    } catch {
      // Handled offline
    }
  } catch (e) {
    console.error('deleteHighlight error:', e);
  }
}

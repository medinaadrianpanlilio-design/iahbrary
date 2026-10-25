import {
  addSession,
  getAllBooks,
  getBookPaceMinutesPerPage,
  getLastSessionForBook,
  getReadingStats,
  getUserBooksByStatus,
  saveReview,
  updateBookProgress,
} from '@/db';
import { ensureUserBook, updateUserBookProgress } from '@/db/repositories/userBooksRepository';
import { useAppleTheme } from '@/hooks/useAppleTheme';
import { useReadingTimer } from '@/hooks/useReadingTimer';
import { Book, BookReview, ReadingSession, ReadingStats, UserBook } from '@/types';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
} from 'react-native';

import { BookDetailsModal } from '@/components/books/BookDetailsModal';
import {
  ActiveBookCard,
  FinishBookModal,
  LogSessionModal,
  ReadingHeader,
  ReadingStatsGrid,
  ReadingStickerModal,
  ReadingTimerCard,
  SettingsModal,
  ZenModeOverlay,
} from '@/components/reading';
import { LiquidGlassBackground } from '@/components/ui/LiquidGlassBackground';

export default function HomeScreen() {
  const { colors, isDark } = useAppleTheme();
  const router = useRouter();

  // Active Book from database
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [activeUserBook, setActiveUserBook] = useState<UserBook | null>(null);
  const [loadingBook, setLoadingBook] = useState(true);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  // Background-resilient timestamp-driven timer
  const timer = useReadingTimer();
  const secondsElapsed = timer.secondsElapsed;
  const isTimerRunning = timer.isRunning;

  // Log Session Modal State
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [startPageInput, setStartPageInput] = useState('');
  const [endPageInput, setEndPageInput] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');

  // Finish Book Modal State
  const [finishModalVisible, setFinishModalVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Stats
  const [stats, setStats] = useState<ReadingStats | null>(null);

  // Pacing — loaded fresh whenever the active book changes
  const [sessionPace, setSessionPace] = useState<number | null>(null); // last session min/page
  const [bookPace, setBookPace] = useState<number | null>(null); // whole-book avg min/page

  // Pacing stored after saving a session (for modal pills + card)
  const [lastSessionPace, setLastSessionPace] = useState<number | null>(null);

  // Reading Card / Sticker Modal State
  const [cardVisible, setCardVisible] = useState(false);
  const [cardPagesRead, setCardPagesRead] = useState(0);

  // Settings & Account Modal State
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  // Zen Mode State
  const [zenModeVisible, setZenModeVisible] = useState(false);

  const loadActiveBook = async () => {
    try {
      setLoadingBook(true);
      let book: Book | null = null;
      let userBook: UserBook | null = null;

      // Prefer UserBook records (authenticated) so we get the correct user_books.id
      const readingUserBooks = await getUserBooksByStatus('READING');
      if (readingUserBooks.length > 0) {
        userBook = readingUserBooks[0];
        // Use the hydrated Book data from UserBook if available, else fall back
        if (userBook.book) {
          book = {
            ...userBook.book,
            currentPage: userBook.currentPage,
            totalPages: userBook.totalPages,
            status: userBook.status,
          };
        } else {
          // Fallback: load the book by bookId from the books table
          const allBooks = await getAllBooks();
          book = allBooks.find((b) => b.id === userBook!.bookId) || null;
          if (book) {
            book = {
              ...book,
              currentPage: userBook.currentPage,
              totalPages: userBook.totalPages,
              status: userBook.status,
            };
          }
        }
      } else {
        // No UserBook found for this user — no active book
        book = null;
        userBook = null;
      }

      // Auto-heal: If book exists in library but has no user_books record, ensure one
      if (book && !userBook) {
        userBook = await ensureUserBook(book);
      }

      setActiveBook(book);
      setActiveUserBook(userBook);

      if (book) {
        // Start page = where they currently are; end page is empty so user types directly
        setStartPageInput(book.currentPage.toString());
        setEndPageInput('');

        // Use book.id for session lookups — sessionsRepository queries by book_id column
        const lookupId = book.id;
        const [lastSession, bp] = await Promise.all([
          getLastSessionForBook(lookupId),
          getBookPaceMinutesPerPage(lookupId),
        ]);

        if (lastSession && lastSession.pagesRead > 0) {
          const pace = Number(
            (lastSession.durationSeconds / 60 / lastSession.pagesRead).toFixed(1)
          );
          setSessionPace(pace);
          setLastSessionPace(pace);
          setCardPagesRead(lastSession.pagesRead);
        } else {
          setSessionPace(null);
          setLastSessionPace(null);
          setCardPagesRead(book.currentPage);
        }
        setBookPace(bp > 0 ? bp : null);
      } else {
        setSessionPace(null);
        setLastSessionPace(null);
        setBookPace(null);
        setCardPagesRead(0);
      }

      const s = await getReadingStats();
      setStats(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBook(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadActiveBook();
    }, [])
  );

  const toggleTimer = () => {
    timer.toggle();
  };

  const handleStopSession = () => {
    if (!activeBook) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { }
    timer.pause();
    // Close zen mode if it's open before showing log modal
    setZenModeVisible(false);
    // Start page = current progress; end page is empty so user types their new page directly
    const current = activeBook.currentPage ?? 0;
    setStartPageInput(current.toString());
    setEndPageInput('');
    setLogModalVisible(true);
  };

  const handleSaveSession = async () => {
    if (!activeBook) return;
    const startP = parseInt(startPageInput, 10) || 0;
    const endP = parseInt(endPageInput, 10);

    // Guard: end page must actually be entered
    if (!endPageInput.trim() || isNaN(endP)) {
      Alert.alert('Missing End Page', 'Please enter the page you finished at.');
      return;
    }

    if (startP < 0) {
      Alert.alert('Invalid Starting Page', 'Starting page cannot be less than 0.');
      return;
    }

    if (endP < startP) {
      Alert.alert(
        'Invalid Page Range',
        `Ending page (${endP}) cannot be less than starting page (${startP}).`
      );
      return;
    }

    const totalP = activeBook.totalPages ?? 200;
    if (endP > totalP) {
      Alert.alert(
        'Exceeded Total Pages',
        `This book only has ${totalP} pages. Ending page cannot exceed ${totalP}.`
      );
      return;
    }

    const pagesRead = Math.max(0, endP - startP);
    const duration = timer.stop();

    // Compute session pace before saving
    const sessionPaceVal =
      pagesRead > 0 ? Number((duration / 60 / pagesRead).toFixed(1)) : null;
    setLastSessionPace(sessionPaceVal);

    // Use the UserBook's id as user_book_id so the FK constraint is satisfied.
    let effectiveUserBookId = activeUserBook?.id;
    if (!effectiveUserBookId && activeBook) {
      const ensured = await ensureUserBook(activeBook);
      effectiveUserBookId = ensured?.id;
      setActiveUserBook(ensured);
    }

    const newSession: ReadingSession = {
      id: Math.random().toString(36).substring(7),
      userBookId: effectiveUserBookId,
      bookId: activeBook.id,
      startTime: timer.sessionStartTime || Date.now() - duration * 1000,
      endTime: Date.now(),
      durationSeconds: duration,
      startPage: startP,
      endPage: endP,
      pagesRead,
      notes: sessionNotes.trim() || undefined,
      createdAt: Date.now(),
    };

    try {
      await addSession(newSession);

      const totalP = activeBook.totalPages ?? 200;
      const isFinished = endP >= totalP;
      const newStatus = isFinished ? 'FINISHED' : 'READING';

      // Update books table (legacy) and user_books table (new)
      const progressUpdates: Promise<void>[] = [
        updateBookProgress(activeBook.id, endP, newStatus),
      ];
      if (effectiveUserBookId) {
        progressUpdates.push(updateUserBookProgress(effectiveUserBookId, endP, newStatus));
      }
      await Promise.all(progressUpdates);

      setLogModalVisible(false);
      timer.reset();
      setSessionNotes('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Store values for the reading card
      setCardPagesRead(pagesRead);

      if (isFinished) {
        const bp = await getBookPaceMinutesPerPage(activeBook.id);
        setBookPace(bp > 0 ? bp : null);
        setFinishModalVisible(true);
      } else {
        loadActiveBook();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveFinishReview = async () => {
    if (!activeBook) return;

    let effectiveUserBookId = activeUserBook?.id;
    if (!effectiveUserBookId) {
      const ensured = await ensureUserBook(activeBook);
      effectiveUserBookId = ensured?.id;
      setActiveUserBook(ensured);
    }

    const review: BookReview = {
      id: Math.random().toString(36).substring(7),
      userBookId: effectiveUserBookId,
      bookId: activeBook.id,
      rating,
      comment: reviewComment.trim() || undefined,
      finishedAt: Date.now(),
    };

    try {
      await saveReview(review);
      setFinishModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadActiveBook();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.systemBackground }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LiquidGlassBackground variant="appleAmbient" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <ReadingHeader
          stats={stats}
          onOpenSettings={() => setSettingsModalVisible(true)}
        />

        {/* Active Book Card */}
        <ActiveBookCard
          book={activeBook}
          loading={loadingBook}
          onPressDetails={() => setDetailsModalVisible(true)}
          onOpenSticker={() => setCardVisible(true)}
          onPlayPress={() => {
            if (!isTimerRunning) {
              timer.start();
            }
            setZenModeVisible(true);
          }}
        />

        {/* Stopwatch / Active Reading Session Timer */}
        <ReadingTimerCard
          secondsElapsed={secondsElapsed}
          isRunning={isTimerRunning}
          disabled={!activeBook && !loadingBook}
          onDisabledPress={() =>
            Alert.alert(
              'No Book Selected',
              'Please select a book from your library or search for one before starting a reading session.',
              [
                { text: 'Go to Library', onPress: () => router.push('/library') },
                { text: 'Search Books', onPress: () => router.push('/search') },
                { text: 'Cancel', style: 'cancel' },
              ]
            )
          }
          onToggle={toggleTimer}
          onFinish={handleStopSession}
          onEnterZen={() => setZenModeVisible(true)}
        />

        {/* Quick Stats Grid — 2×2 */}
        <ReadingStatsGrid
          sessionPace={sessionPace}
          bookPace={bookPace}
          stats={stats}
        />
      </ScrollView>

      {/* Modal: Log Reading Session */}
      <LogSessionModal
        visible={logModalVisible}
        secondsElapsed={secondsElapsed}
        startPageInput={startPageInput}
        endPageInput={endPageInput}
        sessionNotes={sessionNotes}
        onClose={() => setLogModalVisible(false)}
        onChangeStartPage={setStartPageInput}
        onChangeEndPage={setEndPageInput}
        onChangeNotes={setSessionNotes}
        onSave={handleSaveSession}
      />

      {/* Modal: Finished Book Celebration & Review */}
      <FinishBookModal
        visible={finishModalVisible}
        book={activeBook}
        lastSessionPace={lastSessionPace}
        bookPace={bookPace}
        rating={rating}
        reviewComment={reviewComment}
        onClose={() => setFinishModalVisible(false)}
        onSelectRating={setRating}
        onChangeComment={setReviewComment}
        onSave={handleSaveFinishReview}
      />

      {/* Modal: Reading Card (savable sticker) */}
      <ReadingStickerModal
        visible={cardVisible}
        book={activeBook}
        cardPagesRead={cardPagesRead}
        lastSessionPace={lastSessionPace}
        bookPace={bookPace}
        onClose={() => setCardVisible(false)}
      />

      {/* Modal: Account & Settings */}
      <SettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
      />

      {/* Zen Mode — full-screen immersive timer overlay */}
      <ZenModeOverlay
        visible={zenModeVisible}
        secondsElapsed={secondsElapsed}
        isRunning={isTimerRunning}
        bookId={activeBook?.id}
        bookTitle={activeBook?.title}
        currentPage={activeBook?.currentPage}
        totalPages={activeBook?.totalPages}
        onToggle={toggleTimer}
        onExit={() => setZenModeVisible(false)}
        onFinish={handleStopSession}
      />

      {/* Modal: Book Details & Smart Forecast */}
      <BookDetailsModal
        visible={detailsModalVisible}
        book={activeBook}
        overallAveragePace={stats?.averageMinutesPerPage || 2.0}
        onClose={() => setDetailsModalVisible(false)}
        onReadNow={() => {
          if (!isTimerRunning) {
            timer.start();
          }
          setZenModeVisible(true);
        }}
        onUpdatePage={() => {
          setLogModalVisible(true);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
});

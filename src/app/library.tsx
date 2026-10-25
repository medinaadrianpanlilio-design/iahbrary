import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppleTheme } from '@/hooks/useAppleTheme';
import { Typography } from '@/constants/typography';
import { CornerRadius, Shadows } from '@/constants/theme';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { LiquidGlassBackground } from '@/components/ui/LiquidGlassBackground';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { updateBookProgress, updateBookStatus, deleteBook, getReviewForBook } from '@/db';
import { getAllUserBooks, setActiveReadingBook } from '@/db/repositories/userBooksRepository';
import { UserBook, BookStatus, BookReview } from '@/types';
import { SwipeableBookCard } from '@/components/library/SwipeableBookCard';
import { BookDetailsModal } from '@/components/books/BookDetailsModal';
import { SpringPressable } from '@/components/ui/SpringPressable';

type FilterTab = 'ALL' | 'READING' | 'WANT_TO_READ' | 'FINISHED';

export default function LibraryScreen() {
  const { colors, isDark } = useAppleTheme();
  const router = useRouter();

  const [books, setBooks] = useState<UserBook[]>([]);
  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [reviewsMap, setReviewsMap] = useState<Record<string, BookReview>>({});

  // Selected book for page update modal
  const [selectedBook, setSelectedBook] = useState<UserBook | null>(null);
  const [newPageNumber, setNewPageNumber] = useState('');
  const [pageModalVisible, setPageModalVisible] = useState(false);

  // Selected book for details & smart forecast modal
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<UserBook | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  const loadBooks = async () => {
    try {
      const list = await getAllUserBooks();
      setBooks(list);

      // Fetch reviews for finished books (keyed by bookId for lookup)
      const reviews: Record<string, BookReview> = {};
      for (const ub of list) {
        if (ub.status === 'FINISHED') {
          const rev = await getReviewForBook(ub.bookId);
          if (rev) reviews[ub.bookId] = rev;
        }
      }
      setReviewsMap(reviews);
    } catch (e) {
      console.error('Error loading library:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [])
  );

  const filteredBooks = (books || []).filter((ub) => {
    if (filter === 'ALL') return true;
    return ub.status === filter;
  });

  const handleOpenPageModal = (ub: UserBook) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setSelectedBook(ub);
    setNewPageNumber(ub.currentPage.toString());
    setPageModalVisible(true);
  };

  const handleAdjustPage = (delta: number) => {
    if (!selectedBook) return;
    const current = parseInt(newPageNumber, 10) || 0;
    const next = Math.max(0, Math.min(selectedBook.totalPages, current + delta));
    setNewPageNumber(next.toString());
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleSavePage = async () => {
    if (!selectedBook) return;
    const page = parseInt(newPageNumber, 10);
    if (isNaN(page) || page < 0) return;

    try {
      const isFinished = page >= selectedBook.totalPages;
      const status: BookStatus = isFinished
        ? 'FINISHED'
        : selectedBook.status === 'WANT_TO_READ'
        ? 'READING'
        : selectedBook.status;

      await updateBookProgress(selectedBook.bookId, Math.min(page, selectedBook.totalPages), status);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPageModalVisible(false);
      setSelectedBook(null);
      loadBooks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteBook = (ub: UserBook) => {
    const title = ub.book?.title || 'this book';
    Alert.alert('Remove Book', `Remove "${title}" from your library?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteBook(ub.bookId);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          loadBooks();
        },
      },
    ]);
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <IconSymbol
            key={star}
            name={star <= rating ? 'star.fill' : 'star'}
            size={13}
            color={star <= rating ? '#F59E0B' : colors.tertiaryLabel}
          />
        ))}
      </View>
    );
  };

  const filterCounts = {
    ALL: books.length,
    READING: books.filter((b) => b.status === 'READING').length,
    WANT_TO_READ: books.filter((b) => b.status === 'WANT_TO_READ').length,
    FINISHED: books.filter((b) => b.status === 'FINISHED').length,
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.systemBackground }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LiquidGlassBackground />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[Typography.largeTitle, { color: colors.label }]}>My Library</Text>
          <TouchableOpacity
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              router.push('/search');
            }}
            style={[styles.addBtn, { backgroundColor: colors.tint }]}
          >
            <IconSymbol name="plus" size={17} color="#FFFFFF" />
            <Text style={[Typography.subheadBold, { color: '#FFFFFF', marginLeft: 4 }]}>
              Add Book
            </Text>
          </TouchableOpacity>
        </View>

        {/* Apple Segmented Control */}
        <View style={[styles.segmentedControl, { backgroundColor: colors.secondarySystemFill }]}>
          {(
            [
              { key: 'ALL', label: `All (${filterCounts.ALL})` },
              { key: 'READING', label: `Reading (${filterCounts.READING})` },
              { key: 'WANT_TO_READ', label: `To Read (${filterCounts.WANT_TO_READ})` },
              { key: 'FINISHED', label: `Done (${filterCounts.FINISHED})` },
            ] as const
          ).map((tab) => {
            const isSelected = filter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch {}
                  setFilter(tab.key);
                }}
                style={[
                  styles.segmentTab,
                  isSelected && [
                    styles.segmentTabSelected,
                    { backgroundColor: colors.secondarySystemGroupedBackground },
                    Shadows.subtle,
                  ],
                ]}
              >
                <Text
                  style={[
                    Typography.caption2,
                    {
                      color: isSelected ? colors.label : colors.secondaryLabel,
                      fontWeight: isSelected ? '600' : '400',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Book List */}
      {filteredBooks.length > 0 ? (
        <FlatList
          data={filteredBooks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: ub }) => {
            const bookMeta = ub.book;
            const title = bookMeta?.title || 'Unknown Title';
            const authors = bookMeta?.authors || [];
            const thumbnailUrl = bookMeta?.thumbnailUrl;
            const progress = Math.min(100, Math.round((ub.currentPage / Math.max(ub.totalPages, 1)) * 100));
            const review = reviewsMap[ub.bookId];

            const statusLabel =
              ub.status === 'FINISHED' ? 'Finished' : ub.status === 'READING' ? 'Reading' : 'To Read';
            const statusColor =
              ub.status === 'FINISHED'
                ? colors.success
                : ub.status === 'READING'
                ? colors.tint
                : colors.secondaryLabel;

            return (
              <SwipeableBookCard
                key={ub.id}
                onUpdatePage={() => handleOpenPageModal(ub)}
                onDelete={() => handleDeleteBook(ub)}
                onReadNow={
                  ub.status !== 'FINISHED'
                    ? async () => {
                        try {
                          Haptics.selectionAsync();
                        } catch {}
                        await Promise.all([
                          updateBookStatus(ub.bookId, 'READING'),
                          setActiveReadingBook(ub.bookId),
                        ]);
                        router.push('/');
                      }
                    : undefined
                }
                onPressCard={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch {}
                  setSelectedBookForDetails(ub);
                  setDetailsModalVisible(true);
                }}
              >
                <LiquidGlass
                  variant="regular"
                  intensity={80}
                  cornerRadius={CornerRadius.xl}
                  style={styles.bookCard}
                >
                  {/* Book Cover with elevation */}
                  <View style={[styles.coverContainer, Shadows.cover]}>
                    {thumbnailUrl ? (
                      <Image
                        source={{ uri: thumbnailUrl }}
                        style={styles.thumbnail}
                        contentFit="cover"
                        transition={250}
                      />
                    ) : (
                      <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.secondarySystemFill }]}>
                        <IconSymbol name="book" size={26} color={colors.secondaryLabel} />
                      </View>
                    )}
                  </View>

                  {/* Book Info */}
                  <View style={styles.bookInfo}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.statusBadge, { backgroundColor: colors.secondarySystemFill }]}>
                        <Text style={[Typography.caption2, { color: statusColor, fontWeight: '700' }]}>
                          {statusLabel.toUpperCase()}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => handleDeleteBook(ub)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <IconSymbol name="ellipsis.horizontal" size={18} color={colors.tertiaryLabel} />
                      </TouchableOpacity>
                    </View>

                    <Text style={[Typography.headline, { color: colors.label, marginTop: 4 }]} numberOfLines={2}>
                      {title}
                    </Text>
                    {authors.length > 0 && (
                      <Text style={[Typography.caption1, { color: colors.secondaryLabel, marginTop: 2 }]} numberOfLines={1}>
                        {authors.join(', ')}
                      </Text>
                    )}

                    {/* Progress or Rating */}
                    {ub.status === 'FINISHED' ? (
                      <View style={styles.finishedInfo}>
                        {review ? renderStars(review.rating) : (
                          <Text style={[Typography.caption1, { color: colors.success, fontWeight: '600' }]}>
                            Completed
                          </Text>
                        )}
                        {review?.comment && (
                          <Text style={[Typography.caption2, { color: colors.secondaryLabel, marginTop: 4 }]} numberOfLines={1}>
                            "{review.comment}"
                          </Text>
                        )}
                      </View>
                    ) : (
                      <View style={styles.progressContainer}>
                        <View style={styles.progressLabelRow}>
                          <Text style={[Typography.caption2, { color: colors.secondaryLabel }]}>
                            Page {ub.currentPage} of {ub.totalPages}
                          </Text>
                          <Text style={[Typography.caption2, { color: colors.label, fontWeight: '600' }]}>
                            {progress}%
                          </Text>
                        </View>
                        <View style={[styles.progressTrack, { backgroundColor: colors.quaternarySystemFill }]}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${Math.max(4, progress)}%`, backgroundColor: colors.tint },
                            ]}
                          />
                        </View>
                      </View>
                    )}

                    {/* Actions Row */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        onPress={() => handleOpenPageModal(ub)}
                        style={[styles.actionBtn, { backgroundColor: colors.secondarySystemFill }]}
                      >
                        <IconSymbol name="bookmark" size={13} color={colors.label} />
                        <Text style={[Typography.caption1Bold, { color: colors.label, marginLeft: 5 }]}>
                          Update Page
                        </Text>
                      </TouchableOpacity>

                      {ub.status !== 'FINISHED' && (
                        <TouchableOpacity
                          onPress={async () => {
                            try {
                              Haptics.selectionAsync();
                            } catch {}
                            await Promise.all([
                              updateBookStatus(ub.bookId, 'READING'),
                              setActiveReadingBook(ub.bookId),
                            ]);
                            router.push('/');
                          }}
                          style={[styles.actionBtn, { backgroundColor: colors.tint }]}
                        >
                          <IconSymbol name="play.fill" size={12} color="#FFFFFF" />
                          <Text style={[Typography.caption1Bold, { color: '#FFFFFF', marginLeft: 5 }]}>
                            Read Now
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </LiquidGlass>
              </SwipeableBookCard>
            );
          }}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.secondarySystemFill }]}>
            <IconSymbol name="books.vertical" size={36} color={colors.secondaryLabel} />
          </View>
          <Text style={[Typography.title3, { color: colors.label, marginTop: 16 }]}>
            No Books Found
          </Text>
          <Text style={[Typography.footnote, { color: colors.secondaryLabel, textAlign: 'center', marginTop: 6, paddingHorizontal: 40 }]}>
            {filter === 'ALL'
              ? 'Your reading shelf is empty. Search for books to start your collection.'
              : `No books currently marked as ${filter.toLowerCase().replace(/_/g, ' ')}.`}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/search')}
            style={[styles.emptyBtn, { backgroundColor: colors.tint }]}
          >
            <Text style={[Typography.subheadBold, { color: '#FFFFFF' }]}>Find a Book to Read</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal: Update Page (iOS Bottom Sheet) */}
      <Modal
        visible={pageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPageModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.sheetContainer}
            >
              <LiquidGlass
                variant="regular"
                intensity={95}
                cornerRadius={CornerRadius.xxl}
                style={[styles.modalSheet, { backgroundColor: colors.secondarySystemGroupedBackground }]}
              >
                {/* Drag Handle */}
                <View style={styles.handleRow}>
                  <View style={[styles.handleBar, { backgroundColor: colors.quaternaryLabel }]} />
                </View>

                <Text style={[Typography.title2, { color: colors.label, textAlign: 'center' }]}>
                  Update Reading Page
                </Text>
                <Text style={[Typography.footnote, { color: colors.secondaryLabel, textAlign: 'center', marginTop: 4 }]}>
                  {selectedBook?.book?.title}
                </Text>

                {/* Page Input with Stepper Controls */}
                <View style={styles.inputStepperRow}>
                  <TouchableOpacity
                    onPress={() => handleAdjustPage(-1)}
                    style={[styles.stepperBtn, { backgroundColor: colors.secondarySystemFill }]}
                  >
                    <IconSymbol name="minus" size={20} color={colors.label} />
                  </TouchableOpacity>

                  <View style={styles.pageInputWrap}>
                    <TextInput
                      style={[styles.pageInput, { color: colors.label }]}
                      value={newPageNumber}
                      onChangeText={setNewPageNumber}
                      keyboardType="number-pad"
                      selectTextOnFocus
                      textAlign="center"
                    />
                    <Text style={[Typography.caption2, { color: colors.tertiaryLabel }]}>
                      of {selectedBook?.totalPages}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleAdjustPage(1)}
                    style={[styles.stepperBtn, { backgroundColor: colors.secondarySystemFill }]}
                  >
                    <IconSymbol name="plus" size={20} color={colors.label} />
                  </TouchableOpacity>
                </View>

                {/* Actions */}
                <View style={styles.modalBtnsRow}>
                  <TouchableOpacity
                    onPress={() => setPageModalVisible(false)}
                    style={[styles.modalCancelBtn, { backgroundColor: colors.secondarySystemFill }]}
                  >
                    <Text style={[Typography.subheadBold, { color: colors.secondaryLabel }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSavePage}
                    style={[styles.modalConfirmBtn, { backgroundColor: colors.tint }]}
                  >
                    <Text style={[Typography.subheadBold, { color: '#FFFFFF' }]}>Save Page</Text>
                  </TouchableOpacity>
                </View>
              </LiquidGlass>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Book Details & Smart Completion Forecast Bottom Sheet */}
      <BookDetailsModal
        visible={detailsModalVisible}
        book={selectedBookForDetails}
        overallAveragePace={2.0}
        onClose={() => {
          setDetailsModalVisible(false);
          setSelectedBookForDetails(null);
        }}
        onReadNow={async (bookId) => {
          try {
            Haptics.selectionAsync();
          } catch {}
          await Promise.all([
            updateBookStatus(bookId, 'READING'),
            setActiveReadingBook(bookId),
          ]);
          router.push('/');
        }}
        onUpdatePage={(b) => {
          if (selectedBookForDetails) {
            handleOpenPageModal(selectedBookForDetails);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CornerRadius.full,
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: CornerRadius.md,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CornerRadius.sm,
  },
  segmentTabSelected: {
    borderRadius: CornerRadius.sm,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110,
    gap: 14,
  },
  bookCard: {
    flexDirection: 'row',
    padding: 14,
    gap: 14,
  },
  coverContainer: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 86,
    height: 126,
    borderRadius: 10,
  },
  thumbnailPlaceholder: {
    width: 86,
    height: 126,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CornerRadius.xs,
  },
  finishedInfo: {
    marginVertical: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  progressContainer: {
    marginVertical: 6,
    gap: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: CornerRadius.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtn: {
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: CornerRadius.full,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
  },
  modalSheet: {
    borderTopLeftRadius: CornerRadius.xxl,
    borderTopRightRadius: CornerRadius.xxl,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    paddingTop: 12,
  },
  handleRow: {
    alignItems: 'center',
    marginBottom: 14,
  },
  handleBar: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 24,
  },
  inputStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 24,
  },
  pageInputWrap: {
    alignItems: 'center',
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageInput: {
    width: 100,
    height: 52,
    borderRadius: CornerRadius.md,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalBtnsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: CornerRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtn: {
    flex: 2,
    height: 50,
    borderRadius: CornerRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

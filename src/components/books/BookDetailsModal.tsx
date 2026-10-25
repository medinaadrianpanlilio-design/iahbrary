import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { format, addDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useAppleTheme } from '@/hooks/useAppleTheme';
import { Typography } from '@/constants/typography';
import { CornerRadius, Shadows } from '@/constants/theme';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { Book, UserBook, ReadingSession, BookHighlight } from '@/types';
import {
  getSessionsForBook,
  getBookPaceMinutesPerPage,
  getHighlightsForBook,
  deleteHighlight,
} from '@/db';
import { HighlightCard } from '@/components/highlights/HighlightCard';
import { AddHighlightModal } from '@/components/highlights/AddHighlightModal';

interface BookDetailsModalProps {
  visible: boolean;
  book: Book | UserBook | null;
  overallAveragePace?: number;
  onClose: () => void;
  onReadNow?: (bookId: string) => void;
  onUpdatePage?: (book: Book | UserBook) => void;
}

const DAILY_GOAL_OPTIONS = [15, 30, 45, 60];

export const BookDetailsModal: React.FC<BookDetailsModalProps> = ({
  visible,
  book,
  overallAveragePace = 2.0,
  onClose,
  onReadNow,
  onUpdatePage,
}) => {
  const { colors, isDark } = useAppleTheme();
  const [bookPace, setBookPace] = useState<number | null>(null);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [highlights, setHighlights] = useState<BookHighlight[]>([]);
  const [addHighlightVisible, setAddHighlightVisible] = useState(false);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(30);
  const [loading, setLoading] = useState(false);

  // Normalize book properties whether passed Book or UserBook
  const bookMeta = useMemo(() => {
    if (!book) return null;
    const isUserBook = 'bookId' in book;
    const b = isUserBook ? (book as UserBook).book : (book as Book);
    return {
      id: isUserBook ? (book as UserBook).bookId : (book as Book).id,
      title: b?.title || (book as Book).title || 'Untitled Book',
      authors: b?.authors || (book as Book).authors || [],
      thumbnailUrl: b?.thumbnailUrl || (book as Book).thumbnailUrl,
      description: b?.description || (book as Book).description,
      currentPage: (book as any).currentPage ?? 0,
      totalPages: Math.max((book as any).totalPages ?? 1, 1),
      status: (book as any).status || 'READING',
    };
  }, [book]);

  useEffect(() => {
    if (visible && bookMeta?.id) {
      setLoading(true);
      Promise.all([
        getBookPaceMinutesPerPage(bookMeta.id),
        getSessionsForBook(bookMeta.id),
        getHighlightsForBook(bookMeta.id),
      ])
        .then(([pace, sessList, hlList]) => {
          if (pace > 0) setBookPace(pace);
          setSessions(sessList);
          setHighlights(hlList);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [visible, bookMeta?.id]);

  const handleDeleteHighlight = async (id: string) => {
    await deleteHighlight(id);
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  };

  if (!bookMeta) return null;

  const currentPage = bookMeta.currentPage;
  const totalPages = bookMeta.totalPages;
  const remainingPages = Math.max(0, totalPages - currentPage);
  const progressPercent = Math.min(100, Math.round((currentPage / totalPages) * 100));

  // Effective pace in minutes per page (uses this book's pace or overall average, default 2.0)
  const effectivePace = bookPace && bookPace > 0 ? bookPace : overallAveragePace > 0 ? overallAveragePace : 2.0;

  // Forecast calculations
  const totalEstimatedMinutesRemaining = Math.round(remainingPages * effectivePace);
  const estHours = Math.floor(totalEstimatedMinutesRemaining / 60);
  const estMins = totalEstimatedMinutesRemaining % 60;
  const formattedRemainingTime = estHours > 0 ? `${estHours}h ${estMins}m` : `${estMins}m`;

  const daysToFinish = Math.max(1, Math.ceil(totalEstimatedMinutesRemaining / dailyGoalMinutes));
  const completionDate = addDays(new Date(), daysToFinish);

  const statusColor =
    bookMeta.status === 'FINISHED'
      ? colors.success
      : bookMeta.status === 'READING'
      ? colors.tint
      : colors.secondaryLabel;

  const statusLabel =
    bookMeta.status === 'FINISHED' ? 'Completed' : bookMeta.status === 'READING' ? 'Reading' : 'To Read';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.sheetContainer}>
          <LiquidGlass
            variant="regular"
            intensity={95}
            cornerRadius={CornerRadius.xxl}
            style={[styles.modalSheet, { backgroundColor: colors.secondarySystemGroupedBackground }]}
          >
            {/* Grabber handle */}
            <View style={styles.handleRow}>
              <View style={[styles.handleBar, { backgroundColor: colors.quaternaryLabel }]} />
            </View>

            {/* Top Close Button */}
            <View style={styles.sheetHeader}>
              <Text style={[Typography.subheadBold, { color: colors.secondaryLabel }]}>
                BOOK INSIGHTS
              </Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[styles.closeIconCircle, { backgroundColor: colors.secondarySystemFill }]}
              >
                <IconSymbol name="xmark" size={12} color={colors.secondaryLabel} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Hero Book Section */}
              <View style={styles.heroRow}>
                <View style={[styles.coverWrap, Shadows.cover]}>
                  {bookMeta.thumbnailUrl ? (
                    <Image
                      source={{ uri: bookMeta.thumbnailUrl }}
                      style={styles.coverImage}
                      contentFit="cover"
                      transition={250}
                    />
                  ) : (
                    <View style={[styles.coverPlaceholder, { backgroundColor: colors.secondarySystemFill }]}>
                      <IconSymbol name="book" size={32} color={colors.secondaryLabel} />
                    </View>
                  )}
                </View>

                <View style={styles.heroMeta}>
                  <View style={[styles.statusBadge, { backgroundColor: colors.secondarySystemFill }]}>
                    <Text style={[Typography.caption2, { color: statusColor, fontWeight: '700' }]}>
                      {statusLabel.toUpperCase()}
                    </Text>
                  </View>

                  <Text style={[Typography.title2, { color: colors.label, marginTop: 6 }]} numberOfLines={2}>
                    {bookMeta.title}
                  </Text>

                  {bookMeta.authors.length > 0 && (
                    <Text style={[Typography.subhead, { color: colors.secondaryLabel, marginTop: 2 }]} numberOfLines={1}>
                      {bookMeta.authors.join(', ')}
                    </Text>
                  )}

                  {/* Progress bar */}
                  <View style={styles.progressWrap}>
                    <View style={styles.progressRow}>
                      <Text style={[Typography.caption2, { color: colors.secondaryLabel }]}>
                        {currentPage} of {totalPages} pgs
                      </Text>
                      <Text style={[Typography.caption2, { color: colors.label, fontWeight: '700' }]}>
                        {progressPercent}%
                      </Text>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: colors.quaternarySystemFill }]}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.max(4, progressPercent)}%`, backgroundColor: colors.tint },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* SMART COMPLETION FORECAST CARD (High-impact feature) */}
              <View style={styles.sectionMargin}>
                <LiquidGlass
                  variant="regular"
                  intensity={80}
                  cornerRadius={CornerRadius.xl}
                  style={[styles.forecastCard, { borderColor: isDark ? 'rgba(10, 132, 255, 0.3)' : 'rgba(0, 122, 255, 0.2)', borderWidth: 1 }]}
                >
                  <View style={styles.forecastHeader}>
                    <View style={[styles.forecastIconWrap, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.2)' : 'rgba(0, 122, 255, 0.12)' }]}>
                      <IconSymbol name="sparkles" size={16} color={colors.tint} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[Typography.caption1Bold, { color: colors.tint }]}>
                        SMART COMPLETION FORECAST
                      </Text>
                      <Text style={[Typography.headline, { color: colors.label, marginTop: 2 }]}>
                        {bookMeta.status === 'FINISHED'
                          ? 'Completed Book!'
                          : `Finish in ~${daysToFinish} Days`}
                      </Text>
                    </View>
                  </View>

                  {bookMeta.status !== 'FINISHED' ? (
                    <>
                      {/* Big Target Date Display */}
                      <View style={[styles.targetDateBanner, { backgroundColor: colors.secondarySystemFill }]}>
                        <IconSymbol name="calendar" size={15} color={colors.tint} />
                        <Text style={[Typography.callout, { color: colors.label, fontWeight: '600', marginLeft: 8 }]}>
                          Target: {format(completionDate, 'EEEE, MMM d, yyyy')}
                        </Text>
                      </View>

                      {/* Forecast explanation callout */}
                      <Text style={[Typography.footnote, { color: colors.secondaryLabel, marginTop: 12, lineHeight: 20 }]}>
                        At your current velocity of <Text style={{ color: colors.label, fontWeight: '700' }}>{effectivePace} min/page</Text>, you have <Text style={{ color: colors.label, fontWeight: '700' }}>{formattedRemainingTime}</Text> ({remainingPages} pages) remaining.
                      </Text>

                      {/* Interactive Daily Reading Goal Selector */}
                      <View style={styles.goalSelectorWrap}>
                        <Text style={[Typography.caption2, { color: colors.secondaryLabel, marginBottom: 8 }]}>
                          ADJUST DAILY READING GOAL
                        </Text>
                        <View style={[styles.goalPillsRow, { backgroundColor: colors.secondarySystemFill }]}>
                          {DAILY_GOAL_OPTIONS.map((mins) => {
                            const isSelected = dailyGoalMinutes === mins;
                            return (
                              <TouchableOpacity
                                key={mins}
                                onPress={() => {
                                  try {
                                    Haptics.selectionAsync();
                                  } catch {}
                                  setDailyGoalMinutes(mins);
                                }}
                                style={[
                                  styles.goalPill,
                                  isSelected && [
                                    styles.goalPillActive,
                                    { backgroundColor: colors.secondarySystemGroupedBackground },
                                    Shadows.subtle,
                                  ],
                                ]}
                              >
                                <Text
                                  style={[
                                    Typography.caption2,
                                    {
                                      color: isSelected ? colors.tint : colors.secondaryLabel,
                                      fontWeight: isSelected ? '700' : '500',
                                    },
                                  ]}
                                >
                                  {mins}m / day
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </>
                  ) : (
                    <Text style={[Typography.footnote, { color: colors.secondaryLabel, marginTop: 8 }]}>
                      You have already reached the final page of this book. Review and re-read sessions are saved in your reading logs.
                    </Text>
                  )}
                </LiquidGlass>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.actionButtonsRow}>
                {bookMeta.status !== 'FINISHED' && (
                  <SpringPressable
                    onPress={() => {
                      onClose();
                      onReadNow?.(bookMeta.id);
                    }}
                    style={[styles.primaryActionBtn, { backgroundColor: colors.tint }]}
                  >
                    <IconSymbol name="play.fill" size={15} color="#FFFFFF" />
                    <Text style={[Typography.subheadBold, { color: '#FFFFFF', marginLeft: 6 }]}>
                      Read Now
                    </Text>
                  </SpringPressable>
                )}

                <SpringPressable
                  onPress={() => {
                    onClose();
                    if (book) onUpdatePage?.(book);
                  }}
                  style={[styles.secondaryActionBtn, { backgroundColor: colors.secondarySystemFill }]}
                >
                  <IconSymbol name="bookmark" size={14} color={colors.label} />
                  <Text style={[Typography.subheadBold, { color: colors.label, marginLeft: 6 }]}>
                    Update Page
                  </Text>
                </SpringPressable>
              </View>

              {/* Highlights & Quotes Section */}
              <View style={styles.sectionMargin}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[Typography.title3, { color: colors.label }]}>
                    Highlights & Quotes
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      try {
                        Haptics.selectionAsync();
                      } catch {}
                      setAddHighlightVisible(true);
                    }}
                    style={[styles.addQuoteBtn, { backgroundColor: colors.secondarySystemFill }]}
                  >
                    <IconSymbol name="plus" size={13} color={colors.tint} />
                    <Text style={[Typography.caption2, { color: colors.tint, fontWeight: '700', marginLeft: 4 }]}>
                      Add Quote
                    </Text>
                  </TouchableOpacity>
                </View>

                {highlights.length > 0 ? (
                  highlights.map((h) => (
                    <HighlightCard
                      key={h.id}
                      highlight={h}
                      bookTitle={bookMeta.title}
                      bookAuthor={bookMeta.authors[0]}
                      onDelete={handleDeleteHighlight}
                    />
                  ))
                ) : (
                  <View style={[styles.emptyQuotesWrap, { backgroundColor: colors.secondarySystemFill }]}>
                    <IconSymbol name="quote.opening" size={18} color={colors.secondaryLabel} />
                    <Text style={[Typography.caption1, { color: colors.secondaryLabel, marginLeft: 8 }]}>
                      No quotes captured yet. Tap Add Quote to save memorable passages.
                    </Text>
                  </View>
                )}
              </View>

              {/* Reading History for this Book */}
              <View style={styles.sectionMargin}>
                <Text style={[Typography.title3, { color: colors.label, marginBottom: 12 }]}>
                  Sessions for this Book
                </Text>

                {sessions.length > 0 ? (
                  sessions.slice(0, 5).map((s) => {
                    const sessionMinutes = Math.round(s.durationSeconds / 60);
                    const sessionPace = s.pagesRead > 0 ? (sessionMinutes / s.pagesRead).toFixed(1) : '—';
                    return (
                      <LiquidGlass
                        key={s.id}
                        variant="regular"
                        intensity={70}
                        cornerRadius={CornerRadius.lg}
                        style={styles.sessionItem}
                      >
                        <View style={styles.sessionItemLeft}>
                          <Text style={[Typography.caption1Bold, { color: colors.label }]}>
                            {format(new Date(s.startTime), 'MMM d, yyyy · h:mm a')}
                          </Text>
                          <Text style={[Typography.caption2, { color: colors.secondaryLabel, marginTop: 2 }]}>
                            Pages {s.startPage} → {s.endPage} ({s.pagesRead} pages read)
                          </Text>
                        </View>
                        <View style={styles.sessionItemRight}>
                          <Text style={[Typography.subheadBold, { color: colors.tint }]}>
                            {sessionMinutes}m
                          </Text>
                          <Text style={[Typography.caption2, { color: colors.tertiaryLabel }]}>
                            {sessionPace} m/pg
                          </Text>
                        </View>
                      </LiquidGlass>
                    );
                  })
                ) : (
                  <View style={[styles.emptySessionsWrap, { backgroundColor: colors.secondarySystemFill }]}>
                    <IconSymbol name="clock" size={20} color={colors.secondaryLabel} />
                    <Text style={[Typography.caption1, { color: colors.secondaryLabel, marginLeft: 8 }]}>
                      No reading sprints logged yet for this book.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </LiquidGlass>
        </View>
      </View>

      {/* Add Highlight Sheet */}
      <AddHighlightModal
        visible={addHighlightVisible}
        bookId={bookMeta.id}
        bookTitle={bookMeta.title}
        initialPage={currentPage}
        onClose={() => setAddHighlightVisible(false)}
        onSaved={(newH) => {
          setHighlights((prev) => [newH, ...prev]);
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    maxHeight: '90%',
  },
  modalSheet: {
    borderTopLeftRadius: CornerRadius.xxl,
    borderTopRightRadius: CornerRadius.xxl,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
    overflow: 'hidden',
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handleBar: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  coverWrap: {
    borderRadius: 12,
  },
  coverImage: {
    width: 86,
    height: 126,
    borderRadius: 12,
  },
  coverPlaceholder: {
    width: 86,
    height: 126,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMeta: {
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CornerRadius.full,
  },
  progressWrap: {
    marginTop: 10,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionMargin: {
    marginTop: 20,
  },
  forecastCard: {
    padding: 16,
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  forecastIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: CornerRadius.md,
    marginTop: 14,
  },
  goalSelectorWrap: {
    marginTop: 16,
  },
  goalPillsRow: {
    flexDirection: 'row',
    borderRadius: CornerRadius.full,
    padding: 3,
  },
  goalPill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: CornerRadius.full,
  },
  goalPillActive: {},
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: CornerRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: CornerRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  sessionItemLeft: {
    flex: 1,
  },
  sessionItemRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  emptySessionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: CornerRadius.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addQuoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: CornerRadius.full,
  },
  emptyQuotesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: CornerRadius.lg,
  },
});

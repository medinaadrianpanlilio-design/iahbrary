import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { format, isSameDay } from 'date-fns';
import { useAppleTheme } from '@/hooks/useAppleTheme';
import { Typography } from '@/constants/typography';
import { CornerRadius, Shadows } from '@/constants/theme';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { LiquidGlassBackground } from '@/components/ui/LiquidGlassBackground';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getReadingStats, getAllSessions, getAllBooks, getBookPaceMinutesPerPage } from '@/db';
import { ReadingStats, ReadingSession, Book } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { ReadingStickerModal } from '@/components/reading';
import { DailyGoalRing } from '@/components/stats/DailyGoalRing';
import { WeeklyReadingChart } from '@/components/stats/WeeklyReadingChart';

export default function StatsScreen() {
  const { colors, isDark } = useAppleTheme();
  const { user, username, updateUsername, signOut } = useAuth();

  const [usernameModalVisible, setUsernameModalVisible] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  // Sticker modal state for viewing a specific history session
  const [selectedSessionForSticker, setSelectedSessionForSticker] = useState<{
    session: ReadingSession;
    book: Book | null;
    bookPace: number | null;
  } | null>(null);
  const [stickerModalVisible, setStickerModalVisible] = useState(false);

  const handleOpenStickerForSession = async (sess: ReadingSession) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    const book = booksMap[sess.bookId] || null;
    let bp: number | null = null;
    if (book) {
      try {
        const pace = await getBookPaceMinutesPerPage(book.id);
        if (pace > 0) bp = pace;
      } catch {}
    }
    setSelectedSessionForSticker({
      session: sess,
      book,
      bookPace: bp,
    });
    setStickerModalVisible(true);
  };

  const [stats, setStats] = useState<ReadingStats>({
    totalDurationSeconds: 0,
    totalPagesRead: 0,
    totalBooksFinished: 0,
    activeBooksCount: 0,
    averageMinutesPerPage: 0,
    sessionsCount: 0,
  });

  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [booksMap, setBooksMap] = useState<Record<string, Book>>({});

  const loadData = async () => {
    try {
      const s = await getReadingStats();
      setStats(s);

      const sessList = await getAllSessions();
      setSessions(sessList);

      const allBooks = await getAllBooks();
      const bMap: Record<string, Book> = {};
      allBooks.forEach((b) => {
        bMap[b.id] = b;
      });
      setBooksMap(bMap);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const formatHoursMinutes = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const handleSaveUsername = async () => {
    const clean = newUsernameInput.trim();
    if (!clean) return;
    setSavingUsername(true);
    try {
      const { error } = await updateUsername(clean);
      if (error) {
        Alert.alert('Could Not Set Username', error.message);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setUsernameModalVisible(false);
        setNewUsernameInput('');
        Alert.alert('Username Saved', `Your display name is now @${clean}. Use your email to sign in.`);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'An error occurred.');
    } finally {
      setSavingUsername(false);
    }
  };

  const today = new Date();
  const todaySessions = sessions.filter((s) => isSameDay(new Date(s.startTime), today));
  const todayMinutes = todaySessions.reduce((sum, s) => sum + Math.round(s.durationSeconds / 60), 0);
  const todayPages = todaySessions.reduce((sum, s) => sum + s.pagesRead, 0);

  const streakDays = React.useMemo(() => {
    if (sessions.length === 0) return 0;
    const uniqueDays = Array.from(
      new Set(
        sessions.map((s) => {
          const d = new Date(s.startTime);
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        })
      )
    );
    return uniqueDays.length;
  }, [sessions]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.systemBackground }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LiquidGlassBackground />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.largeTitle, { color: colors.label }]}>Reading Stats</Text>
              {username ? (
                <View style={styles.userRow}>
                  <View style={[styles.usernamePill, { backgroundColor: colors.secondarySystemFill }]}>
                    <IconSymbol name="person.crop.circle" size={14} color={colors.tint} />
                    <Text style={[Typography.caption2, { color: colors.label, fontWeight: '600', marginLeft: 4 }]}>
                      @{username}
                    </Text>
                  </View>
                  <Text style={[Typography.caption2, { color: colors.secondaryLabel }]} numberOfLines={1}>
                    {user?.email}
                  </Text>
                </View>
              ) : (
                <View style={styles.userRow}>
                  <Text style={[Typography.footnote, { color: colors.secondaryLabel }]}>
                    {user?.email || 'Track your daily reading velocity'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.setUsernameBtn, { backgroundColor: colors.secondarySystemFill }]}
                    onPress={() => {
                      try {
                        Haptics.selectionAsync();
                      } catch {}
                      setUsernameModalVisible(true);
                    }}
                  >
                    <IconSymbol name="pencil" size={11} color={colors.tint} />
                    <Text style={[Typography.caption2, { color: colors.tint, fontWeight: '600', marginLeft: 4 }]}>
                      Set Username
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.signOutBtn, { backgroundColor: colors.secondarySystemFill }]}
              onPress={() => {
                Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      } catch {}
                      await signOut();
                    },
                  },
                ]);
              }}
            >
              <IconSymbol name="arrow.right" size={16} color={colors.secondaryLabel} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Apple Health-Style Activity Rings */}
        <DailyGoalRing
          todayMinutes={todayMinutes}
          goalMinutes={30}
          todayPages={todayPages}
          goalPages={20}
          streakDays={streakDays}
        />

        {/* Apple Health-Style Weekly Reading Velocity Chart */}
        <WeeklyReadingChart sessions={sessions} />

        {/* 2x2 Apple Health-style Metrics Grid */}
        <View style={styles.metricsGrid}>
          {/* Tile 1: Total Time */}
          <LiquidGlass
            variant="regular"
            intensity={80}
            cornerRadius={CornerRadius.xl}
            style={styles.metricCard}
          >
            <View style={styles.metricHeader}>
              <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.2)' : 'rgba(0, 122, 255, 0.12)' }]}>
                <IconSymbol name="clock.fill" size={17} color={colors.tint} />
              </View>
              <Text style={[Typography.caption1Bold, { color: colors.secondaryLabel }]}>
                TIME READ
              </Text>
            </View>
            <Text style={[Typography.statNumber, { color: colors.label, fontSize: 28 }]}>
              {formatHoursMinutes(stats.totalDurationSeconds)}
            </Text>
            <Text style={[Typography.caption2, { color: colors.tertiaryLabel }]}>
              Total reading time
            </Text>
          </LiquidGlass>

          {/* Tile 2: Pages Read */}
          <LiquidGlass
            variant="regular"
            intensity={80}
            cornerRadius={CornerRadius.xl}
            style={styles.metricCard}
          >
            <View style={styles.metricHeader}>
              <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.2)' : 'rgba(52, 199, 89, 0.15)' }]}>
                <IconSymbol name="book.fill" size={17} color={colors.success} />
              </View>
              <Text style={[Typography.caption1Bold, { color: colors.secondaryLabel }]}>
                PAGES
              </Text>
            </View>
            <Text style={[Typography.statNumber, { color: colors.label, fontSize: 28 }]}>
              {stats.totalPagesRead}
            </Text>
            <Text style={[Typography.caption2, { color: colors.tertiaryLabel }]}>
              Across all sessions
            </Text>
          </LiquidGlass>

          {/* Tile 3: Books Finished */}
          <LiquidGlass
            variant="regular"
            intensity={80}
            cornerRadius={CornerRadius.xl}
            style={styles.metricCard}
          >
            <View style={styles.metricHeader}>
              <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)' }]}>
                <IconSymbol name="star.fill" size={17} color={isDark ? '#F59E0B' : '#D97706'} />
              </View>
              <Text style={[Typography.caption1Bold, { color: colors.secondaryLabel }]}>
                FINISHED
              </Text>
            </View>
            <Text style={[Typography.statNumber, { color: colors.label, fontSize: 28 }]}>
              {stats.totalBooksFinished}
            </Text>
            <Text style={[Typography.caption2, { color: colors.tertiaryLabel }]}>
              Books completed
            </Text>
          </LiquidGlass>

          {/* Tile 4: Average Pace */}
          <LiquidGlass
            variant="regular"
            intensity={80}
            cornerRadius={CornerRadius.xl}
            style={styles.metricCard}
          >
            <View style={styles.metricHeader}>
              <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(234, 88, 12, 0.2)' : 'rgba(234, 88, 12, 0.14)' }]}>
                <IconSymbol name="speedometer" size={17} color={isDark ? '#FF9F0A' : '#EA580C'} />
              </View>
              <Text style={[Typography.caption1Bold, { color: colors.secondaryLabel }]}>
                AVG PACE
              </Text>
            </View>
            <Text style={[Typography.statNumber, { color: colors.label, fontSize: 28 }]}>
              {stats.averageMinutesPerPage > 0 ? `${stats.averageMinutesPerPage}m` : '—'}
            </Text>
            <Text style={[Typography.caption2, { color: colors.tertiaryLabel }]}>
              Minutes per page
            </Text>
          </LiquidGlass>
        </View>

        {/* Session Log Section */}
        <View style={styles.sectionHeader}>
          <Text style={[Typography.title2, { color: colors.label }]}>Session History</Text>
          <Text style={[Typography.footnote, { color: colors.secondaryLabel }]}>
            {sessions.length} logged
          </Text>
        </View>

        {sessions.length > 0 ? (
          <View style={styles.sessionsList}>
            {sessions.map((sess) => {
              const book = booksMap[sess.bookId];
              const dateStr = format(new Date(sess.createdAt), 'MMM d, yyyy · h:mm a');
              const mins = Math.max(1, Math.round(sess.durationSeconds / 60));

              const pace = sess.pagesRead > 0 ? (sess.durationSeconds / 60 / sess.pagesRead).toFixed(1) : null;

              return (
                <TouchableOpacity
                  key={sess.id}
                  activeOpacity={0.75}
                  onPress={() => handleOpenStickerForSession(sess)}
                >
                  <LiquidGlass
                    variant="regular"
                    intensity={80}
                    cornerRadius={CornerRadius.lg}
                    style={styles.sessionCard}
                  >
                    <View style={styles.sessionHeaderRow}>
                      <Text style={[Typography.caption2, { color: colors.tertiaryLabel }]}>
                        {dateStr}
                      </Text>
                      <View style={[styles.durationBadge, { backgroundColor: colors.secondarySystemFill }]}>
                        <IconSymbol name="clock" size={11} color={colors.secondaryLabel} />
                        <Text style={[Typography.caption2, { color: colors.label, fontWeight: '600', marginLeft: 4 }]}>
                          {mins}m session
                        </Text>
                      </View>
                    </View>

                    <Text style={[Typography.headline, { color: colors.label, marginTop: 4 }]} numberOfLines={1}>
                      {book?.title || 'Unknown Title'}
                    </Text>

                    {/* Page Range & Velocity Info */}
                    <View style={styles.sessionFooterRow}>
                      <View style={styles.pagesInfo}>
                        <IconSymbol name="bookmark" size={13} color={colors.secondaryLabel} />
                        <Text style={[Typography.footnote, { color: colors.secondaryLabel, marginLeft: 5 }]}>
                          Pages {sess.startPage} → {sess.endPage} ({sess.pagesRead} pages)
                        </Text>
                      </View>

                      {pace != null && (
                        <Text style={[Typography.caption1Bold, { color: colors.tint }]}>
                          {pace} m/pg
                        </Text>
                      )}
                    </View>

                    {sess.notes && (
                      <View style={[styles.notesBox, { backgroundColor: colors.tertiarySystemFill }]}>
                        <Text style={[Typography.caption2, { color: colors.secondaryLabel }]} numberOfLines={2}>
                          "{sess.notes}"
                        </Text>
                      </View>
                    )}

                    {/* Tap to View Sticker prompt */}
                    <View style={styles.stickerPromptRow}>
                      <View style={styles.stickerPromptLeft}>
                        <IconSymbol name="sparkles" size={12} color={colors.tint} />
                        <Text style={[Typography.caption2, { color: colors.tint, fontWeight: '600', marginLeft: 4 }]}>
                          Tap to view sticker
                        </Text>
                      </View>
                      <IconSymbol name="chevron.right" size={12} color={colors.tertiaryLabel} />
                    </View>
                  </LiquidGlass>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptySessions}>
            <IconSymbol name="timer" size={40} color={colors.tertiaryLabel} />
            <Text style={[Typography.headline, { color: colors.label, marginTop: 12 }]}>
              No Sessions Logged Yet
            </Text>
            <Text style={[Typography.footnote, { color: colors.secondaryLabel, textAlign: 'center', marginTop: 4, paddingHorizontal: 32 }]}>
              Start a reading timer from the Home screen and finish a session to track your reading history here.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal: Set Username (iOS Bottom Sheet) */}
      <Modal
        visible={usernameModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUsernameModalVisible(false)}
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
                {/* Handle Bar */}
                <View style={styles.handleRow}>
                  <View style={[styles.handleBar, { backgroundColor: colors.quaternaryLabel }]} />
                </View>

                <Text style={[Typography.title2, { color: colors.label, textAlign: 'center' }]}>
                  Choose a Username
                </Text>
                <Text style={[Typography.footnote, { color: colors.secondaryLabel, textAlign: 'center', marginTop: 4, marginBottom: 20 }]}>
                  This is your display name. You will still sign in with your email.
                </Text>

                <TextInput
                  style={[
                    styles.usernameInput,
                    {
                      backgroundColor: colors.tertiarySystemFill,
                      borderColor: colors.separator,
                      color: colors.label,
                    },
                  ]}
                  placeholder="e.g. reader_name"
                  placeholderTextColor={colors.tertiaryLabel}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={newUsernameInput}
                  onChangeText={setNewUsernameInput}
                />

                <View style={styles.modalBtnsRow}>
                  <TouchableOpacity
                    onPress={() => setUsernameModalVisible(false)}
                    style={[styles.modalCancelBtn, { backgroundColor: colors.secondarySystemFill }]}
                  >
                    <Text style={[Typography.subheadBold, { color: colors.secondaryLabel }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSaveUsername}
                    disabled={savingUsername}
                    style={[styles.modalConfirmBtn, { backgroundColor: colors.tint }]}
                  >
                    {savingUsername ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={[Typography.subheadBold, { color: '#FFFFFF' }]}>Save Username</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </LiquidGlass>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal: Reading Session Sticker (Opened on tapping specific history session) */}
      <ReadingStickerModal
        visible={stickerModalVisible}
        book={selectedSessionForSticker?.book ?? null}
        cardPagesRead={selectedSessionForSticker?.session.pagesRead ?? 0}
        lastSessionPace={
          selectedSessionForSticker?.session.pagesRead
            ? Number(
                (
                  selectedSessionForSticker.session.durationSeconds /
                  60 /
                  selectedSessionForSticker.session.pagesRead
                ).toFixed(1)
              )
            : null
        }
        bookPace={selectedSessionForSticker?.bookPace ?? null}
        sessionDate={selectedSessionForSticker?.session.createdAt}
        onClose={() => setStickerModalVisible(false)}
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
    paddingTop: 12,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  usernamePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CornerRadius.full,
  },
  setUsernameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CornerRadius.full,
  },
  signOutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  metricCard: {
    width: '48%',
    flexGrow: 1,
    padding: 16,
    gap: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  sessionsList: {
    gap: 12,
  },
  sessionCard: {
    padding: 14,
    gap: 4,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CornerRadius.full,
  },
  sessionFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  pagesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: CornerRadius.sm,
  },
  emptySessions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
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
  usernameInput: {
    height: 50,
    borderRadius: CornerRadius.md,
    paddingHorizontal: 16,
    fontSize: 17,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 20,
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
  stickerPromptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(120, 120, 128, 0.2)',
  },
  stickerPromptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

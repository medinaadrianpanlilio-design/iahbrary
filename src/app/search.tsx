import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useAppleTheme } from '@/hooks/useAppleTheme';
import { Typography } from '@/constants/typography';
import { CornerRadius, Shadows } from '@/constants/theme';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { LiquidGlassBackground } from '@/components/ui/LiquidGlassBackground';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { searchBooks, SearchBookResult } from '@/services/bookSearchService';
import { CURATED_BOOKS, CURATED_CATEGORIES, CuratedBook } from '@/constants/curatedBooks';
import { addBook } from '@/db';
import { Book, BookStatus } from '@/types';

export default function SearchScreen() {
  const { colors, isDark } = useAppleTheme();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [results, setResults] = useState<SearchBookResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Modal State for custom edition setup
  const [selectedBook, setSelectedBook] = useState<SearchBookResult | CuratedBook | null>(null);
  const [customPages, setCustomPages] = useState<string>('250');
  const [bookStatus, setBookStatus] = useState<BookStatus>('READING');
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filter curated books by selected genre
  const filteredCuratedBooks = useMemo(() => {
    if (selectedCategory === 'all') return CURATED_BOOKS;
    return CURATED_BOOKS.filter((b) => b.category === selectedCategory);
  }, [selectedCategory]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const books = await searchBooks(query);
      setResults(books);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setHasSearched(false);
      setResults([]);
    }
  };

  const openAddModal = (book: SearchBookResult | CuratedBook) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setSelectedBook(book);
    setCustomPages((book.pageCount || 250).toString());
    setBookStatus('READING');
    setModalVisible(true);
  };

  const handleSaveBook = async () => {
    if (!selectedBook) return;
    setSaving(true);
    try {
      const pages = parseInt(customPages, 10) || selectedBook.pageCount || 200;
      const now = Date.now();
      const newBook: Book = {
        id: selectedBook.id,
        title: selectedBook.title,
        authors: selectedBook.authors,
        description: selectedBook.description,
        thumbnailUrl: selectedBook.thumbnailUrl,
        totalPages: pages,
        currentPage: 0,
        status: bookStatus,
        createdAt: now,
        updatedAt: now,
      };

      await addBook(newBook);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
      setSelectedBook(null);
      router.push('/');
    } catch (e) {
      console.error('Error saving book:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.systemBackground }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LiquidGlassBackground />

      {/* Top Header & Search Bar */}
      <View style={styles.header}>
        <Text style={[Typography.largeTitle, { color: colors.label }]}>Discover</Text>
        <Text style={[Typography.footnote, { color: colors.secondaryLabel, marginTop: 2, marginBottom: 12 }]}>
          Search millions of titles or explore curated favorites
        </Text>

        {/* Apple Style Search Input Bar */}
        <LiquidGlass
          variant="regular"
          intensity={70}
          cornerRadius={CornerRadius.md}
          style={[styles.searchBar, { backgroundColor: colors.secondarySystemFill }]}
        >
          <IconSymbol name="magnifyingglass" size={17} color={colors.secondaryLabel} />
          <TextInput
            style={[styles.input, { color: colors.label }]}
            placeholder="Title, author, or keyword..."
            placeholderTextColor={colors.tertiaryLabel}
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => handleQueryChange('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconSymbol name="xmark.circle.fill" size={16} color={colors.tertiaryLabel} />
            </TouchableOpacity>
          )}
          {query.trim().length > 0 && (
            <TouchableOpacity
              onPress={handleSearch}
              style={[styles.searchActionBtn, { backgroundColor: colors.tint }]}
            >
              <Text style={[Typography.caption1Bold, { color: '#FFFFFF' }]}>Search</Text>
            </TouchableOpacity>
          )}
        </LiquidGlass>

        {/* Category Pills (Visible when not searching results) */}
        {!hasSearched && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {CURATED_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => {
                    try {
                      Haptics.selectionAsync();
                    } catch {}
                    setSelectedCategory(cat.key);
                  }}
                  style={[
                    styles.catPill,
                    {
                      backgroundColor: isSelected
                        ? colors.label
                        : colors.secondarySystemFill,
                    },
                  ]}
                >
                  <Text
                    style={[
                      Typography.caption2,
                      {
                        color: isSelected ? colors.systemBackground : colors.label,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[Typography.footnote, { color: colors.secondaryLabel, marginTop: 12 }]}>
            Searching books & editions...
          </Text>
        </View>
      ) : hasSearched ? (
        /* Search Results List */
        results.length > 0 ? (
          <FlatList
            key="search-results-1col"
            data={results}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <LiquidGlass
                variant="regular"
                intensity={80}
                cornerRadius={CornerRadius.xl}
                style={styles.resultCard}
              >
                <View style={[styles.resultCoverContainer, Shadows.cover]}>
                  {item.thumbnailUrl ? (
                    <Image
                      source={{ uri: item.thumbnailUrl }}
                      style={styles.resultThumbnail}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <View style={[styles.resultThumbnailPlaceholder, { backgroundColor: colors.secondarySystemFill }]}>
                      <IconSymbol name="book" size={24} color={colors.secondaryLabel} />
                    </View>
                  )}
                </View>

                <View style={styles.resultInfo}>
                  <View>
                    <Text style={[Typography.headline, { color: colors.label }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={[Typography.footnote, { color: colors.secondaryLabel, marginTop: 2 }]} numberOfLines={1}>
                      {item.authors.join(', ')}
                    </Text>
                  </View>

                  <View style={styles.resultFooterRow}>
                    <Text style={[Typography.caption2, { color: colors.secondaryLabel }]}>
                      {item.pageCount} pages
                    </Text>
                    <TouchableOpacity
                      onPress={() => openAddModal(item)}
                      style={[styles.addResultBtn, { backgroundColor: colors.tint }]}
                    >
                      <IconSymbol name="plus" size={13} color="#FFFFFF" />
                      <Text style={[Typography.caption1Bold, { color: '#FFFFFF', marginLeft: 4 }]}>
                        Add
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </LiquidGlass>
            )}
          />
        ) : (
          <View style={styles.centerContainer}>
            <IconSymbol name="magnifyingglass" size={44} color={colors.tertiaryLabel} />
            <Text style={[Typography.title3, { color: colors.label, marginTop: 14 }]}>
              No Results Found
            </Text>
            <Text style={[Typography.footnote, { color: colors.secondaryLabel, textAlign: 'center', marginTop: 4, paddingHorizontal: 32 }]}>
              Try checking spelling or searching another title or author.
            </Text>
          </View>
        )
      ) : (
        /* Curated Showcase Grid (Default View) */
        <FlatList
          key={`curated-grid-2col-${selectedCategory}`}
          data={filteredCuratedBooks}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.curatedHeaderRow}>
              <Text style={[Typography.title3, { color: colors.label }]}>
                {selectedCategory === 'all'
                  ? 'Curated Bookshelf'
                  : CURATED_CATEGORIES.find((c) => c.key === selectedCategory)?.label}
              </Text>
              <Text style={[Typography.footnote, { color: colors.secondaryLabel }]}>
                {filteredCuratedBooks.length} titles
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => openAddModal(item)}
              style={styles.gridCardWrapper}
            >
              <LiquidGlass
                variant="regular"
                intensity={80}
                cornerRadius={CornerRadius.xl}
                style={styles.gridBookCard}
              >
                <View style={[styles.gridCoverContainer, Shadows.cover]}>
                  <Image
                    source={{ uri: item.thumbnailUrl }}
                    style={styles.gridCover}
                    contentFit="cover"
                    transition={200}
                  />
                </View>
                <View style={styles.gridBookMeta}>
                  <Text style={[Typography.headline, { color: colors.label, fontSize: 15 }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.secondaryLabel, marginTop: 2 }]} numberOfLines={1}>
                    {item.authors[0]}
                  </Text>
                  <View style={styles.gridPageBadge}>
                    <Text style={[Typography.caption2, { color: colors.tint, fontWeight: '600' }]}>
                      {item.pageCount} pgs
                    </Text>
                    <IconSymbol name="plus.circle.fill" size={16} color={colors.tint} />
                  </View>
                </View>
              </LiquidGlass>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Modal: Customize Edition & Pages (iOS Bottom Sheet) */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
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

                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={[Typography.title2, { color: colors.label }]}>Add to Library</Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={[styles.closeBtn, { backgroundColor: colors.tertiarySystemFill }]}
                  >
                    <IconSymbol name="xmark" size={16} color={colors.secondaryLabel} />
                  </TouchableOpacity>
                </View>

                {selectedBook && (
                  <View style={[styles.modalBookSummary, { backgroundColor: colors.tertiarySystemFill }]}>
                    {selectedBook.thumbnailUrl ? (
                      <Image
                        source={{ uri: selectedBook.thumbnailUrl }}
                        style={styles.modalCover}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.modalCover, { backgroundColor: colors.secondarySystemFill, alignItems: 'center', justifyContent: 'center' }]}>
                        <IconSymbol name="book" size={20} color={colors.secondaryLabel} />
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[Typography.headline, { color: colors.label }]} numberOfLines={2}>
                        {selectedBook.title}
                      </Text>
                      <Text style={[Typography.footnote, { color: colors.secondaryLabel, marginTop: 2 }]} numberOfLines={1}>
                        {selectedBook.authors.join(', ')}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Custom Edition Page Count */}
                <View style={styles.formGroup}>
                  <Text style={[Typography.caption1Bold, { color: colors.secondaryLabel, marginBottom: 4 }]}>
                    PAGES IN YOUR EDITION
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.tertiaryLabel, marginBottom: 8 }]}>
                    Adjust to match the final numbered page in your printed copy
                  </Text>
                  <View style={styles.pageInputRow}>
                    <TextInput
                      style={[
                        styles.modalPageInput,
                        {
                          backgroundColor: colors.tertiarySystemFill,
                          borderColor: colors.separator,
                          color: colors.label,
                        },
                      ]}
                      keyboardType="number-pad"
                      value={customPages}
                      onChangeText={setCustomPages}
                    />
                    <Text style={[Typography.body, { color: colors.secondaryLabel, marginLeft: 10 }]}>
                      pages
                    </Text>
                  </View>
                </View>

                {/* Initial Status Selector */}
                <View style={styles.formGroup}>
                  <Text style={[Typography.caption1Bold, { color: colors.secondaryLabel, marginBottom: 8 }]}>
                    INITIAL STATUS
                  </Text>
                  <View style={styles.statusOptions}>
                    <TouchableOpacity
                      onPress={() => {
                        try {
                          Haptics.selectionAsync();
                        } catch {}
                        setBookStatus('READING');
                      }}
                      style={[
                        styles.statusBtn,
                        {
                          backgroundColor:
                            bookStatus === 'READING'
                              ? (isDark ? 'rgba(10, 132, 255, 0.25)' : 'rgba(0, 122, 255, 0.14)')
                              : colors.tertiarySystemFill,
                          borderColor:
                            bookStatus === 'READING' ? colors.tint : 'transparent',
                        },
                      ]}
                    >
                      <IconSymbol
                        name="book.fill"
                        size={16}
                        color={bookStatus === 'READING' ? colors.tint : colors.secondaryLabel}
                      />
                      <Text
                        style={[
                          Typography.subheadBold,
                          {
                            color: bookStatus === 'READING' ? colors.tint : colors.secondaryLabel,
                            marginLeft: 6,
                          },
                        ]}
                      >
                        Reading Now
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        try {
                          Haptics.selectionAsync();
                        } catch {}
                        setBookStatus('WANT_TO_READ');
                      }}
                      style={[
                        styles.statusBtn,
                        {
                          backgroundColor:
                            bookStatus === 'WANT_TO_READ'
                              ? (isDark ? 'rgba(10, 132, 255, 0.25)' : 'rgba(0, 122, 255, 0.14)')
                              : colors.tertiarySystemFill,
                          borderColor:
                            bookStatus === 'WANT_TO_READ' ? colors.tint : 'transparent',
                        },
                      ]}
                    >
                      <IconSymbol
                        name="bookmark.fill"
                        size={16}
                        color={bookStatus === 'WANT_TO_READ' ? colors.tint : colors.secondaryLabel}
                      />
                      <Text
                        style={[
                          Typography.subheadBold,
                          {
                            color: bookStatus === 'WANT_TO_READ' ? colors.tint : colors.secondaryLabel,
                            marginLeft: 6,
                          },
                        ]}
                      >
                        Want to Read
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  onPress={handleSaveBook}
                  disabled={saving}
                  style={[styles.saveBtn, { backgroundColor: colors.tint }]}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={[Typography.subheadBold, { color: '#FFFFFF' }]}>
                      Save to Library
                    </Text>
                  )}
                </TouchableOpacity>
              </LiquidGlass>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: CornerRadius.md,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  searchActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: CornerRadius.sm,
  },
  categoriesScroll: {
    paddingVertical: 12,
    gap: 8,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: CornerRadius.full,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 110,
    gap: 12,
  },
  resultCard: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  resultCoverContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  resultThumbnail: {
    width: 68,
    height: 100,
    borderRadius: 8,
  },
  resultThumbnailPlaceholder: {
    width: 68,
    height: 100,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  resultFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  addResultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: CornerRadius.sm,
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 110,
  },
  gridRow: {
    gap: 12,
    marginBottom: 12,
  },
  curatedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  gridCardWrapper: {
    flex: 1,
  },
  gridBookCard: {
    padding: 12,
  },
  gridCoverContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridCover: {
    width: '100%',
    aspectRatio: 0.68,
    borderRadius: 10,
  },
  gridBookMeta: {
    gap: 2,
  },
  gridPageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
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
    marginBottom: 12,
  },
  handleBar: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBookSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: CornerRadius.lg,
    marginBottom: 18,
  },
  modalCover: {
    width: 50,
    height: 74,
    borderRadius: 6,
  },
  formGroup: {
    marginBottom: 18,
  },
  pageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalPageInput: {
    width: 100,
    height: 48,
    borderRadius: CornerRadius.md,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: CornerRadius.md,
    borderWidth: 1.5,
  },
  saveBtn: {
    height: 52,
    borderRadius: CornerRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Book } from '@/types';
import { useAppleTheme } from '@/hooks/useAppleTheme';
import { Typography } from '@/constants/typography';
import { CornerRadius, Shadows } from '@/constants/theme';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface ActiveBookCardProps {
  book: Book | null;
  loading: boolean;
  onOpenSticker?: () => void;
  onPlayPress?: () => void;
  onPressDetails?: () => void;
}

export const ActiveBookCard: React.FC<ActiveBookCardProps> = ({
  book,
  loading,
  onPlayPress,
  onPressDetails,
}) => {
  const router = useRouter();
  const { colors, isDark } = useAppleTheme();

  if (loading) {
    return (
      <LiquidGlass
        variant="regular"
        intensity={70}
        cornerRadius={CornerRadius.xl}
        style={[styles.card, styles.loadingCard]}
      >
        <ActivityIndicator color={colors.tint} />
      </LiquidGlass>
    );
  }

  if (!book) {
    return (
      <LiquidGlass
        variant="regular"
        intensity={70}
        cornerRadius={CornerRadius.xl}
        style={[styles.card, styles.emptyCard]}
      >
        <View style={styles.emptyContent}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.secondarySystemFill }]}>
            <IconSymbol name="book" size={28} color={colors.secondaryLabel} />
          </View>
          <Text style={[Typography.headline, { color: colors.label, marginTop: 10 }]}>
            No Book in Progress
          </Text>
          <Text style={[Typography.footnote, { color: colors.secondaryLabel, textAlign: 'center', marginTop: 4, paddingHorizontal: 16 }]}>
            Select a book from your library or search for one to start reading.
          </Text>
          <TouchableOpacity
            onPress={() => {
              try {
                Haptics.selectionAsync();
              } catch {}
              router.push('/library');
            }}
            style={[styles.emptyButton, { backgroundColor: colors.tint }]}
          >
            <Text style={[Typography.subheadBold, { color: '#FFFFFF' }]}>Browse Library</Text>
          </TouchableOpacity>
        </View>
      </LiquidGlass>
    );
  }

  const bookTitle = book.title;
  const authorName = book.authors?.join(', ') || 'Unknown Author';
  const currentPage = book.currentPage ?? 0;
  const totalPages = Math.max(book.totalPages ?? 1, 1);
  const progressPercent = Math.min(100, Math.round((currentPage / totalPages) * 100));

  const handlePlay = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    if (onPlayPress) {
      onPlayPress();
    } else {
      router.push('/library');
    }
  };

  return (
    <LiquidGlass
      variant="regular"
      intensity={75}
      cornerRadius={CornerRadius.xl}
      style={styles.card}
    >
      <View style={styles.cardContent}>
        {/* Left: Book Cover Image with elevation (pressable for details) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPressDetails}
          disabled={!onPressDetails}
          style={[styles.coverWrapper, Shadows.cover]}
        >
          <Image
            source={{ uri: book.thumbnailUrl || undefined }}
            style={styles.bookThumbnail}
            contentFit="cover"
            transition={300}
          />
          {/* Subtle Spine Highlight */}
          <View style={styles.spineHighlight} />
        </TouchableOpacity>

        {/* Right: Book Details & Controls */}
        <View style={styles.rightContent}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPressDetails}
            disabled={!onPressDetails}
          >
            <Text style={[styles.bookTitle, { color: colors.label }]} numberOfLines={2}>
              {bookTitle}
            </Text>
            <Text style={[Typography.footnote, { color: colors.secondaryLabel, marginTop: 2 }]} numberOfLines={1}>
              {authorName}
            </Text>
          </TouchableOpacity>

          {/* Liquid Glass Play Button */}
          <TouchableOpacity
            onPress={handlePlay}
            activeOpacity={0.8}
            style={styles.playButtonWrapper}
          >
            <LiquidGlass
              variant="clear"
              intensity={90}
              cornerRadius={CornerRadius.full}
              style={[
                styles.playButtonCircle,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.18)'
                    : 'rgba(0, 122, 255, 0.12)',
                },
              ]}
            >
              <IconSymbol
                name="play.fill"
                size={20}
                color={isDark ? '#FFFFFF' : colors.tint}
                style={{ marginLeft: 2 }}
              />
            </LiquidGlass>
          </TouchableOpacity>

          {/* Refined Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={[Typography.caption2, { color: colors.secondaryLabel }]}>
                Page {currentPage} of {totalPages}
              </Text>
              <Text style={[Typography.caption2, { color: colors.label, fontWeight: '600' }]}>
                {progressPercent}%
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.quaternarySystemFill }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.max(4, progressPercent)}%`,
                    backgroundColor: colors.tint,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>
    </LiquidGlass>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 16,
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 160,
  },
  emptyCard: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    width: '100%',
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButton: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: CornerRadius.full,
  },
  cardContent: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  coverWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  bookThumbnail: {
    width: 96,
    height: 144,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  spineHighlight: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  rightContent: {
    flex: 1,
    justifyContent: 'space-between',
    height: 144,
    paddingVertical: 2,
  },
  bookTitle: {
    ...Typography.headline,
    fontSize: 18,
    lineHeight: 22,
  },
  playButtonWrapper: {
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  playButtonCircle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    gap: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTrack: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
});

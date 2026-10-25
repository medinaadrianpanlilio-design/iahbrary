import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert, Platform } from 'react-native';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useAppleTheme } from '@/hooks/useAppleTheme';
import { Typography } from '@/constants/typography';
import { CornerRadius, Shadows } from '@/constants/theme';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BookHighlight } from '@/types';

interface HighlightCardProps {
  highlight: BookHighlight;
  bookTitle?: string;
  bookAuthor?: string;
  onDelete?: (id: string) => void;
}

export const HighlightCard: React.FC<HighlightCardProps> = ({
  highlight,
  bookTitle,
  bookAuthor,
  onDelete,
}) => {
  const { colors, isDark } = useAppleTheme();

  const handleShare = async () => {
    try {
      Haptics.selectionAsync();
    } catch {}

    const textParts = [
      `"${highlight.quote}"`,
      highlight.page ? `— Page ${highlight.page}` : '',
      bookTitle ? `— ${bookTitle}` : '',
      bookAuthor ? `by ${bookAuthor}` : '',
      highlight.note ? `\nNote: ${highlight.note}` : '',
      `\nCaptured with Iahbrary`,
    ].filter(Boolean);

    await Share.share({
      message: textParts.join(' '),
      title: bookTitle ? `Quote from ${bookTitle}` : 'Book Quote',
    });
  };

  const handleCopy = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(`"${highlight.quote}"`);
      Alert.alert('Copied', 'Quote copied to clipboard.');
    } else {
      handleShare();
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Highlight', 'Are you sure you want to delete this highlight?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch {}
          onDelete?.(highlight.id);
        },
      },
    ]);
  };

  const formattedDate = format(new Date(highlight.createdAt), 'MMM d, yyyy');

  return (
    <LiquidGlass
      variant="regular"
      intensity={75}
      cornerRadius={CornerRadius.xl}
      style={styles.card}
    >
      {/* Quotation Header with decorative mark */}
      <View style={styles.quoteHeader}>
        <View style={[styles.quoteMarkWrap, { backgroundColor: colors.secondarySystemFill }]}>
          <IconSymbol name="quote.opening" size={14} color={colors.tint} />
        </View>

        <View style={styles.headerRight}>
          {highlight.page != null && highlight.page > 0 && (
            <View style={[styles.pageBadge, { backgroundColor: colors.secondarySystemFill }]}>
              <Text style={[Typography.caption2, { color: colors.tint, fontWeight: '700' }]}>
                Page {highlight.page}
              </Text>
            </View>
          )}
          <Text style={[Typography.caption2, { color: colors.tertiaryLabel, marginLeft: 8 }]}>
            {formattedDate}
          </Text>
        </View>
      </View>

      {/* Quote Body */}
      <Text style={[styles.quoteText, { color: colors.label }]}>
        "{highlight.quote}"
      </Text>

      {/* Personal Reflection / Note */}
      {highlight.note && (
        <View style={[styles.noteContainer, { backgroundColor: colors.secondarySystemFill }]}>
          <Text style={[Typography.caption2, { color: colors.secondaryLabel, fontWeight: '600' }]}>
            REFLECTION
          </Text>
          <Text style={[Typography.footnote, { color: colors.label, marginTop: 4 }]}>
            {highlight.note}
          </Text>
        </View>
      )}

      {/* Bottom Actions Bar */}
      <View style={styles.footerRow}>
        <View style={styles.actionButtonsGroup}>
          <TouchableOpacity
            onPress={handleShare}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.actionBtn, { backgroundColor: colors.secondarySystemFill }]}
          >
            <IconSymbol name="square.and.arrow.up" size={12} color={colors.secondaryLabel} />
            <Text style={[Typography.caption2, { color: colors.secondaryLabel, marginLeft: 4 }]}>
              Share
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCopy}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.actionBtn, { backgroundColor: colors.secondarySystemFill, marginLeft: 8 }]}
          >
            <IconSymbol name="doc.on.doc" size={12} color={colors.secondaryLabel} />
            <Text style={[Typography.caption2, { color: colors.secondaryLabel, marginLeft: 4 }]}>
              Copy
            </Text>
          </TouchableOpacity>
        </View>

        {onDelete && (
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.deleteBtn}
          >
            <IconSymbol name="trash" size={14} color={colors.tertiaryLabel} />
          </TouchableOpacity>
        )}
      </View>
    </LiquidGlass>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 12,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  quoteMarkWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CornerRadius.full,
  },
  quoteText: {
    ...Typography.body,
    fontStyle: 'italic',
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  noteContainer: {
    padding: 10,
    borderRadius: CornerRadius.md,
    marginTop: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
  },
  actionButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: CornerRadius.full,
  },
  deleteBtn: {
    padding: 4,
  },
});

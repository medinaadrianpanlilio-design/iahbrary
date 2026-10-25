import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Share,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { useAppleTheme } from '@/hooks/useAppleTheme';
import { Typography } from '@/constants/typography';
import { CornerRadius, Shadows } from '@/constants/theme';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Book } from '@/types';

interface ReadingStickerModalProps {
  visible: boolean;
  book: Book | null;
  cardPagesRead: number;
  lastSessionPace: number | null;
  bookPace: number | null;
  sessionDate?: number | Date | string;
  onClose: () => void;
}

export const ReadingStickerModal: React.FC<ReadingStickerModalProps> = ({
  visible,
  book,
  cardPagesRead,
  lastSessionPace,
  bookPace,
  sessionDate,
  onClose,
}) => {
  const { colors, isDark } = useAppleTheme();

  const formattedDate = sessionDate
    ? format(new Date(sessionDate), 'MMMM d, yyyy')
    : format(new Date(), 'MMMM d, yyyy');

  const handleShare = async () => {
    try {
      Haptics.selectionAsync();
      const title = book?.title || 'My Book';
      const author = book?.authors?.join(', ') || '';
      const percent = book && book.totalPages > 0
        ? Math.min(100, Math.round((book.currentPage / book.totalPages) * 100))
        : 0;
      const sessionPaceStr =
        lastSessionPace != null ? `${lastSessionPace} min/page` : '—';
      const bookPaceStr = bookPace != null ? `${bookPace} min/page` : '—';

      const message = [
        `Iahbrary Reading Session`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `"${title}"`,
        author ? `Author: ${author}` : '',
        `Date: ${formattedDate}`,
        `Pages This Session: ${cardPagesRead}`,
        `Session Pace: ${sessionPaceStr}`,
        `Book Avg Pace: ${bookPaceStr}`,
        `Progress: ${percent}% (Page ${book?.currentPage || 0}/${book?.totalPages || 0})`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `Tracked with Iahbrary`,
      ]
        .filter(Boolean)
        .join('\n');

      await Share.share({
        message,
        title: `Iahbrary - ${title}`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const progressPercent = book && book.totalPages > 0
    ? Math.min(100, Math.round((book.currentPage / Math.max(book.totalPages, 1)) * 100))
    : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Dismissible backdrop: tapping anywhere outside dismisses the sticker */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              {/* Savable / Shareable Sticker Card */}
              <LiquidGlass
                variant="regular"
                intensity={95}
                cornerRadius={CornerRadius.xxl}
                style={[
                  styles.stickerCard,
                  Shadows.floating,
                  { backgroundColor: colors.secondarySystemGroupedBackground },
                ]}
              >
                {/* Top Branding & Close Icon Button */}
                <View style={styles.topBar}>
                  <View style={styles.topBarLeft}>
                    <Text style={[Typography.caption1Bold, { color: colors.secondaryLabel, letterSpacing: 1.2 }]}>
                      IAHBRARY SESSION
                    </Text>
                    <View style={[styles.badge, { backgroundColor: colors.secondarySystemFill }]}>
                      <IconSymbol name="sparkles" size={12} color={colors.tint} />
                      <Text style={[Typography.caption2, { color: colors.label, marginLeft: 4, fontWeight: '600' }]}>
                        Verified
                      </Text>
                    </View>
                  </View>

                  {/* Prominent X Close Button on Top-Right */}
                  <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={[styles.closeIconBtn, { backgroundColor: colors.tertiarySystemFill }]}
                  >
                    <IconSymbol name="xmark" size={15} color={colors.secondaryLabel} />
                  </TouchableOpacity>
                </View>

                {/* Book Meta */}
                <View style={styles.bookMeta}>
                  <Text style={[Typography.title2, { color: colors.label }]} numberOfLines={2}>
                    {book?.title || 'Untitled Book'}
                  </Text>
                  {book?.authors && book.authors.length > 0 && (
                    <Text style={[Typography.subhead, { color: colors.secondaryLabel, marginTop: 2 }]} numberOfLines={1}>
                      {book.authors.join(', ')}
                    </Text>
                  )}
                </View>

                {/* Stats Row */}
                <View style={[styles.statsRow, { backgroundColor: colors.tertiarySystemFill }]}>
                  <View style={styles.statCol}>
                    <Text style={[Typography.statNumber, { color: colors.label }]}>{cardPagesRead}</Text>
                    <Text style={[Typography.caption2, { color: colors.secondaryLabel, marginTop: 2 }]}>
                      Pages Read
                    </Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
                  <View style={styles.statCol}>
                    <Text style={[Typography.statNumber, { color: colors.label }]}>
                      {lastSessionPace != null ? `${lastSessionPace}m` : '—'}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.secondaryLabel, marginTop: 2 }]}>
                      Session Pace
                    </Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
                  <View style={styles.statCol}>
                    <Text style={[Typography.statNumber, { color: colors.label }]}>
                      {bookPace != null ? `${bookPace}m` : '—'}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.secondaryLabel, marginTop: 2 }]}>
                      Book Avg
                    </Text>
                  </View>
                </View>

                {/* Progress Bar & Footer */}
                <View style={styles.footer}>
                  <View style={[styles.progressBar, { backgroundColor: colors.quaternarySystemFill }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.max(4, progressPercent)}%`, backgroundColor: colors.tint },
                      ]}
                    />
                  </View>
                  <View style={styles.footerInfoRow}>
                    <Text style={[Typography.caption2, { color: colors.secondaryLabel }]}>
                      {formattedDate}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.label, fontWeight: '600' }]}>
                      {book ? `Page ${book.currentPage} of ${book.totalPages} (${progressPercent}%)` : ''}
                    </Text>
                  </View>
                </View>
              </LiquidGlass>

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.dismissBtn, { backgroundColor: colors.secondarySystemFill }]}
                >
                  <Text style={[Typography.subheadBold, { color: colors.secondaryLabel }]}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleShare}
                  style={[styles.shareBtn, { backgroundColor: colors.tint }]}
                >
                  <IconSymbol name="square.and.arrow.up" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={[Typography.subheadBold, { color: '#FFFFFF' }]}>Share Sticker</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    gap: 16,
  },
  stickerCard: {
    padding: 22,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CornerRadius.full,
  },
  bookMeta: {
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: CornerRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginBottom: 18,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
  },
  footer: {
    gap: 8,
  },
  progressBar: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  footerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dismissBtn: {
    flex: 1,
    height: 50,
    borderRadius: CornerRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    flex: 2,
    height: 50,
    borderRadius: CornerRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ReadingStickerModal;

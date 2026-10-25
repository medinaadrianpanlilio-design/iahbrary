import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppleTheme } from '@/hooks/useAppleTheme';
import { Typography } from '@/constants/typography';
import { CornerRadius } from '@/constants/theme';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Book } from '@/types';

interface FinishBookModalProps {
  visible: boolean;
  book: Book | null;
  lastSessionPace: number | null;
  bookPace: number | null;
  rating: number;
  reviewComment: string;
  onClose: () => void;
  onSelectRating: (star: number) => void;
  onChangeComment: (text: string) => void;
  onSave: () => void;
}

export const FinishBookModal: React.FC<FinishBookModalProps> = ({
  visible,
  book,
  lastSessionPace,
  bookPace,
  rating,
  reviewComment,
  onClose,
  onSelectRating,
  onChangeComment,
  onSave,
}) => {
  const { colors, isDark } = useAppleTheme();

  const handleStarPress = (star: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onSelectRating(star);
  };

  const handleSave = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    onSave();
  };

  const ModalDismissWrapper =
    Platform.OS === 'web'
      ? React.Fragment
      : ({ children }: { children: React.ReactNode }) => (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            {children}
          </TouchableWithoutFeedback>
        );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <ModalDismissWrapper>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheetContainer}
          >
            <LiquidGlass
              variant="regular"
              intensity={95}
              cornerRadius={CornerRadius.xxl}
              style={[styles.sheet, { backgroundColor: colors.secondarySystemGroupedBackground }]}
            >
              {/* Drag Handle */}
              <View style={styles.handleRow}>
                <View style={[styles.handleBar, { backgroundColor: colors.quaternaryLabel }]} />
              </View>

              {/* Celebration Header */}
              <View style={styles.celebrationCenter}>
                <View style={[styles.celebrationCircle, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(217, 119, 6, 0.12)' }]}>
                  <IconSymbol name="sparkles" size={28} color={isDark ? '#F59E0B' : '#D97706'} />
                </View>
                <Text style={[Typography.title2, { color: colors.label, marginTop: 10 }]}>
                  Book Completed!
                </Text>
                <Text
                  style={[Typography.subhead, { color: colors.secondaryLabel, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }]}
                  numberOfLines={2}
                >
                  Congratulations on finishing {book?.title || 'your book'}
                </Text>

                {/* Pace Pills */}
                <View style={styles.pacePillsRow}>
                  {lastSessionPace !== null && (
                    <View style={[styles.pacePill, { backgroundColor: colors.secondarySystemFill }]}>
                      <IconSymbol name="speedometer" size={13} color={colors.tint} />
                      <Text style={[Typography.caption2, { color: colors.label, marginLeft: 5, fontWeight: '600' }]}>
                        {lastSessionPace} m/page last session
                      </Text>
                    </View>
                  )}
                  {bookPace !== null && (
                    <View style={[styles.pacePill, { backgroundColor: colors.secondarySystemFill }]}>
                      <IconSymbol name="chart.bar.xaxis" size={13} color={colors.readingAccent} />
                      <Text style={[Typography.caption2, { color: colors.label, marginLeft: 5, fontWeight: '600' }]}>
                        {bookPace} m/page avg
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* 1 to 5 Star Rating */}
              <View style={styles.ratingSection}>
                <Text style={[Typography.caption1Bold, { color: colors.secondaryLabel, marginBottom: 8 }]}>
                  YOUR RATING
                </Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => handleStarPress(star)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                      <IconSymbol
                        name={star <= rating ? 'star.fill' : 'star'}
                        size={32}
                        color={star <= rating ? '#F59E0B' : colors.tertiaryLabel}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Notes / Thoughts Input */}
              <View style={styles.inputSection}>
                <Text style={[Typography.caption1Bold, { color: colors.secondaryLabel, marginBottom: 6 }]}>
                  REVIEW OR KEY TAKEAWAYS
                </Text>
                <TextInput
                  style={[
                    styles.notesInput,
                    {
                      backgroundColor: colors.tertiarySystemFill,
                      color: colors.label,
                      borderColor: colors.separator,
                    },
                  ]}
                  placeholder="What did you love or learn from this book?"
                  placeholderTextColor={colors.tertiaryLabel}
                  multiline
                  numberOfLines={3}
                  value={reviewComment}
                  onChangeText={onChangeComment}
                />
              </View>

              {/* Actions */}
              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.cancelBtn, { backgroundColor: colors.tertiarySystemFill }]}
                >
                  <Text style={[Typography.subheadBold, { color: colors.secondaryLabel }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSave}
                  style={[styles.saveBtn, { backgroundColor: colors.tint }]}
                >
                  <Text style={[Typography.subheadBold, { color: '#FFFFFF' }]}>
                    Save Review & Finish
                  </Text>
                </TouchableOpacity>
              </View>
            </LiquidGlass>
          </KeyboardAvoidingView>
        </View>
      </ModalDismissWrapper>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: CornerRadius.xxl,
    borderTopRightRadius: CornerRadius.xxl,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
  },
  handleRow: {
    alignItems: 'center',
    marginBottom: 10,
  },
  handleBar: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  celebrationCenter: {
    alignItems: 'center',
    marginBottom: 16,
  },
  celebrationCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pacePillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: CornerRadius.full,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  inputSection: {
    marginBottom: 20,
  },
  notesInput: {
    minHeight: 76,
    borderRadius: CornerRadius.md,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: CornerRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 2,
    height: 50,
    borderRadius: CornerRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppleTheme } from '@/hooks/useAppleTheme';
import { Typography } from '@/constants/typography';
import { CornerRadius } from '@/constants/theme';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { BookHighlight } from '@/types';
import { saveHighlight } from '@/db';

interface AddHighlightModalProps {
  visible: boolean;
  bookId: string;
  bookTitle?: string;
  initialPage?: number;
  onClose: () => void;
  onSaved: (highlight: BookHighlight) => void;
}

export const AddHighlightModal: React.FC<AddHighlightModalProps> = ({
  visible,
  bookId,
  bookTitle,
  initialPage,
  onClose,
  onSaved,
}) => {
  const { colors, isDark } = useAppleTheme();
  const [quote, setQuote] = useState('');
  const [page, setPage] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setQuote('');
      setNote('');
      setPage(initialPage ? initialPage.toString() : '');
    }
  }, [visible, initialPage]);

  const handleSave = async () => {
    const trimmedQuote = quote.trim();
    if (!trimmedQuote) {
      Alert.alert('Empty Quote', 'Please enter or paste a quote to save.');
      return;
    }

    setIsSaving(true);
    try {
      const pageNum = parseInt(page, 10);
      const newHighlight: BookHighlight = {
        id: Math.random().toString(36).substring(2, 11),
        bookId,
        quote: trimmedQuote,
        page: !isNaN(pageNum) && pageNum > 0 ? pageNum : undefined,
        note: note.trim() || undefined,
        createdAt: Date.now(),
      };

      await saveHighlight(newHighlight);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      onSaved(newHighlight);
      onClose();
    } catch (e) {
      console.error('Error saving highlight:', e);
      Alert.alert('Save Failed', 'Could not save highlight. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
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

              {/* Header */}
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.title2, { color: colors.label }]}>
                    Capture Quote
                  </Text>
                  {bookTitle && (
                    <Text style={[Typography.footnote, { color: colors.secondaryLabel, marginTop: 2 }]} numberOfLines={1}>
                      {bookTitle}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={[styles.closeBtn, { backgroundColor: colors.secondarySystemFill }]}
                >
                  <IconSymbol name="xmark" size={12} color={colors.secondaryLabel} />
                </TouchableOpacity>
              </View>

              {/* Quotation Input Field */}
              <View style={styles.inputGroup}>
                <Text style={[Typography.caption2, { color: colors.secondaryLabel, marginBottom: 6 }]}>
                  QUOTATION OR EXCERPT
                </Text>
                <TextInput
                  style={[
                    styles.quoteInput,
                    {
                      backgroundColor: colors.secondarySystemFill,
                      color: colors.label,
                    },
                  ]}
                  placeholder="Type or paste a passage that resonated..."
                  placeholderTextColor={colors.tertiaryLabel}
                  value={quote}
                  onChangeText={setQuote}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Page Number & Reflection */}
              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { width: 110 }]}>
                  <Text style={[Typography.caption2, { color: colors.secondaryLabel, marginBottom: 6 }]}>
                    PAGE (OPTIONAL)
                  </Text>
                  <TextInput
                    style={[
                      styles.pageInput,
                      {
                        backgroundColor: colors.secondarySystemFill,
                        color: colors.label,
                      },
                    ]}
                    placeholder="Page"
                    placeholderTextColor={colors.tertiaryLabel}
                    value={page}
                    onChangeText={setPage}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={[Typography.caption2, { color: colors.secondaryLabel, marginBottom: 6 }]}>
                    PERSONAL NOTE (OPTIONAL)
                  </Text>
                  <TextInput
                    style={[
                      styles.noteInput,
                      {
                        backgroundColor: colors.secondarySystemFill,
                        color: colors.label,
                      },
                    ]}
                    placeholder="Add personal takeaway or thoughts..."
                    placeholderTextColor={colors.tertiaryLabel}
                    value={note}
                    onChangeText={setNote}
                  />
                </View>
              </View>

              {/* Save Button */}
              <SpringPressable
                onPress={handleSave}
                disabled={isSaving}
                style={[styles.saveButton, { backgroundColor: colors.tint }]}
              >
                <IconSymbol name="quote.opening" size={16} color="#FFFFFF" />
                <Text style={[Typography.subheadBold, { color: '#FFFFFF', marginLeft: 6 }]}>
                  Save Quote
                </Text>
              </SpringPressable>
            </LiquidGlass>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    paddingTop: 10,
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handleBar: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginVertical: 6,
  },
  quoteInput: {
    minHeight: 110,
    borderRadius: CornerRadius.lg,
    padding: 14,
    fontSize: 16,
    lineHeight: 22,
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  pageInput: {
    height: 46,
    borderRadius: CornerRadius.md,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  noteInput: {
    height: 46,
    borderRadius: CornerRadius.md,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  saveButton: {
    flexDirection: 'row',
    height: 50,
    borderRadius: CornerRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
});

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

interface LogSessionModalProps {
  visible: boolean;
  secondsElapsed: number;
  startPageInput: string;
  endPageInput: string;
  sessionNotes: string;
  onClose: () => void;
  onChangeStartPage: (val: string) => void;
  onChangeEndPage: (val: string) => void;
  onChangeNotes: (val: string) => void;
  onSave: () => void;
}

export const LogSessionModal: React.FC<LogSessionModalProps> = ({
  visible,
  secondsElapsed,
  startPageInput,
  endPageInput,
  sessionNotes,
  onClose,
  onChangeStartPage,
  onChangeEndPage,
  onChangeNotes,
  onSave,
}) => {
  const { colors, isDark } = useAppleTheme();

  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const pages = Math.max(
    0,
    (parseInt(endPageInput, 10) || 0) - (parseInt(startPageInput, 10) || 0)
  );

  const pace =
    pages > 0 && secondsElapsed > 0
      ? (secondsElapsed / 60 / pages).toFixed(1)
      : null;

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

              {/* Header */}
              <View style={styles.headerRow}>
                <View>
                  <Text style={[Typography.title2, { color: colors.label }]}>
                    Log Reading Session
                  </Text>
                  <Text style={[Typography.subhead, { color: colors.secondaryLabel, marginTop: 2 }]}>
                    Duration: {formatTime(secondsElapsed)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={[styles.closeBtn, { backgroundColor: colors.tertiarySystemFill }]}
                >
                  <IconSymbol name="xmark" size={16} color={colors.secondaryLabel} />
                </TouchableOpacity>
              </View>

              {/* Quick Pace Summary Pill */}
              {pages > 0 && (
                <View style={[styles.summaryPill, { backgroundColor: colors.secondarySystemFill }]}>
                  <IconSymbol name="speedometer" size={16} color={colors.tint} />
                  <Text style={[Typography.footnoteBold, { color: colors.label, marginLeft: 6 }]}>
                    {pages} {pages === 1 ? 'page read' : 'pages read'}
                  </Text>
                  {pace && (
                    <Text style={[Typography.footnote, { color: colors.secondaryLabel, marginLeft: 6 }]}>
                      • {pace} min/page
                    </Text>
                  )}
                </View>
              )}

              {/* Page Range Inputs */}
              <View style={styles.inputGroup}>
                <View style={styles.inputRow}>
                  <View style={styles.inputCol}>
                    <Text style={[Typography.caption1Bold, { color: colors.secondaryLabel, marginBottom: 6 }]}>
                      START PAGE
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: colors.tertiarySystemFill,
                          color: colors.label,
                          borderColor: colors.separator,
                        },
                      ]}
                      keyboardType="number-pad"
                      value={startPageInput}
                      onChangeText={onChangeStartPage}
                      placeholder="e.g. 1"
                      placeholderTextColor={colors.tertiaryLabel}
                    />
                  </View>

                  <View style={styles.inputCol}>
                    <Text style={[Typography.caption1Bold, { color: colors.secondaryLabel, marginBottom: 6 }]}>
                      END PAGE
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: colors.tertiarySystemFill,
                          color: colors.label,
                          borderColor: colors.separator,
                        },
                      ]}
                      keyboardType="number-pad"
                      value={endPageInput}
                      onChangeText={onChangeEndPage}
                      placeholder="e.g. 25"
                      placeholderTextColor={colors.tertiaryLabel}
                    />
                  </View>
                </View>

                {/* Session Notes */}
                <View style={{ marginTop: 14 }}>
                  <Text style={[Typography.caption1Bold, { color: colors.secondaryLabel, marginBottom: 6 }]}>
                    SESSION NOTES (OPTIONAL)
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
                    multiline
                    numberOfLines={3}
                    value={sessionNotes}
                    onChangeText={onChangeNotes}
                    placeholder="Key takeaways or quotes from this session..."
                    placeholderTextColor={colors.tertiaryLabel}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.cancelButton, { backgroundColor: colors.tertiarySystemFill }]}
                >
                  <Text style={[Typography.subheadBold, { color: colors.secondaryLabel }]}>
                    Discard
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSave}
                  style={[styles.saveButton, { backgroundColor: colors.tint }]}
                >
                  <Text style={[Typography.subheadBold, { color: '#FFFFFF' }]}>
                    Save Session
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
    marginBottom: 12,
  },
  handleBar: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: CornerRadius.md,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputCol: {
    flex: 1,
  },
  textInput: {
    height: 48,
    borderRadius: CornerRadius.md,
    paddingHorizontal: 14,
    fontSize: 17,
    borderWidth: StyleSheet.hairlineWidth,
  },
  notesInput: {
    minHeight: 80,
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
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: CornerRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    flex: 2,
    height: 50,
    borderRadius: CornerRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

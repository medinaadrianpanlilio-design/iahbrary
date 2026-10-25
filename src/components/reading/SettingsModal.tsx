import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppleTheme } from '@/hooks/useAppleTheme';
import { Typography } from '@/constants/typography';
import { CornerRadius } from '@/constants/theme';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAuth } from '@/context/AuthContext';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useAppleTheme();
  const { user, username, signOut, deleteAccount } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSignOut = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          onClose();
          await signOut();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}

    Alert.alert(
      'Delete Account & Data',
      'This will permanently delete your account, saved books, reading history, and streaks. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const { error } = await deleteAccount();
            setIsDeleting(false);

            if (error) {
              Alert.alert('Error', error.message);
            } else {
              onClose();
              Alert.alert('Account Deleted', 'Your account and data have been removed.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <LiquidGlass
          variant="regular"
          intensity={95}
          cornerRadius={CornerRadius.xxl}
          style={[styles.sheet, { backgroundColor: colors.systemGroupedBackground }]}
        >
          {/* Drag Handle */}
          <View style={styles.handleRow}>
            <View style={[styles.handleBar, { backgroundColor: colors.quaternaryLabel }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[Typography.title2, { color: colors.label }]}>Settings & Account</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.closeBtn, { backgroundColor: colors.tertiarySystemFill }]}
            >
              <IconSymbol name="xmark" size={16} color={colors.secondaryLabel} />
            </TouchableOpacity>
          </View>

          {/* User Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
            <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
              <IconSymbol name="person.fill" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.profileDetails}>
              <Text style={[Typography.headline, { color: colors.label }]}>
                {username ? `@${username}` : 'Reader'}
              </Text>
              <Text style={[Typography.footnote, { color: colors.secondaryLabel, marginTop: 2 }]}>
                {user?.email || 'No email provided'}
              </Text>
            </View>
          </View>

          {/* iOS Grouped Section: ABOUT */}
          <View style={styles.section}>
            <Text style={[Typography.caption1Bold, { color: colors.secondaryLabel, marginBottom: 8, paddingHorizontal: 6 }]}>
              ABOUT & PRIVACY
            </Text>

            <View style={[styles.groupedList, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Privacy',
                    'Iahbrary stores your account and reading data in Supabase. Row Level Security restricts every profile, book, session, review, and highlight to its owner. This showcase build does not sell or share data.'
                  );
                }}
                style={styles.rowItem}
              >
                <View style={styles.rowLeft}>
                  <IconSymbol name="shield.checkmark" size={19} color={colors.tint} />
                  <Text style={[Typography.body, { color: colors.label, marginLeft: 12 }]}>
                    Privacy Policy
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={15} color={colors.tertiaryLabel} />
              </TouchableOpacity>

              <View style={[styles.separator, { backgroundColor: colors.separator }]} />

              <View style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <IconSymbol name="info.circle" size={19} color={colors.secondaryLabel} />
                  <Text style={[Typography.body, { color: colors.label, marginLeft: 12 }]}>
                    Version
                  </Text>
                </View>
                <Text style={[Typography.body, { color: colors.secondaryLabel }]}>1.0.0</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsGroup}>
            <TouchableOpacity
              onPress={handleSignOut}
              style={[styles.actionBtn, { backgroundColor: colors.secondarySystemGroupedBackground }]}
            >
              <IconSymbol name="arrow.right" size={18} color={colors.label} />
              <Text style={[Typography.body, { color: colors.label, fontWeight: '600', marginLeft: 8 }]}>
                Sign Out
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDeleteAccount}
              disabled={isDeleting}
              style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(255, 69, 58, 0.12)' : 'rgba(255, 59, 48, 0.08)' }]}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.destructive} />
              ) : (
                <>
                  <IconSymbol name="trash" size={17} color={colors.destructive} />
                  <Text style={[Typography.body, { color: colors.destructive, fontWeight: '600', marginLeft: 8 }]}>
                    Delete Account & Data
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </LiquidGlass>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: CornerRadius.xxl,
    borderTopRightRadius: CornerRadius.xxl,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
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
  header: {
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: CornerRadius.lg,
    marginBottom: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDetails: {
    marginLeft: 14,
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  groupedList: {
    borderRadius: CornerRadius.lg,
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 47,
  },
  actionsGroup: {
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: CornerRadius.lg,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: CornerRadius.lg,
  },
});

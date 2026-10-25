import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ReadingStats } from '@/types';
import { useAppleTheme } from '@/hooks/useAppleTheme';
import { Typography } from '@/constants/typography';
import { CornerRadius } from '@/constants/theme';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface ReadingHeaderProps {
  stats: ReadingStats | null;
  onOpenSettings?: () => void;
}

export const ReadingHeader: React.FC<ReadingHeaderProps> = ({ stats, onOpenSettings }) => {
  const { colors, isDark } = useAppleTheme();
  const sessionsCount = stats?.sessionsCount ?? 0;

  const handleSettingsPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onOpenSettings?.();
  };

  return (
    <View style={styles.header}>
      <View>
        <Text style={[styles.appTitle, { color: colors.label }]}>Iahbrary</Text>
        <Text style={[Typography.footnote, { color: colors.secondaryLabel, marginTop: 2 }]}>
          Daily Reading
        </Text>
      </View>

      <View style={styles.headerRight}>
        {/* Capsule Pill Badge */}
        <LiquidGlass
          variant="clear"
          intensity={60}
          cornerRadius={CornerRadius.full}
          style={styles.sessionsBadge}
        >
          <IconSymbol
            name="flame.fill"
            size={14}
            color={isDark ? '#F59E0B' : '#D97706'}
          />
          <Text style={[Typography.caption1Bold, { color: colors.label, marginLeft: 5 }]}>
            {sessionsCount} {sessionsCount === 1 ? 'Session' : 'Sessions'}
          </Text>
        </LiquidGlass>

        {/* Minimalist Gear Icon Button */}
        {onOpenSettings && (
          <TouchableOpacity
            onPress={handleSettingsPress}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <LiquidGlass
              variant="clear"
              intensity={60}
              cornerRadius={CornerRadius.full}
              style={styles.settingsBtn}
            >
              <IconSymbol name="gearshape" size={19} color={colors.secondaryLabel} />
            </LiquidGlass>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  appTitle: {
    ...Typography.largeTitle,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sessionsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppleTheme } from '@/hooks/useAppleTheme';
import { Typography } from '@/constants/typography';
import { CornerRadius } from '@/constants/theme';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface ReadingTimerCardProps {
  secondsElapsed: number;
  isRunning: boolean;
  disabled?: boolean;
  onDisabledPress?: () => void;
  onToggle: () => void;
  onFinish: () => void;
  onEnterZen: () => void;
}

export const ReadingTimerCard: React.FC<ReadingTimerCardProps> = ({
  secondsElapsed,
  isRunning,
  disabled = false,
  onDisabledPress,
  onToggle,
  onFinish,
  onEnterZen,
}) => {
  const { colors, isDark } = useAppleTheme();

  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggle = () => {
    if (disabled && onDisabledPress) {
      onDisabledPress();
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onToggle();
  };

  const handleFinish = () => {
    if (disabled && onDisabledPress) {
      onDisabledPress();
      return;
    }
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    onFinish();
  };

  const handleCardPress = () => {
    if (disabled && onDisabledPress) {
      onDisabledPress();
      return;
    }
    try {
      Haptics.selectionAsync();
    } catch {}
    onEnterZen();
  };

  return (
    <LiquidGlass
      variant="regular"
      intensity={80}
      cornerRadius={CornerRadius.xxl}
      style={styles.card}
    >
      <TouchableOpacity
        onPress={handleCardPress}
        activeOpacity={0.9}
        style={styles.touchArea}
      >
        {/* Status Pill Badge */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: isRunning
                  ? (isDark ? '#30D158' : '#34C759')
                  : colors.tertiaryLabel,
              },
            ]}
          />
          <Text
            style={[
              Typography.caption2,
              {
                color: isRunning ? colors.label : colors.secondaryLabel,
                fontWeight: '700',
                letterSpacing: 0.8,
              },
            ]}
          >
            {isRunning ? 'FOCUS ACTIVE' : 'READY TO READ'}
          </Text>
        </View>

        {/* Stopwatch Display (Tabular Figures) */}
        <Text style={[styles.timerDigits, { color: colors.label }]} numberOfLines={1}>
          {formatTime(secondsElapsed)}
        </Text>

        <Text style={[Typography.caption2, { color: colors.secondaryLabel, marginTop: -2 }]}>
          Tap to expand Zen Mode
        </Text>
      </TouchableOpacity>

      {/* Control Buttons Row */}
      <View style={styles.controlsRow}>
        {/* Play / Pause Toggle Button */}
        <TouchableOpacity
          onPress={handleToggle}
          activeOpacity={0.7}
          style={styles.controlButtonWrapper}
        >
          <LiquidGlass
            variant="clear"
            intensity={90}
            cornerRadius={CornerRadius.full}
            style={[
              styles.actionButton,
              {
                backgroundColor: isRunning
                  ? (isDark ? 'rgba(255, 159, 10, 0.2)' : 'rgba(255, 149, 0, 0.15)')
                  : (isDark ? 'rgba(48, 209, 88, 0.2)' : 'rgba(52, 199, 89, 0.15)'),
              },
            ]}
          >
            <IconSymbol
              name={isRunning ? 'pause.fill' : 'play.fill'}
              size={18}
              color={
                isRunning
                  ? (isDark ? '#FF9F0A' : '#FF9500')
                  : (isDark ? '#30D158' : '#34C759')
              }
              style={!isRunning ? { marginLeft: 2 } : undefined}
            />
            <Text
              style={[
                Typography.subheadBold,
                {
                  color: isRunning
                    ? (isDark ? '#FF9F0A' : '#FF9500')
                    : (isDark ? '#30D158' : '#34C759'),
                  marginLeft: 6,
                },
              ]}
            >
              {isRunning ? 'Pause' : 'Start'}
            </Text>
          </LiquidGlass>
        </TouchableOpacity>

        {/* Finish Session Button (shows if timer has progressed) */}
        {secondsElapsed > 0 && (
          <TouchableOpacity
            onPress={handleFinish}
            activeOpacity={0.7}
            style={styles.controlButtonWrapper}
          >
            <LiquidGlass
              variant="clear"
              intensity={90}
              cornerRadius={CornerRadius.full}
              style={[
                styles.actionButton,
                {
                  backgroundColor: isDark
                    ? 'rgba(10, 132, 255, 0.2)'
                    : 'rgba(0, 122, 255, 0.12)',
                },
              ]}
            >
              <IconSymbol
                name="checkmark"
                size={16}
                color={isDark ? '#0A84FF' : '#007AFF'}
              />
              <Text
                style={[
                  Typography.subheadBold,
                  {
                    color: isDark ? '#0A84FF' : '#007AFF',
                    marginLeft: 6,
                  },
                ]}
              >
                Log Session
              </Text>
            </LiquidGlass>
          </TouchableOpacity>
        )}
      </View>
    </LiquidGlass>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingVertical: 22,
    paddingHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  touchArea: {
    alignItems: 'center',
    width: '100%',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  timerDigits: {
    ...Typography.timerDisplay,
    marginVertical: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    width: '100%',
    justifyContent: 'center',
  },
  controlButtonWrapper: {
    flex: 1,
    maxWidth: 160,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
});

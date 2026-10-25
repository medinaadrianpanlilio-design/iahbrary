import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ReadingStats } from '@/types';
import { useAppleTheme } from '@/hooks/useAppleTheme';
import { Typography } from '@/constants/typography';
import { CornerRadius } from '@/constants/theme';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface ReadingStatsGridProps {
  sessionPace: number | null;
  bookPace: number | null;
  stats: ReadingStats | null;
}

export const ReadingStatsGrid: React.FC<ReadingStatsGridProps> = ({
  sessionPace,
  bookPace,
  stats,
}) => {
  const { colors, isDark } = useAppleTheme();

  const displaySessionPace = sessionPace != null ? `${sessionPace} min` : '—';
  const displayBookPace = bookPace != null ? `${bookPace} min` : '—';
  const totalHours = stats ? (stats.totalDurationSeconds / 3600).toFixed(1) : '0';

  return (
    <View style={styles.container}>
      {/* Left Card: Last Session Pace */}
      <LiquidGlass
        variant="regular"
        intensity={70}
        cornerRadius={CornerRadius.lg}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.2)' : 'rgba(52, 199, 89, 0.15)' }]}>
            <IconSymbol name="speedometer" size={15} color={isDark ? '#30D158' : '#34C759'} />
          </View>
          <Text style={[Typography.caption2, { color: colors.secondaryLabel }]}>
            Last Pace
          </Text>
        </View>
        <Text style={[Typography.statNumber, { color: colors.label }]}>
          {displaySessionPace}
        </Text>
        <Text style={[Typography.caption2, { color: colors.tertiaryLabel }]}>
          per page
        </Text>
      </LiquidGlass>

      {/* Right Card: Book Average Pace */}
      <LiquidGlass
        variant="regular"
        intensity={70}
        cornerRadius={CornerRadius.lg}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(10, 132, 255, 0.2)' : 'rgba(0, 122, 255, 0.12)' }]}>
            <IconSymbol name="chart.bar.xaxis" size={15} color={isDark ? '#0A84FF' : '#007AFF'} />
          </View>
          <Text style={[Typography.caption2, { color: colors.secondaryLabel }]}>
            Book Avg
          </Text>
        </View>
        <Text style={[Typography.statNumber, { color: colors.label }]}>
          {displayBookPace}
        </Text>
        <Text style={[Typography.caption2, { color: colors.tertiaryLabel }]}>
          per page
        </Text>
      </LiquidGlass>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  card: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

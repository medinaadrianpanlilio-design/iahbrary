import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppleTheme } from '@/hooks/useAppleTheme';
import { Typography } from '@/constants/typography';
import { CornerRadius } from '@/constants/theme';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SpringPressable } from '@/components/ui/SpringPressable';

interface DailyGoalRingProps {
  todayMinutes: number;
  goalMinutes?: number;
  todayPages: number;
  goalPages?: number;
  streakDays?: number;
}

interface SingleRingProps {
  size: number;
  strokeWidth: number;
  progress: number; // 0 to 1
  color: string;
  trackColor: string;
}

const SingleRing: React.FC<SingleRingProps> = ({
  size,
  strokeWidth,
  progress,
  color,
  trackColor,
}) => {
  const clamped = Math.max(0, Math.min(1, progress));
  const deg = clamped * 360;
  const halfSize = size / 2;

  // Split into first 180 deg and second 180 deg
  const rightDeg = Math.min(180, deg);
  const leftDeg = Math.max(0, deg - 180);

  return (
    <View style={[styles.ringContainer, { width: size, height: size }]}>
      {/* Background Track Circle */}
      <View
        style={[
          styles.circleBase,
          {
            width: size,
            height: size,
            borderRadius: halfSize,
            borderWidth: strokeWidth,
            borderColor: trackColor,
          },
        ]}
      />

      {/* Right Half (0 - 180 deg) */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: halfSize,
          height: size,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: size,
            height: size,
            borderRadius: halfSize,
            borderWidth: strokeWidth,
            borderColor: color,
            borderBottomColor: 'transparent',
            borderLeftColor: 'transparent',
            transform: [{ rotate: `${-45 + rightDeg}deg` }],
          }}
        />
      </View>

      {/* Left Half (180 - 360 deg) */}
      {deg > 180 && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: halfSize,
            height: size,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: size,
              height: size,
              borderRadius: halfSize,
              borderWidth: strokeWidth,
              borderColor: color,
              borderTopColor: 'transparent',
              borderRightColor: 'transparent',
              transform: [{ rotate: `${-45 + leftDeg}deg` }],
            }}
          />
        </View>
      )}
    </View>
  );
};

export const DailyGoalRing: React.FC<DailyGoalRingProps> = ({
  todayMinutes,
  goalMinutes = 30,
  todayPages,
  goalPages = 20,
  streakDays = 1,
}) => {
  const { colors, isDark } = useAppleTheme();

  const timeProgress = goalMinutes > 0 ? todayMinutes / goalMinutes : 0;
  const pagesProgress = goalPages > 0 ? todayPages / goalPages : 0;

  const timeColor = '#FA114F'; // Apple Move Red/Pink
  const timeTrackColor = isDark ? 'rgba(250, 17, 79, 0.2)' : 'rgba(250, 17, 79, 0.12)';

  const pagesColor = '#30D158'; // Apple Exercise Green
  const pagesTrackColor = isDark ? 'rgba(48, 209, 88, 0.2)' : 'rgba(48, 209, 88, 0.12)';

  const timePercent = Math.round(timeProgress * 100);
  const isGoalReached = timeProgress >= 1;

  return (
    <LiquidGlass
      variant="regular"
      intensity={80}
      cornerRadius={CornerRadius.xl}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={[Typography.caption1Bold, { color: colors.secondaryLabel }]}>
            ACTIVITY RINGS
          </Text>
          <Text style={[Typography.title3, { color: colors.label, marginTop: 2 }]}>
            Today's Progress
          </Text>
        </View>

        {isGoalReached ? (
          <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(48, 209, 88, 0.2)' : 'rgba(48, 209, 88, 0.15)' }]}>
            <IconSymbol name="checkmark.circle.fill" size={13} color={colors.success} />
            <Text style={[Typography.caption2, { color: colors.success, fontWeight: '700', marginLeft: 4 }]}>
              Goal Closed
            </Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: colors.secondarySystemFill }]}>
            <IconSymbol name="flame.fill" size={13} color={colors.tint} />
            <Text style={[Typography.caption2, { color: colors.label, fontWeight: '600', marginLeft: 4 }]}>
              {timePercent}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.contentRow}>
        {/* Concentric Activity Rings */}
        <View style={styles.ringWrapper}>
          {/* Outer Ring: Reading Minutes (Apple Move Style) */}
          <SingleRing
            size={120}
            strokeWidth={11}
            progress={timeProgress}
            color={timeColor}
            trackColor={timeTrackColor}
          />

          {/* Inner Ring: Pages Read (Apple Exercise Style) */}
          <View style={styles.innerRingOffset}>
            <SingleRing
              size={90}
              strokeWidth={9}
              progress={pagesProgress}
              color={pagesColor}
              trackColor={pagesTrackColor}
            />
          </View>

          {/* Center Activity Icon */}
          <View style={styles.centerIconWrap}>
            <IconSymbol
              name={isGoalReached ? 'star.fill' : 'flame.fill'}
              size={22}
              color={isGoalReached ? '#FFD60A' : timeColor}
            />
          </View>
        </View>

        {/* Legend Metrics */}
        <View style={styles.legendCol}>
          {/* Metric 1: Reading Minutes */}
          <View style={styles.legendItem}>
            <View style={[styles.indicatorDot, { backgroundColor: timeColor }]} />
            <View style={{ flex: 1 }}>
              <View style={styles.legendValueRow}>
                <Text style={[Typography.callout, { color: colors.label, fontWeight: '700' }]}>
                  {todayMinutes}
                </Text>
                <Text style={[Typography.caption2, { color: colors.secondaryLabel }]}>
                  /{goalMinutes} MIN
                </Text>
              </View>
              <Text style={[Typography.caption2, { color: colors.secondaryLabel }]}>
                Reading Time
              </Text>
            </View>
          </View>

          {/* Metric 2: Pages Read */}
          <View style={[styles.legendItem, { marginTop: 12 }]}>
            <View style={[styles.indicatorDot, { backgroundColor: pagesColor }]} />
            <View style={{ flex: 1 }}>
              <View style={styles.legendValueRow}>
                <Text style={[Typography.callout, { color: colors.label, fontWeight: '700' }]}>
                  {todayPages}
                </Text>
                <Text style={[Typography.caption2, { color: colors.secondaryLabel }]}>
                  /{goalPages} PGS
                </Text>
              </View>
              <Text style={[Typography.caption2, { color: colors.secondaryLabel }]}>
                Pages Explored
              </Text>
            </View>
          </View>

          {/* Streak Indicator */}
          <View style={[styles.streakPill, { backgroundColor: colors.secondarySystemFill }]}>
            <IconSymbol name="sparkles" size={12} color={colors.tint} />
            <Text style={[Typography.caption2, { color: colors.label, fontWeight: '600', marginLeft: 5 }]}>
              {streakDays > 1 ? `${streakDays} Day Reading Streak` : 'Consistency Builder'}
            </Text>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleGroup: {
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: CornerRadius.full,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  ringWrapper: {
    width: 120,
    height: 120,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBase: {
    position: 'absolute',
  },
  innerRingOffset: {
    position: 'absolute',
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerIconWrap: {
    position: 'absolute',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendCol: {
    flex: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  indicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: CornerRadius.full,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
});

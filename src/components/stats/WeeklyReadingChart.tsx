import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format, isSameDay, subDays, startOfWeek, addDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useAppleTheme } from '@/hooks/useAppleTheme';
import { Typography } from '@/constants/typography';
import { CornerRadius } from '@/constants/theme';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { ReadingSession } from '@/types';

interface WeeklyReadingChartProps {
  sessions: ReadingSession[];
}

type MetricMode = 'TIME' | 'PAGES';

export const WeeklyReadingChart: React.FC<WeeklyReadingChartProps> = ({ sessions }) => {
  const { colors, isDark } = useAppleTheme();
  const [metricMode, setMetricMode] = useState<MetricMode>('TIME');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(6); // Default to today (last day)

  // Generate the 7 days of the current week (Monday through Sunday)
  const days = useMemo(() => {
    const today = new Date();
    // Monday as start of week
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return {
        date,
        dayLetter: format(date, 'EEEEE'), // Single letter M, T, W, T, F, S, S
        dayNumber: format(date, 'd'),
        isToday: isSameDay(date, today),
      };
    });
  }, []);

  // Aggregate reading minutes and pages for each day of the week
  const dayStats = useMemo(() => {
    return days.map((day) => {
      let minutes = 0;
      let pages = 0;

      sessions.forEach((s) => {
        const sessionDate = new Date(s.startTime);
        if (isSameDay(sessionDate, day.date)) {
          minutes += Math.round(s.durationSeconds / 60);
          pages += s.pagesRead;
        }
      });

      return {
        ...day,
        minutes,
        pages,
      };
    });
  }, [days, sessions]);

  // Max values for relative scaling (minimum scale bar height 40m or 30 pgs for good visual balance)
  const maxVal = useMemo(() => {
    if (metricMode === 'TIME') {
      const maxMin = Math.max(...dayStats.map((d) => d.minutes), 40);
      return maxMin;
    } else {
      const maxPages = Math.max(...dayStats.map((d) => d.pages), 30);
      return maxPages;
    }
  }, [dayStats, metricMode]);

  // Week totals & daily average
  const totalWeekMinutes = useMemo(
    () => dayStats.reduce((sum, d) => sum + d.minutes, 0),
    [dayStats]
  );
  const totalWeekPages = useMemo(
    () => dayStats.reduce((sum, d) => sum + d.pages, 0),
    [dayStats]
  );

  const activeDaysCount = useMemo(
    () => dayStats.filter((d) => (metricMode === 'TIME' ? d.minutes > 0 : d.pages > 0)).length || 1,
    [dayStats, metricMode]
  );

  const dailyAverage = useMemo(() => {
    if (metricMode === 'TIME') {
      return Math.round(totalWeekMinutes / 7);
    } else {
      return Math.round(totalWeekPages / 7);
    }
  }, [totalWeekMinutes, totalWeekPages, metricMode]);

  const selectedDay = dayStats[selectedDayIndex] || dayStats[dayStats.length - 1];

  const formatHoursMinutes = (totalMins: number) => {
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const handleSelectDay = (index: number) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setSelectedDayIndex(index);
  };

  return (
    <LiquidGlass
      variant="regular"
      intensity={80}
      cornerRadius={CornerRadius.xl}
      style={styles.card}
    >
      {/* Top Header: Title & Metric Toggle Pill */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[Typography.caption1Bold, { color: colors.secondaryLabel }]}>
            WEEKLY ACTIVITY
          </Text>
          <Text style={[Typography.title3, { color: colors.label, marginTop: 2 }]}>
            Reading Velocity
          </Text>
        </View>

        {/* Apple Segmented Pill */}
        <View style={[styles.modeToggle, { backgroundColor: colors.secondarySystemFill }]}>
          <TouchableOpacity
            onPress={() => {
              try {
                Haptics.selectionAsync();
              } catch {}
              setMetricMode('TIME');
            }}
            style={[
              styles.modeBtn,
              metricMode === 'TIME' && [
                styles.modeBtnActive,
                { backgroundColor: colors.secondarySystemGroupedBackground },
              ],
            ]}
          >
            <Text
              style={[
                Typography.caption2,
                {
                  color: metricMode === 'TIME' ? colors.label : colors.secondaryLabel,
                  fontWeight: metricMode === 'TIME' ? '700' : '500',
                },
              ]}
            >
              Time
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              try {
                Haptics.selectionAsync();
              } catch {}
              setMetricMode('PAGES');
            }}
            style={[
              styles.modeBtn,
              metricMode === 'PAGES' && [
                styles.modeBtnActive,
                { backgroundColor: colors.secondarySystemGroupedBackground },
              ],
            ]}
          >
            <Text
              style={[
                Typography.caption2,
                {
                  color: metricMode === 'PAGES' ? colors.label : colors.secondaryLabel,
                  fontWeight: metricMode === 'PAGES' ? '700' : '500',
                },
              ]}
            >
              Pages
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary KPI Banner */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCol}>
          <Text style={[Typography.caption2, { color: colors.secondaryLabel }]}>TOTAL THIS WEEK</Text>
          <Text style={[Typography.title2, { color: colors.label, fontWeight: '700', marginTop: 2 }]}>
            {metricMode === 'TIME' ? formatHoursMinutes(totalWeekMinutes) : `${totalWeekPages} pgs`}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.separator }]} />
        <View style={styles.summaryCol}>
          <Text style={[Typography.caption2, { color: colors.secondaryLabel }]}>DAILY AVERAGE</Text>
          <Text style={[Typography.title2, { color: colors.tint, fontWeight: '700', marginTop: 2 }]}>
            {metricMode === 'TIME' ? `${dailyAverage}m/day` : `${dailyAverage} pgs/day`}
          </Text>
        </View>
      </View>

      {/* Inspection Tooltip Banner for Selected Day */}
      <View style={[styles.inspectorPill, { backgroundColor: colors.secondarySystemFill }]}>
        <View style={styles.inspectorLeft}>
          <Text style={[Typography.caption2, { color: colors.secondaryLabel }]}>
            {format(selectedDay.date, 'EEEE, MMM d')}
            {selectedDay.isToday ? ' (Today)' : ''}
          </Text>
        </View>
        <View style={styles.inspectorRight}>
          <IconSymbol
            name={metricMode === 'TIME' ? 'clock.fill' : 'book.fill'}
            size={12}
            color={metricMode === 'TIME' ? colors.tint : colors.success}
          />
          <Text style={[Typography.subheadBold, { color: colors.label, marginLeft: 4 }]}>
            {metricMode === 'TIME'
              ? formatHoursMinutes(selectedDay.minutes)
              : `${selectedDay.pages} pages`}
          </Text>
        </View>
      </View>

      {/* 7-Day Apple Health Bar Columns */}
      <View style={styles.chartContainer}>
        {dayStats.map((item, index) => {
          const val = metricMode === 'TIME' ? item.minutes : item.pages;
          const heightPercent = Math.min(100, Math.max(val > 0 ? 8 : 2, (val / maxVal) * 100));
          const isSelected = selectedDayIndex === index;

          const barColor =
            val === 0
              ? colors.quaternaryLabel
              : metricMode === 'TIME'
              ? colors.tint
              : colors.success;

          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              onPress={() => handleSelectDay(index)}
              style={styles.dayColumn}
            >
              {/* Bar Track & Fill */}
              <View
                style={[
                  styles.barTrack,
                  { backgroundColor: colors.secondarySystemFill },
                  isSelected && {
                    borderColor: colors.tint,
                    borderWidth: 1.5,
                  },
                ]}
              >
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${heightPercent}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>

              {/* Day Number */}
              <Text
                style={[
                  Typography.caption2,
                  {
                    color: isSelected ? colors.label : colors.tertiaryLabel,
                    fontWeight: isSelected ? '700' : '500',
                    marginTop: 6,
                  },
                ]}
              >
                {item.dayNumber}
              </Text>

              {/* Day Letter */}
              <View
                style={[
                  styles.dayLetterWrap,
                  item.isToday && [styles.todayBadge, { backgroundColor: colors.tint }],
                ]}
              >
                <Text
                  style={[
                    Typography.caption2,
                    {
                      color: item.isToday
                        ? '#FFFFFF'
                        : isSelected
                        ? colors.label
                        : colors.secondaryLabel,
                      fontWeight: item.isToday || isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {item.dayLetter}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
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
  },
  modeToggle: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: CornerRadius.full,
  },
  modeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: CornerRadius.full,
  },
  modeBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingBottom: 14,
  },
  summaryCol: {
    flex: 1,
  },
  divider: {
    width: 1,
    height: 28,
    marginHorizontal: 16,
  },
  inspectorPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: CornerRadius.md,
    marginBottom: 16,
  },
  inspectorLeft: {
    flex: 1,
  },
  inspectorRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 4,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: 22,
    height: 90,
    borderRadius: 11,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: '100%',
    borderRadius: 11,
  },
  dayLetterWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  todayBadge: {
    borderRadius: 11,
  },
});

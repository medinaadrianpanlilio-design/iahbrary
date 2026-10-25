import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import { useAppleTheme } from '@/hooks/useAppleTheme';
import { Typography } from '@/constants/typography';
import { CornerRadius } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SpringPressable } from '@/components/ui/SpringPressable';

interface SwipeableBookCardProps {
  children: React.ReactNode;
  onUpdatePage: () => void;
  onDelete: () => void;
  onReadNow?: () => void;
  onPressCard?: () => void;
}

export const SwipeableBookCard: React.FC<SwipeableBookCardProps> = ({
  children,
  onUpdatePage,
  onDelete,
  onReadNow,
  onPressCard,
}) => {
  const { colors, isDark } = useAppleTheme();
  const swipeableRef = useRef<Swipeable>(null);

  const close = () => {
    swipeableRef.current?.close();
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const trans1 = dragX.interpolate({
      inputRange: [-160, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    });
    const trans2 = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.rightActionsContainer}>
        {/* Bookmark / Page Action (iOS Blue) */}
        <Animated.View style={[styles.actionBtnWrap, { transform: [{ translateX: trans1 }] }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              close();
              onUpdatePage();
            }}
            style={[styles.actionButton, { backgroundColor: colors.tint }]}
          >
            <IconSymbol name="bookmark.fill" size={20} color="#FFFFFF" />
            <Text style={[Typography.caption2, styles.actionText]}>Page</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Delete Action (Apple Destructive Red) */}
        <Animated.View style={[styles.actionBtnWrap, { transform: [{ translateX: trans2 }] }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              close();
              onDelete();
            }}
            style={[styles.actionButton, { backgroundColor: colors.destructive }]}
          >
            <IconSymbol name="trash.fill" size={20} color="#FFFFFF" />
            <Text style={[Typography.caption2, styles.actionText]}>Remove</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    if (!onReadNow) return null;
    const trans = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [-80, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.leftActionsContainer}>
        <Animated.View style={[styles.actionBtnWrap, { transform: [{ translateX: trans }] }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              close();
              onReadNow();
            }}
            style={[styles.actionButton, { backgroundColor: colors.success }]}
          >
            <IconSymbol name="play.fill" size={20} color="#FFFFFF" />
            <Text style={[Typography.caption2, styles.actionText]}>Read</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Swipeable
        ref={swipeableRef}
        friction={2}
        overshootRight={false}
        overshootLeft={false}
        rightThreshold={40}
        leftThreshold={40}
        onSwipeableWillOpen={() => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {}
        }}
        renderRightActions={renderRightActions}
        renderLeftActions={onReadNow ? renderLeftActions : undefined}
      >
        <SpringPressable
          scaleTo={0.98}
          onPress={onPressCard}
          style={styles.cardPressable}
        >
          {children}
        </SpringPressable>
      </Swipeable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
    borderRadius: CornerRadius.xl,
    overflow: 'hidden',
  },
  cardPressable: {
    width: '100%',
  },
  rightActionsContainer: {
    flexDirection: 'row',
    width: 150,
    alignItems: 'stretch',
    marginBottom: 2,
  },
  leftActionsContainer: {
    flexDirection: 'row',
    width: 80,
    alignItems: 'stretch',
    marginBottom: 2,
  },
  actionBtnWrap: {
    flex: 1,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 4,
  },
});

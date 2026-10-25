import React, { useEffect } from 'react';
import { StyleSheet, Dimensions, View, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useAppleTheme } from '@/hooks/useAppleTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LiquidGlassBackgroundProps {
  variant?: 'appleAmbient' | 'mint' | 'darkForest';
}

export const LiquidGlassBackground: React.FC<LiquidGlassBackgroundProps> = ({
  variant = 'appleAmbient',
}) => {
  const { isDark } = useAppleTheme();

  // Animated positions for ambient liquid glass blobs (Green & Purple interplay)
  const b1X = useSharedValue(SCREEN_WIDTH * 0.05);
  const b1Y = useSharedValue(SCREEN_HEIGHT * 0.08);

  const b2X = useSharedValue(SCREEN_WIDTH * 0.45);
  const b2Y = useSharedValue(SCREEN_HEIGHT * 0.35);

  const b3X = useSharedValue(SCREEN_WIDTH * 0.15);
  const b3Y = useSharedValue(SCREEN_HEIGHT * 0.65);

  const b4X = useSharedValue(SCREEN_WIDTH * 0.5);
  const b4Y = useSharedValue(SCREEN_HEIGHT * 0.75);

  useEffect(() => {
    const duration = 14000;

    // Blob 1: Green (Top-Left movement)
    b1X.value = withRepeat(
      withTiming(SCREEN_WIDTH * 0.4, { duration, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    b1Y.value = withRepeat(
      withTiming(SCREEN_HEIGHT * 0.28, { duration: duration * 1.15, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Blob 2: Purple (Upper-Right movement)
    b2X.value = withRepeat(
      withTiming(SCREEN_WIDTH * 0.1, { duration: duration * 1.1, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    b2Y.value = withRepeat(
      withTiming(SCREEN_HEIGHT * 0.2, { duration: duration * 0.95, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Blob 3: Mint/Teal (Lower-Left movement)
    b3X.value = withRepeat(
      withTiming(SCREEN_WIDTH * 0.5, { duration: duration * 1.25, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    b3Y.value = withRepeat(
      withTiming(SCREEN_HEIGHT * 0.5, { duration: duration * 0.85, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Blob 4: Lavender/Violet (Bottom-Right movement)
    b4X.value = withRepeat(
      withTiming(SCREEN_WIDTH * 0.15, { duration: duration * 1.3, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    b4Y.value = withRepeat(
      withTiming(SCREEN_HEIGHT * 0.6, { duration: duration * 1.05, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateX: b1X.value }, { translateY: b1Y.value }],
  }));

  const animStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateX: b2X.value }, { translateY: b2Y.value }],
  }));

  const animStyle3 = useAnimatedStyle(() => ({
    transform: [{ translateX: b3X.value }, { translateY: b3Y.value }],
  }));

  const animStyle4 = useAnimatedStyle(() => ({
    transform: [{ translateX: b4X.value }, { translateY: b4Y.value }],
  }));

  // Sophisticated Green & Purple Liquid Glass palette
  // Light Mode: Subtle pastel mint green & radiant soft lavender purple
  // Dark Mode: Deep midnight with luminous emerald & royal purple refractions
  const bgColor = isDark ? '#080A0E' : '#F6F8F7';

  // Green Blobs
  const greenBlob1 = isDark
    ? 'rgba(16, 185, 129, 0.24)' // Emerald
    : 'rgba(52, 199, 89, 0.26)'; // Apple Mint Green

  const greenBlob2 = isDark
    ? 'rgba(5, 150, 105, 0.20)' // Deep Sage
    : 'rgba(167, 243, 208, 0.40)'; // Light Spring Mint

  // Purple Blobs
  const purpleBlob1 = isDark
    ? 'rgba(147, 51, 234, 0.24)' // Royal Purple
    : 'rgba(168, 85, 247, 0.26)'; // Iris Purple

  const purpleBlob2 = isDark
    ? 'rgba(124, 58, 237, 0.20)' // Electric Violet
    : 'rgba(216, 180, 254, 0.38)'; // Soft Lavender

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: bgColor, overflow: 'hidden' }]}
    >
      {/* 1. Green Fluid Blob (Top-Left) */}
      <Animated.View
        style={[
          styles.blob,
          {
            width: 380,
            height: 380,
            borderRadius: 190,
            backgroundColor: greenBlob1,
            top: -80,
            left: -80,
          },
          animStyle1,
        ]}
      />

      {/* 2. Purple Fluid Blob (Upper-Right) */}
      <Animated.View
        style={[
          styles.blob,
          {
            width: 420,
            height: 420,
            borderRadius: 210,
            backgroundColor: purpleBlob1,
            top: SCREEN_HEIGHT * 0.15,
            right: -100,
          },
          animStyle2,
        ]}
      />

      {/* 3. Mint Fluid Blob (Lower-Left) */}
      <Animated.View
        style={[
          styles.blob,
          {
            width: 360,
            height: 360,
            borderRadius: 180,
            backgroundColor: greenBlob2,
            bottom: SCREEN_HEIGHT * 0.18,
            left: -60,
          },
          animStyle3,
        ]}
      />

      {/* 4. Lavender / Violet Fluid Blob (Bottom-Right) */}
      <Animated.View
        style={[
          styles.blob,
          {
            width: 390,
            height: 390,
            borderRadius: 195,
            backgroundColor: purpleBlob2,
            bottom: -60,
            right: -60,
          },
          animStyle4,
        ]}
      />

      {/* Heavy Frost / Blur Overlay that diffuses and refracts them into Liquid Glass */}
      <BlurView
        pointerEvents="none"
        intensity={Platform.OS === 'ios' ? 70 : 85}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    opacity: 0.85,
  },
});

export default LiquidGlassBackground;

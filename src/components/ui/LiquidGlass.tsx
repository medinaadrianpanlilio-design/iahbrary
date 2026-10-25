import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  ViewProps,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppleTheme } from '@/hooks/useAppleTheme';

// Attempt to load native expo-glass-effect dynamically without breaking Expo Go
let NativeGlassView: any = null;
let nativeIsLiquidGlassAvailable = false;

try {
  const glassEffect = require('expo-glass-effect');
  if (glassEffect && typeof glassEffect.isLiquidGlassAvailable === 'function') {
    nativeIsLiquidGlassAvailable = glassEffect.isLiquidGlassAvailable();
  }
  if (nativeIsLiquidGlassAvailable && glassEffect.GlassView) {
    NativeGlassView = glassEffect.GlassView;
  }
} catch {
  // Gracefully fallback for Expo Go / non-iOS 26
  nativeIsLiquidGlassAvailable = false;
  NativeGlassView = null;
}

export interface LiquidGlassProps extends ViewProps {
  /**
   * The glass variant to apply.
   * 'regular': Standard Apple frosted material
   * 'clear': High-translucency glass
   * 'none': Transparent
   */
  variant?: 'regular' | 'clear' | 'none';

  /**
   * Blur intensity for the fallback layer (0-100). Default is 80.
   */
  intensity?: number;

  /**
   * Color scheme for the glass effect. Defaults to the active theme.
   */
  colorScheme?: 'light' | 'dark' | 'auto';

  /**
   * Whether the glass should respond interactively to touches.
   */
  interactive?: boolean;

  /**
   * Optional corner radius convenience property.
   */
  cornerRadius?: number;

  /**
   * Optional custom border color for the specular glass edge.
   */
  borderColor?: string;

  /**
   * Children rendered inside the glass container.
   */
  children?: React.ReactNode;
}

/**
 * LiquidGlass component
 *
 * Automatically renders Apple's official iOS 26+ native UIGlassEffect via `expo-glass-effect`
 * when running an EAS Development Build on iOS 26+.
 *
 * Seamlessly falls back to an Apple HIG specular BlurView in Expo Go on Windows and earlier
 * iOS versions, ensuring 100% development stability without losing visual polish.
 */
export const LiquidGlass: React.FC<LiquidGlassProps> = ({
  variant = 'regular',
  intensity = 80,
  colorScheme = 'auto',
  interactive = false,
  cornerRadius,
  borderColor,
  style,
  children,
  ...restProps
}) => {
  const { isDark } = useAppleTheme();
  const effectiveScheme = colorScheme === 'auto' ? (isDark ? 'dark' : 'light') : colorScheme;

  // Compute container shape styles
  const shapeStyle: ViewStyle = useMemo(() => {
    const s: ViewStyle = {};
    if (cornerRadius !== undefined) {
      s.borderRadius = cornerRadius;
    }
    return s;
  }, [cornerRadius]);

  // Default specular hairline border matching Apple HIG
  const defaultBorderColor = isDark
    ? 'rgba(255, 255, 255, 0.14)'
    : 'rgba(255, 255, 255, 0.65)';

  // If native Liquid Glass is available at runtime (iOS 26+ native dev build)
  if (nativeIsLiquidGlassAvailable && NativeGlassView && Platform.OS === 'ios') {
    return (
      <NativeGlassView
        glassEffectStyle={variant}
        isInteractive={interactive}
        colorScheme={effectiveScheme}
        style={[styles.baseContainer, shapeStyle, style]}
        {...restProps}
      >
        {children}
      </NativeGlassView>
    );
  }

  // Fallback: Apple HIG Specular BlurView with subtle hairline edge
  return (
    <View
      style={[
        styles.baseContainer,
        {
          borderColor: borderColor ?? defaultBorderColor,
          borderWidth: StyleSheet.hairlineWidth,
        },
        shapeStyle,
        style,
      ]}
      {...restProps}
    >
      <BlurView
        pointerEvents="none"
        intensity={variant === 'clear' ? 45 : intensity}
        tint={effectiveScheme === 'dark' ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          styles.overlayTint,
          {
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.03)'
              : 'rgba(255, 255, 255, 0.25)',
          },
        ]}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  overlayTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default LiquidGlass;

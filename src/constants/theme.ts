import '@/global.css';
import { Platform } from 'react-native';

/**
 * Apple Human Interface Guidelines Design Tokens
 * Full support for dynamic Light & Dark mode.
 */

export const AppleColors = {
  light: {
    systemBackground: '#FFFFFF',
    secondarySystemBackground: '#F2F2F7',
    tertiarySystemBackground: '#FFFFFF',
    systemGroupedBackground: '#F2F2F7',
    secondarySystemGroupedBackground: '#FFFFFF',
    tertiarySystemGroupedBackground: '#F2F2F7',

    // Labels
    label: '#000000',
    secondaryLabel: 'rgba(60, 60, 67, 0.60)',
    tertiaryLabel: 'rgba(60, 60, 67, 0.30)',
    quaternaryLabel: 'rgba(60, 60, 67, 0.18)',

    // Fills
    systemFill: 'rgba(120, 120, 128, 0.20)',
    secondarySystemFill: 'rgba(120, 120, 128, 0.16)',
    tertiarySystemFill: 'rgba(118, 118, 128, 0.12)',
    quaternarySystemFill: 'rgba(116, 116, 128, 0.08)',

    // Separators
    separator: 'rgba(60, 60, 67, 0.29)',
    opaqueSeparator: '#C6C6C8',

    // Tint & Semantic Colors
    tint: '#007AFF',
    readingAccent: '#1B5E20',
    readingAccentLight: '#E8F5E9',
    success: '#34C759',
    warning: '#FF9500',
    destructive: '#FF3B30',

    // Glass & Card
    cardBackground: 'rgba(255, 255, 255, 0.72)',
    cardBorder: 'rgba(255, 255, 255, 0.60)',
    cardShadow: 'rgba(0, 0, 0, 0.06)',
    tabBarBackground: 'rgba(255, 255, 255, 0.78)',
  },
  dark: {
    systemBackground: '#000000',
    secondarySystemBackground: '#1C1C1E',
    tertiarySystemBackground: '#2C2C2E',
    systemGroupedBackground: '#000000',
    secondarySystemGroupedBackground: '#1C1C1E',
    tertiarySystemGroupedBackground: '#2C2C2E',

    // Labels
    label: '#FFFFFF',
    secondaryLabel: 'rgba(235, 235, 245, 0.60)',
    tertiaryLabel: 'rgba(235, 235, 245, 0.30)',
    quaternaryLabel: 'rgba(235, 235, 245, 0.16)',

    // Fills
    systemFill: 'rgba(120, 120, 128, 0.36)',
    secondarySystemFill: 'rgba(120, 120, 128, 0.32)',
    tertiarySystemFill: 'rgba(118, 118, 128, 0.24)',
    quaternarySystemFill: 'rgba(116, 116, 128, 0.18)',

    // Separators
    separator: 'rgba(84, 84, 88, 0.65)',
    opaqueSeparator: '#38383A',

    // Tint & Semantic Colors
    tint: '#0A84FF',
    readingAccent: '#4ADE80',
    readingAccentLight: '#052E16',
    success: '#30D158',
    warning: '#FF9F0A',
    destructive: '#FF453A',

    // Glass & Card
    cardBackground: 'rgba(28, 28, 30, 0.72)',
    cardBorder: 'rgba(255, 255, 255, 0.12)',
    cardShadow: 'rgba(0, 0, 0, 0.40)',
    tabBarBackground: 'rgba(28, 28, 30, 0.78)',
  },
} as const;

// Backward compatibility with previous Colors object
export const Colors = {
  light: {
    text: AppleColors.light.label,
    background: AppleColors.light.systemBackground,
    backgroundElement: AppleColors.light.secondarySystemBackground,
    backgroundSelected: AppleColors.light.tertiarySystemBackground,
    textSecondary: AppleColors.light.secondaryLabel,
  },
  dark: {
    text: AppleColors.dark.label,
    background: AppleColors.dark.systemBackground,
    backgroundElement: AppleColors.dark.secondarySystemBackground,
    backgroundSelected: AppleColors.dark.tertiarySystemBackground,
    textSecondary: AppleColors.dark.secondaryLabel,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  // Named scale
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,

  // Legacy numeric word aliases for template components
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const CornerRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  full: 9999,
} as const;

export const Shadows = {
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  cover: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 84, android: 80 }) ?? 84;
export const MaxContentWidth = 800;

import { StyleSheet, Platform, TextStyle } from 'react-native';

/**
 * Apple Human Interface Guidelines Typography Scale
 * Uses SF Pro (system font on iOS) with proper optical sizes, weights, and letter spacings.
 */

const systemFontFamily = Platform.select({
  ios: 'System',
  default: 'System',
});

export const Typography = StyleSheet.create({
  largeTitle: {
    fontFamily: systemFontFamily,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    letterSpacing: 0.37,
  } as TextStyle,

  title1: {
    fontFamily: systemFontFamily,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: 0.36,
  } as TextStyle,

  title2: {
    fontFamily: systemFontFamily,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: 0.35,
  } as TextStyle,

  title3: {
    fontFamily: systemFontFamily,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600',
    letterSpacing: 0.38,
  } as TextStyle,

  headline: {
    fontFamily: systemFontFamily,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.41,
  } as TextStyle,

  body: {
    fontFamily: systemFontFamily,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: -0.41,
  } as TextStyle,

  callout: {
    fontFamily: systemFontFamily,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400',
    letterSpacing: -0.32,
  } as TextStyle,

  subhead: {
    fontFamily: systemFontFamily,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
    letterSpacing: -0.24,
  } as TextStyle,

  subheadBold: {
    fontFamily: systemFontFamily,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.24,
  } as TextStyle,

  footnote: {
    fontFamily: systemFontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    letterSpacing: -0.08,
  } as TextStyle,

  footnoteBold: {
    fontFamily: systemFontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.08,
  } as TextStyle,

  caption1: {
    fontFamily: systemFontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    letterSpacing: 0,
  } as TextStyle,

  caption1Bold: {
    fontFamily: systemFontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0,
  } as TextStyle,

  caption2: {
    fontFamily: systemFontFamily,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '400',
    letterSpacing: 0.07,
  } as TextStyle,

  timerDisplay: {
    fontFamily: systemFontFamily,
    fontSize: 52,
    lineHeight: 58,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.5,
  } as TextStyle,

  statNumber: {
    fontFamily: systemFontFamily,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  } as TextStyle,
});

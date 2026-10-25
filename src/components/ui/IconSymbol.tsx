import React from 'react';
import { Platform, StyleProp, ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SFSymbol } from 'sf-symbols-typescript';

let NativeSymbolView: any = null;
try {
  const symbols = require('expo-symbols');
  if (symbols?.SymbolView && Platform.OS === 'ios') {
    NativeSymbolView = symbols.SymbolView;
  }
} catch {
  NativeSymbolView = null;
}

// Mapping of SF Symbol names to Ionicons equivalents for Android/Web/Fallback
const SF_TO_IONICONS_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  'book.fill': 'book',
  'book': 'book-outline',
  'bookmark.fill': 'bookmark',
  'bookmark': 'bookmark-outline',
  'books.vertical.fill': 'library',
  'books.vertical': 'library-outline',
  'magnifyingglass': 'search-outline',
  'chart.bar.xaxis': 'bar-chart-outline',
  'chart.bar.fill': 'bar-chart',
  'play.fill': 'play',
  'pause.fill': 'pause',
  'gearshape.fill': 'settings',
  'gearshape': 'settings-outline',
  'plus': 'add',
  'plus.circle.fill': 'add-circle',
  'minus': 'remove',
  'star.fill': 'star',
  'star': 'star-outline',
  'checkmark': 'checkmark',
  'checkmark.circle.fill': 'checkmark-circle',
  'xmark': 'close',
  'xmark.circle.fill': 'close-circle',
  'flame.fill': 'flame',
  'clock.fill': 'time',
  'clock': 'time-outline',
  'timer': 'stopwatch-outline',
  'speedometer': 'speedometer-outline',
  'arrow.right': 'arrow-forward',
  'arrow.left': 'arrow-back',
  'chevron.right': 'chevron-forward',
  'chevron.down': 'chevron-down',
  'trash': 'trash-outline',
  'pencil': 'pencil',
  'sparkles': 'sparkles',
  'heart.fill': 'heart',
  'person': 'person-outline',
  'person.fill': 'person',
  'person.crop.circle': 'person-circle-outline',
  'envelope': 'mail-outline',
  'lock': 'lock-closed-outline',
  'eye': 'eye-outline',
  'eye.slash': 'eye-off-outline',
  'square.and.arrow.up': 'share-outline',
  'shield.checkmark': 'shield-checkmark-outline',
  'info.circle': 'information-circle-outline',
  'ellipsis.horizontal': 'ellipsis-horizontal',
  'trophy.fill': 'trophy',
  'arrow.counterclockwise': 'refresh',
  'slider.horizontal.3': 'options-outline',
};

export interface IconSymbolProps {
  name: SFSymbol | string;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<any>;
  weight?: 'light' | 'regular' | 'medium' | 'semibold' | 'bold';
}

export const IconSymbol: React.FC<IconSymbolProps> = ({
  name,
  size = 22,
  color = '#000000',
  style,
  weight = 'regular',
}) => {
  // If native SF Symbols are available on iOS
  if (NativeSymbolView && Platform.OS === 'ios') {
    return (
      <NativeSymbolView
        name={name as SFSymbol}
        size={size}
        tintColor={color}
        weight={weight}
        style={[{ width: size, height: size }, style]}
      />
    );
  }

  // Cross-platform Ionicons fallback
  const ioniconName =
    SF_TO_IONICONS_MAP[name] ||
    (Ionicons.glyphMap[name as keyof typeof Ionicons.glyphMap]
      ? (name as keyof typeof Ionicons.glyphMap)
      : 'ellipse-outline');

  return (
    <Ionicons
      name={ioniconName}
      size={size}
      color={color as string}
      style={style}
    />
  );
};

export default IconSymbol;

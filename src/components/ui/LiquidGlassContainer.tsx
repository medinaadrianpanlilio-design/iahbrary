import React from 'react';
import { View, ViewProps } from 'react-native';

let NativeGlassContainer: any = null;
try {
  const glassEffect = require('expo-glass-effect');
  if (glassEffect && glassEffect.isLiquidGlassAvailable?.() && glassEffect.GlassContainer) {
    NativeGlassContainer = glassEffect.GlassContainer;
  }
} catch {
  NativeGlassContainer = null;
}

export const LiquidGlassContainer: React.FC<ViewProps> = ({ children, style, ...props }) => {
  if (NativeGlassContainer) {
    return (
      <NativeGlassContainer style={style} {...props}>
        {children}
      </NativeGlassContainer>
    );
  }

  return (
    <View style={style} {...props}>
      {children}
    </View>
  );
};

export default LiquidGlassContainer;

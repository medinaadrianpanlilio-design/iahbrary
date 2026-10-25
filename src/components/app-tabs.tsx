import React from 'react';
import { StyleSheet, Platform, View } from 'react-native';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAppleTheme } from '@/hooks/useAppleTheme';
import { Typography } from '@/constants/typography';
import { CornerRadius } from '@/constants/theme';

export default function AppTabs() {
  const { isDark, colors } = useAppleTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.systemBackground },
        tabBarActiveTintColor: colors.label,
        tabBarInactiveTintColor: colors.secondaryLabel,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 20,
          right: 20,
          height: 68,
          borderRadius: CornerRadius.xxl,
          backgroundColor: 'transparent',
          borderWidth: 0,
          borderTopWidth: 0,
          elevation: 0,
          paddingBottom: Platform.OS === 'ios' ? 8 : 6,
          paddingTop: 6,
          overflow: 'hidden',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.45 : 0.12,
          shadowRadius: 20,
        },
        tabBarBackground: () => (
          <LiquidGlass
            variant="regular"
            intensity={95}
            cornerRadius={CornerRadius.xxl}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarLabelStyle: {
          ...Typography.caption2,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
      screenListeners={{
        tabPress: () => {
          try {
            Haptics.selectionAsync();
          } catch {}
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Reading',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(0, 0, 0, 0.07)',
                },
              ]}
            >
              <IconSymbol
                name={focused ? 'book.fill' : 'book'}
                size={21}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(0, 0, 0, 0.07)',
                },
              ]}
            >
              <IconSymbol
                name={focused ? 'books.vertical.fill' : 'books.vertical'}
                size={21}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(0, 0, 0, 0.07)',
                },
              ]}
            >
              <IconSymbol
                name="magnifyingglass"
                size={21}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(0, 0, 0, 0.07)',
                },
              ]}
            >
              <IconSymbol
                name={focused ? 'chart.bar.fill' : 'chart.bar.xaxis'}
                size={21}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

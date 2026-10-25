import { useColorScheme } from 'react-native';
import { AppleColors } from '@/constants/theme';

export function useAppleTheme() {
  const systemScheme = useColorScheme();
  const isDark = systemScheme === 'dark';
  const scheme = isDark ? 'dark' : 'light';
  const colors = AppleColors[scheme];

  return {
    scheme,
    isDark,
    colors,
  };
}

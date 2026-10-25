export type ThemeMode = 'midnight' | 'editorial' | 'indigo';

export interface ThemeColors {
  mode: ThemeMode;
  name: string;
  icon?: string;
  background: string;
  surface: string;
  surfaceSecondary: string;
  border: string;
  text: string;
  textMuted: string;
  textDim: string;
  primary: string;
  primaryLight: string;
  accent: string;
  badgeBg: string;
  cardShadow: string;
  progressTrack: string;
  timerBg: string;
}

export const THEMES: Record<ThemeMode, ThemeColors> = {
  midnight: {
    mode: 'midnight',
    name: 'Midnight',
    icon: 'moon.fill',
    background: '#0B0C10',
    surface: '#181B26',
    surfaceSecondary: '#242838',
    border: 'transparent',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    textDim: '#64748B',
    primary: '#F59E0B',
    primaryLight: '#FDE68A',
    accent: '#10B981',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    cardShadow: 'rgba(0, 0, 0, 0.35)',
    progressTrack: 'rgba(255, 255, 255, 0.08)',
    timerBg: '#14172150',
  },
  editorial: {
    mode: 'editorial',
    name: 'Editorial',
    icon: 'leaf.fill',
    background: '#86D99B',
    surface: 'rgba(255, 255, 255, 0.45)',
    surfaceSecondary: 'rgba(255, 255, 255, 0.70)',
    border: 'transparent',
    text: '#0E381E',
    textMuted: '#2D6A4F',
    textDim: '#407D5E',
    primary: '#0E381E',
    primaryLight: '#34D399',
    accent: '#0E381E',
    badgeBg: 'rgba(255, 255, 255, 0.75)',
    cardShadow: 'rgba(0, 0, 0, 0.04)',
    progressTrack: 'rgba(0, 0, 0, 0.09)',
    timerBg: '#FFFFFF',
  },
  indigo: {
    mode: 'indigo',
    name: 'Focus Slate',
    icon: 'bolt.fill',
    background: '#EEF2F6',
    surface: '#FFFFFF',
    surfaceSecondary: '#F1F5F9',
    border: 'transparent',
    text: '#0F172A',
    textMuted: '#64748B',
    textDim: '#94A3B8',
    primary: '#4F46E5',
    primaryLight: '#818CF8',
    accent: '#EA580C',
    badgeBg: 'rgba(79, 70, 229, 0.1)',
    cardShadow: 'rgba(15, 23, 42, 0.12)',
    progressTrack: 'rgba(0, 0, 0, 0.06)',
    timerBg: '#E8EDF5',
  },
};

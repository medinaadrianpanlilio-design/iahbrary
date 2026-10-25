import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppleTheme } from '@/hooks/useAppleTheme';
import { Typography } from '@/constants/typography';
import { CornerRadius } from '@/constants/theme';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { IconSymbol } from '@/components/ui/IconSymbol';

import { soundscapeManager, SoundscapeType, SOUNDSCAPE_TRACKS } from '@/services/soundscapes';
import { AddHighlightModal } from '@/components/highlights/AddHighlightModal';

interface ZenModeOverlayProps {
  visible: boolean;
  secondsElapsed: number;
  isRunning: boolean;
  bookId?: string;
  bookTitle?: string;
  currentPage?: number;
  totalPages?: number;
  onToggle: () => void;
  onExit: () => void;
  onFinish: () => void;
}

export const ZenModeOverlay: React.FC<ZenModeOverlayProps> = ({
  visible,
  secondsElapsed,
  isRunning,
  bookId,
  bookTitle,
  currentPage = 0,
  totalPages = 1,
  onToggle,
  onExit,
  onFinish,
}) => {
  const { isDark } = useAppleTheme();
  const [activeSoundscape, setActiveSoundscape] = useState<SoundscapeType>('off');
  const [soundVolume, setSoundVolume] = useState(0.6);
  const [addQuoteVisible, setAddQuoteVisible] = useState(false);
  const contentOpacityAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.94)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      contentOpacityAnim.setValue(0);
      contentScaleAnim.setValue(0.94);

      Animated.parallel([
        Animated.timing(contentOpacityAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(contentScaleAnim, {
          toValue: 1,
          friction: 9,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (visible && isRunning) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 2500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      animation?.stop();
    };
  }, [visible, isRunning]);

  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggle = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onToggle();
  };

  useEffect(() => {
    const unsub = soundscapeManager.subscribe((state) => {
      setActiveSoundscape(state.current);
      setSoundVolume(state.volume);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!visible) {
      soundscapeManager.pause();
    } else if (isRunning) {
      soundscapeManager.resume();
    } else {
      soundscapeManager.pause();
    }
  }, [visible, isRunning]);

  const handleSelectSoundscape = (type: SoundscapeType) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    soundscapeManager.setSoundscape(type);
  };

  const handleFinish = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    soundscapeManager.stop();
    onFinish();
    onExit();
  };

  const handleExit = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    soundscapeManager.stop();
    onExit();
  };

  const progressPercent = Math.min(
    100,
    Math.round((currentPage / Math.max(totalPages, 1)) * 100)
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={handleExit}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Subtle Ambient Glass Background */}
        <LiquidGlass
          variant="regular"
          intensity={95}
          colorScheme="dark"
          style={StyleSheet.absoluteFill}
        />

        {/* Top Header Controls */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleExit}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <LiquidGlass
              variant="clear"
              intensity={60}
              cornerRadius={CornerRadius.full}
              style={styles.circleBtn}
            >
              <IconSymbol name="chevron.down" size={18} color="#FFFFFF" />
            </LiquidGlass>
          </TouchableOpacity>

          <View style={styles.focusPill}>
            <View style={[styles.pulseDot, { backgroundColor: isRunning ? '#30D158' : '#FF9F0A' }]} />
            <Text style={[Typography.caption2, { color: '#FFFFFF', fontWeight: '700', letterSpacing: 1 }]}>
              {isRunning ? 'ZEN READING' : 'PAUSED'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleFinish}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <LiquidGlass
              variant="clear"
              intensity={60}
              cornerRadius={CornerRadius.full}
              style={styles.doneBtn}
            >
              <Text style={[Typography.subheadBold, { color: '#FFFFFF' }]}>Done</Text>
            </LiquidGlass>
          </TouchableOpacity>
        </View>

        {/* Center Timer Focus */}
        <Animated.View
          style={[
            styles.centerSection,
            {
              opacity: contentOpacityAnim,
              transform: [{ scale: contentScaleAnim }],
            },
          ]}
        >
          {bookTitle && (
            <Text style={[Typography.headline, { color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', marginBottom: 12, paddingHorizontal: 32 }]} numberOfLines={2}>
              {bookTitle}
            </Text>
          )}

          {/* Pulsing Timer Circle */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              onPress={handleToggle}
              activeOpacity={0.85}
            >
              <LiquidGlass
                variant="regular"
                intensity={85}
                colorScheme="dark"
                cornerRadius={120}
                style={styles.timerCircle}
              >
                <Text style={styles.timerNumber}>{formatTime(secondsElapsed)}</Text>
                <View style={styles.tapPrompt}>
                  <IconSymbol
                    name={isRunning ? 'pause.fill' : 'play.fill'}
                    size={15}
                    color="rgba(255, 255, 255, 0.6)"
                  />
                  <Text style={[Typography.caption2, { color: 'rgba(255, 255, 255, 0.6)', marginLeft: 5 }]}>
                    {isRunning ? 'Tap to pause' : 'Tap to resume'}
                  </Text>
                </View>
              </LiquidGlass>
            </TouchableOpacity>
          </Animated.View>

          {/* Ambient Soundscape Controls */}
          <View style={styles.soundscapeDock}>
            <View style={styles.soundscapeHeader}>
              <IconSymbol
                name={activeSoundscape === 'off' ? 'speaker.slash.fill' : 'speaker.wave.2.fill'}
                size={13}
                color={activeSoundscape === 'off' ? 'rgba(255, 255, 255, 0.4)' : '#30D158'}
              />
              <Text style={[Typography.caption2, { color: 'rgba(255, 255, 255, 0.6)', marginLeft: 6, fontWeight: '600' }]}>
                AMBIENT FOCUS
              </Text>
            </View>

            <View style={styles.soundscapePillsRow}>
              {(
                [
                  { key: 'off', label: 'Off' },
                  { key: 'rain', label: 'Rain' },
                  { key: 'library', label: 'Library' },
                  { key: 'fireplace', label: 'Fire' },
                  { key: 'brownnoise', label: 'Noise' },
                ] as const
              ).map((item) => {
                const isSelected = activeSoundscape === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => handleSelectSoundscape(item.key)}
                    style={[
                      styles.soundscapePill,
                      isSelected && styles.soundscapePillActive,
                    ]}
                  >
                    <Text
                      style={[
                        Typography.caption2,
                        {
                          color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)',
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* In-Session Quick Quote Capture */}
          {bookId && (
            <TouchableOpacity
              onPress={() => {
                try {
                  Haptics.selectionAsync();
                } catch {}
                setAddQuoteVisible(true);
              }}
              style={styles.quoteCaptureBtn}
            >
              <LiquidGlass
                variant="clear"
                intensity={50}
                cornerRadius={CornerRadius.full}
                style={styles.quoteCaptureGlass}
              >
                <IconSymbol name="quote.opening" size={13} color="#FFFFFF" />
                <Text style={[Typography.caption2, { color: '#FFFFFF', marginLeft: 6, fontWeight: '600' }]}>
                  Capture Quote
                </Text>
              </LiquidGlass>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Bottom Progress Bar */}
        <View style={styles.bottomBar}>
          <View style={styles.progressInfo}>
            <Text style={[Typography.caption2, { color: 'rgba(255, 255, 255, 0.6)' }]}>
              Page {currentPage} of {totalPages}
            </Text>
            <Text style={[Typography.caption2, { color: '#FFFFFF', fontWeight: '600' }]}>
              {progressPercent}%
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* In-Session Add Quote Sheet */}
        {bookId && (
          <AddHighlightModal
            visible={addQuoteVisible}
            bookId={bookId}
            bookTitle={bookTitle}
            initialPage={currentPage}
            onClose={() => setAddQuoteVisible(false)}
            onSaved={() => {
              try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch {}
            }}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090A0E',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  circleBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  focusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: CornerRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 7,
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCircle: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  timerNumber: {
    fontFamily: Platform.select({ ios: 'System', default: 'System' }),
    fontSize: 54,
    lineHeight: 62,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.5,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tapPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  bottomBar: {
    gap: 8,
    paddingHorizontal: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2.5,
    backgroundColor: '#30D158',
  },
  soundscapeDock: {
    alignItems: 'center',
    marginTop: 22,
  },
  soundscapeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  soundscapePillsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: CornerRadius.full,
    padding: 3,
  },
  soundscapePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: CornerRadius.full,
  },
  soundscapePillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  quoteCaptureBtn: {
    marginTop: 16,
  },
  quoteCaptureGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
});

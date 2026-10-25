import { Platform } from 'react-native';
import { createAudioPlayer, AudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';

export type SoundscapeType = 'off' | 'rain' | 'library' | 'fireplace' | 'brownnoise';

export interface SoundscapeTrack {
  id: SoundscapeType;
  title: string;
  description: string;
  icon: string;
}

export const SOUNDSCAPE_TRACKS: Record<Exclude<SoundscapeType, 'off'>, SoundscapeTrack> = {
  rain: {
    id: 'rain',
    title: 'Gentle Rain',
    description: 'Soft rhythmic raindrops against glass',
    icon: 'cloud.rain.fill',
  },
  library: {
    id: 'library',
    title: 'Quiet Library',
    description: 'Warm room ambience with quiet acoustics',
    icon: 'books.vertical.fill',
  },
  fireplace: {
    id: 'fireplace',
    title: 'Campfire Hearth',
    description: 'Subtle glowing crackle and warmth',
    icon: 'flame.fill',
  },
  brownnoise: {
    id: 'brownnoise',
    title: 'Brown Noise',
    description: 'Deep low-frequency focus sound',
    icon: 'waveform',
  },
};

// Pass require() results directly — expo-audio resolves local assets internally
const AUDIO_SOURCES: Record<Exclude<SoundscapeType, 'off'>, number> = {
  rain: require('../../assets/audio/rain.wav'),
  library: require('../../assets/audio/library.wav'),
  fireplace: require('../../assets/audio/fireplace.wav'),
  brownnoise: require('../../assets/audio/brownnoise.wav'),
};

type SoundscapeListener = (state: {
  current: SoundscapeType;
  isPlaying: boolean;
  volume: number;
}) => void;

class SoundscapeManager {
  private current: SoundscapeType = 'off';
  private volume: number = 0.6;
  private isPlaying: boolean = false;
  private listeners: Set<SoundscapeListener> = new Set();
  private audioModeConfigured: boolean = false;

  // Player instance
  private player: AudioPlayer | null = null;
  // Web fallback if needed
  private webAudio: HTMLAudioElement | null = null;

  constructor() {
    this.initAudioMode();
  }

  private async initAudioMode() {
    if (this.audioModeConfigured || Platform.OS === 'web') return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'mixWithOthers',
      });
      await setIsAudioActiveAsync(true);
      this.audioModeConfigured = true;
    } catch (err) {
      console.warn('Soundscape audio mode config notice:', err);
    }
  }

  private notify() {
    const state = {
      current: this.current,
      isPlaying: this.isPlaying,
      volume: this.volume,
    };
    this.listeners.forEach((fn) => fn(state));
  }

  public subscribe(listener: SoundscapeListener): () => void {
    this.listeners.add(listener);
    listener({
      current: this.current,
      isPlaying: this.isPlaying,
      volume: this.volume,
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getCurrentSoundscape(): SoundscapeType {
    return this.current;
  }

  public getVolume(): number {
    return this.volume;
  }

  public isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  public async setSoundscape(type: SoundscapeType): Promise<void> {
    if (this.current === type && this.isPlaying) return;

    // Stop current track
    this.stopCurrent();

    this.current = type;

    if (type === 'off') {
      this.isPlaying = false;
      this.notify();
      return;
    }

    await this.initAudioMode();

    const source = AUDIO_SOURCES[type];
    if (!source) return;

    try {
      if (Platform.OS === 'web') {
        // Web: try expo-audio first, fall back to HTMLAudioElement
        try {
          this.player = createAudioPlayer(source);
          this.player.loop = true;
          this.player.volume = this.volume;
          this.player.play();
          this.isPlaying = true;
        } catch {
          if (typeof Audio !== 'undefined') {
            const assetUri =
              typeof source === 'string'
                ? source
                : ((source as any)?.default ?? (source as any)?.uri ?? '');
            if (assetUri) {
              this.webAudio = new Audio(assetUri);
              this.webAudio.loop = true;
              this.webAudio.volume = this.volume;
              await this.webAudio.play();
              this.isPlaying = true;
            }
          }
        }
      } else {
        // Native (iOS & Android) — expo-audio resolves the require() asset internally
        this.player = createAudioPlayer(source);
        this.player.loop = true;
        this.player.volume = this.volume;
        this.player.addListener('playbackStatusUpdate', (status: any) => {
          if (status?.error) {
            console.warn('Soundscape playback error:', status.error);
          }
        });
        this.player.play();
        this.isPlaying = true;
      }
    } catch (e) {
      console.warn('Soundscape play failed:', e);
      this.isPlaying = false;
    }

    this.notify();
  }

  public pause(): void {
    if (!this.isPlaying) return;

    try {
      if (this.player) {
        this.player.pause();
      }
      if (this.webAudio) {
        this.webAudio.pause();
      }
    } catch (e) {
      console.warn('Soundscape pause error:', e);
    }
    this.isPlaying = false;
    this.notify();
  }

  public resume(): void {
    if (this.current === 'off' || this.isPlaying) return;

    try {
      if (this.player) {
        this.player.play();
        this.isPlaying = true;
      } else if (this.webAudio) {
        this.webAudio.play();
        this.isPlaying = true;
      } else {
        this.setSoundscape(this.current);
      }
    } catch (e) {
      console.warn('Soundscape resume error:', e);
    }
    this.notify();
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume = clamped;

    try {
      if (this.player) {
        this.player.volume = clamped;
      }
      if (this.webAudio) {
        this.webAudio.volume = clamped;
      }
    } catch (e) {
      console.warn('Soundscape set volume error:', e);
    }
    this.notify();
  }

  public stop(): void {
    this.stopCurrent();
    this.current = 'off';
    this.isPlaying = false;
    this.notify();
  }

  private stopCurrent(): void {
    try {
      if (this.player) {
        this.player.pause();
        this.player.remove();
        this.player = null;
      }
      if (this.webAudio) {
        this.webAudio.pause();
        this.webAudio.currentTime = 0;
        this.webAudio = null;
      }
    } catch (e) {
      console.warn('Soundscape stop error:', e);
    }
  }
}

export const soundscapeManager = new SoundscapeManager();

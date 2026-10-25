import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export interface UseReadingTimerResult {
  /** Display seconds elapsed, calculated continuously */
  secondsElapsed: number;
  /** Whether the timer is currently actively running */
  isRunning: boolean;
  /** Epoch timestamp (ms) when the current reading session began */
  sessionStartTime: number | null;
  /** Start or resume the timer */
  start: () => void;
  /** Pause the timer (accumulates paused duration) */
  pause: () => void;
  /** Toggle running state */
  toggle: () => void;
  /** Stop and finalize the session, returning exact elapsed duration in seconds */
  stop: () => number;
  /** Reset all timer state back to zero */
  reset: () => void;
}

/**
 * useReadingTimer
 *
 * Background-resilient reading timer.
 * DO NOT use setInterval as the source of truth for elapsed time!
 *
 * Accuracy Model:
 *   - startedAt: epoch timestamp when session was first started.
 *   - totalPausedMs: accumulated milliseconds spent paused.
 *   - lastPausedAt: epoch timestamp when current pause began (if currently paused).
 *
 * When app goes to background or phone locks:
 *   - Active reading time is computed via: Math.floor((now - startedAt - totalPausedMs) / 1000).
 *   - When app returns to foreground (AppState change), timer immediately recalibrates.
 */
export function useReadingTimer(): UseReadingTimerResult {
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const startedAtRef = useRef<number | null>(null);
  const totalPausedMsRef = useRef<number>(0);
  const lastPausedAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Calculate current elapsed reading seconds using timestamps */
  const computeElapsedSeconds = useCallback((): number => {
    if (!startedAtRef.current) return 0;

    let now = Date.now();
    let pausedMs = totalPausedMsRef.current;

    // If currently paused, include time since pause began
    if (lastPausedAtRef.current !== null) {
      pausedMs += now - lastPausedAtRef.current;
    }

    const elapsedMs = Math.max(0, now - startedAtRef.current - pausedMs);
    return Math.floor(elapsedMs / 1000);
  }, []);

  /** Synchronize state display with timestamp truth */
  const syncTimer = useCallback(() => {
    setSecondsElapsed(computeElapsedSeconds());
  }, [computeElapsedSeconds]);

  const start = useCallback(() => {
    const now = Date.now();
    if (startedAtRef.current === null) {
      // Starting fresh session
      startedAtRef.current = now;
      totalPausedMsRef.current = 0;
      lastPausedAtRef.current = null;
    } else if (lastPausedAtRef.current !== null) {
      // Resuming from pause: accumulate paused duration
      totalPausedMsRef.current += now - lastPausedAtRef.current;
      lastPausedAtRef.current = null;
    }

    setIsRunning(true);
    syncTimer();
  }, [syncTimer]);

  const pause = useCallback(() => {
    if (startedAtRef.current !== null && lastPausedAtRef.current === null) {
      lastPausedAtRef.current = Date.now();
    }
    setIsRunning(false);
    syncTimer();
  }, [syncTimer]);

  const toggle = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, pause, start]);

  const stop = useCallback((): number => {
    const finalSeconds = computeElapsedSeconds();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    return finalSeconds;
  }, [computeElapsedSeconds]);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startedAtRef.current = null;
    totalPausedMsRef.current = 0;
    lastPausedAtRef.current = null;
    setIsRunning(false);
    setSecondsElapsed(0);
  }, []);

  // UI display tick: only drives visual re-renders, not the time calculation itself
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(syncTimer, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, syncTimer]);

  // Recalibrate on AppState change (e.g. unlocking device, returning from background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        syncTimer();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [syncTimer]);

  return {
    secondsElapsed,
    isRunning,
    sessionStartTime: startedAtRef.current,
    start,
    pause,
    toggle,
    stop,
    reset,
  };
}

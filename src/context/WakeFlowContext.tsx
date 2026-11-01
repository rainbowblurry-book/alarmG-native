import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AppState } from 'react-native';
import * as Alarm from '../../modules/clockguard-alarm';
import type { AlarmState } from '../../modules/clockguard-alarm';

/**
 * Mirrors the native alarm engine's state (modules/clockguard-alarm) into React.
 * Native is the source of truth for armed/ringing/snoozed; this only re-reads it
 * on start, on every native change event, and whenever the app comes to the
 * foreground. Movement progress is UI-only and resets on every new ring.
 */

const BASE_SNOOZE_SECONDS = 300; // 5 minutes
const MIN_SNOOZE_SECONDS = 20; // cruelty-mode floor

/** Length of the NEXT snooze. Cruelty mode halves it after every snooze, floor 20 s. */
export function snoozeDurationSeconds(snoozeCount: number, crueltyModeEnabled: boolean): number {
  if (!crueltyModeEnabled) return BASE_SNOOZE_SECONDS;
  return Math.max(MIN_SNOOZE_SECONDS, Math.floor(BASE_SNOOZE_SECONDS / 2 ** snoozeCount));
}

type WakeFlowContextType = {
  alarm: AlarmState;
  movementProgress: number;
  incrementMovement: (max: number) => void;
  /** Returns null on success, or a plain-language reason why the alarm was NOT armed. */
  arm: (hour: number, minute: number, days: number[]) => string | null;
  cancelAlarm: () => void;
  /** Returns null on success, or why the snooze failed (the alarm keeps ringing). */
  snooze: (seconds: number) => string | null;
  disarm: () => void;
  refresh: () => void;
  // TESTING-ONLY START
  scheduleTestRing: (delaySeconds: number) => string | null;
  cancelTestRing: () => void;
  stopTestRing: () => void;
  // TESTING-ONLY END
};

export const WakeFlowContext = createContext<WakeFlowContextType | undefined>(undefined);

export function WakeFlowProvider({ children }: { children: ReactNode }) {
  const [alarm, setAlarm] = useState<AlarmState>(() => Alarm.getState());
  const [movementProgress, setMovementProgress] = useState(0);
  const lastRingStartRef = useRef(alarm.ringStartedAt);

  const refresh = useCallback(() => setAlarm(Alarm.getState()), []);

  useEffect(() => {
    const sub = Alarm.addStateListener(setAlarm);
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    refresh();
    return () => {
      sub.remove();
      appSub.remove();
    };
  }, [refresh]);

  // A new ring (fresh or after a snooze) restarts the movement mission.
  useEffect(() => {
    if (alarm.state === 'ringing' && alarm.ringStartedAt !== lastRingStartRef.current) {
      setMovementProgress(0);
    }
    lastRingStartRef.current = alarm.ringStartedAt;
  }, [alarm.state, alarm.ringStartedAt]);

  const incrementMovement = useCallback((max: number) => {
    setMovementProgress((p) => Math.min(p + 1, max));
  }, []);

  const arm = useCallback((hour: number, minute: number, days: number[]) => {
    try {
      Alarm.arm(hour, minute, days);
      return null;
    } catch (e) {
      return Alarm.describeEngineError(e);
    } finally {
      refresh();
    }
  }, [refresh]);

  const cancelAlarm = useCallback(() => {
    Alarm.cancel();
    refresh();
  }, [refresh]);

  const snooze = useCallback((seconds: number) => {
    try {
      Alarm.snooze(seconds);
      return null;
    } catch (e) {
      return Alarm.describeEngineError(e);
    } finally {
      refresh();
    }
  }, [refresh]);

  const disarm = useCallback(() => {
    Alarm.disarm();
    setMovementProgress(0);
    refresh();
  }, [refresh]);

  // TESTING-ONLY START
  const scheduleTestRing = useCallback((delaySeconds: number) => {
    try {
      Alarm.scheduleTestRing(delaySeconds);
      return null;
    } catch (e) {
      return Alarm.describeEngineError(e);
    } finally {
      refresh();
    }
  }, [refresh]);

  const cancelTestRing = useCallback(() => {
    Alarm.cancelTestRing();
    refresh();
  }, [refresh]);

  const stopTestRing = useCallback(() => {
    Alarm.stopTestRing();
    setMovementProgress(0);
    refresh();
  }, [refresh]);
  // TESTING-ONLY END

  return (
    <WakeFlowContext.Provider
      value={{
        alarm,
        movementProgress,
        incrementMovement,
        arm,
        cancelAlarm,
        snooze,
        disarm,
        refresh,
        // TESTING-ONLY START
        scheduleTestRing,
        cancelTestRing,
        stopTestRing,
        // TESTING-ONLY END
      }}
    >
      {children}
    </WakeFlowContext.Provider>
  );
}

export function useWakeFlow() {
  const context = useContext(WakeFlowContext);
  if (context === undefined) {
    throw new Error('useWakeFlow must be used within a WakeFlowProvider');
  }
  return context;
}

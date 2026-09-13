import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useSettings } from './SettingsContext';

export type WakeFlowStatus = 'idle' | 'ringing' | 'snoozed';

const BASE_SNOOZE_SECONDS = 300; // 5 minutes
const MIN_SNOOZE_SECONDS = 20; // cruelty mode floor, mirrors the original web app's spec

export type WakeFlowState = {
  status: WakeFlowStatus;
  movementProgress: number;
  snoozeSecondsRemaining: number;
  snoozeCount: number;
  currentSnoozeDurationSeconds: number;
};

const DEFAULT_WAKE_FLOW: WakeFlowState = {
  status: 'idle',
  movementProgress: 0,
  snoozeSecondsRemaining: 0,
  snoozeCount: 0,
  currentSnoozeDurationSeconds: BASE_SNOOZE_SECONDS,
};

type WakeFlowContextType = {
  wakeFlow: WakeFlowState;
  startPreview: () => void;
  dismissWake: () => void;
  incrementMovement: (max: number) => void;
  startSnooze: () => void;
  decrementSnooze: () => void;
  returnToRingingFromSnooze: () => void;
};

const WakeFlowContext = createContext<WakeFlowContextType | undefined>(undefined);

export function WakeFlowProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [wakeFlow, setWakeFlow] = useState<WakeFlowState>(DEFAULT_WAKE_FLOW);

  const startPreview = () => {
    setWakeFlow({
      status: 'ringing',
      movementProgress: 0,
      snoozeSecondsRemaining: 0,
      snoozeCount: 0,
      currentSnoozeDurationSeconds: BASE_SNOOZE_SECONDS,
    });
  };

  const dismissWake = () => {
    setWakeFlow({
      status: 'idle',
      movementProgress: 0,
      snoozeSecondsRemaining: 0,
      snoozeCount: 0,
      currentSnoozeDurationSeconds: BASE_SNOOZE_SECONDS,
    });
  };

  const incrementMovement = (max: number) => {
    setWakeFlow((prev) => ({
      ...prev,
      movementProgress: Math.min(prev.movementProgress + 1, max),
    }));
  };

  // Cruelty mode: every successive snooze in the same ring cycle halves the
  // previous duration (floor of MIN_SNOOZE_SECONDS), mirroring the original
  // web prototype's "crueltyMode" behavior. Off (default): always BASE_SNOOZE_SECONDS.
  const startSnooze = () => {
    setWakeFlow((prev) => {
      const nextCount = prev.snoozeCount + 1;
      let duration = BASE_SNOOZE_SECONDS;

      if (settings.crueltyModeEnabled && prev.snoozeCount > 0) {
        duration = Math.max(MIN_SNOOZE_SECONDS, Math.floor(prev.currentSnoozeDurationSeconds / 2));
      }

      return {
        ...prev,
        status: 'snoozed',
        snoozeCount: nextCount,
        currentSnoozeDurationSeconds: duration,
        snoozeSecondsRemaining: duration,
      };
    });
  };

  const decrementSnooze = () => {
    setWakeFlow((prev) => {
      if (prev.status !== 'snoozed') {
        return prev;
      }

      const next = Math.max(0, prev.snoozeSecondsRemaining - 1);

      return {
        ...prev,
        snoozeSecondsRemaining: next,
      };
    });
  };

  const returnToRingingFromSnooze = () => {
    setWakeFlow((prev) => ({
      ...prev,
      status: 'ringing',
      movementProgress: 0,
      snoozeSecondsRemaining: 0,
    }));
  };

  return (
    <WakeFlowContext.Provider
      value={{
        wakeFlow,
        startPreview,
        dismissWake,
        incrementMovement,
        startSnooze,
        decrementSnooze,
        returnToRingingFromSnooze,
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

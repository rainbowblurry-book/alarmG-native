import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useSettings } from './SettingsContext';
import { setLockScreenBypassEnabled } from '../native/lockScreenBypass';


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
  const { settings, updateSettings } = useSettings();
  const [wakeFlow, setWakeFlow] = useState<WakeFlowState>(DEFAULT_WAKE_FLOW);
  const isFirstBypassSyncRef = useRef(true);

  // LockScreenBypass sync: ON only while ringing/snoozed, OFF otherwise.
  // The first 'idle' run on mount is skipped on purpose: when the native alarm
  // auto-launches the app, MainActivity has already turned the bypass ON
  // (AlarmLaunchHelper) before JS loads; turning it OFF here would drop the app
  // behind the lock screen for a moment before ringing starts.
  useEffect(() => {
    if (isFirstBypassSyncRef.current) {
      isFirstBypassSyncRef.current = false;
      if (wakeFlow.status === 'idle') return;
    }
    setLockScreenBypassEnabled(wakeFlow.status !== 'idle');
  }, [wakeFlow.status]);


  const startPreview = () => {
    setWakeFlow({
      status: 'ringing',
      movementProgress: 0,
      snoozeSecondsRemaining: 0,
      snoozeCount: 0,
      currentSnoozeDurationSeconds: BASE_SNOOZE_SECONDS,
    });
  };


  // Disarm (correct barcode) or dev Exit Preview: back to idle AND back to
  // "ready to arm". Setting isArmed=false makes App.tsx cancel the native alarm
  // (including the next repeat day the receiver already scheduled), so the user
  // arms again each night, like a one-shot alarm.
  const dismissWake = () => {
    setWakeFlow({
      status: 'idle',
      movementProgress: 0,
      snoozeSecondsRemaining: 0,
      snoozeCount: 0,
      currentSnoozeDurationSeconds: BASE_SNOOZE_SECONDS,
    });
    updateSettings({ isArmed: false });
  };


  const incrementMovement = (max: number) => {
    setWakeFlow((prev) => ({
      ...prev,
      movementProgress: Math.min(prev.movementProgress + 1, max),
    }));
  };


  // Cruelty mode: every successive snooze halves the previous duration
  // (floor MIN_SNOOZE_SECONDS). Off (default): always BASE_SNOOZE_SECONDS.
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

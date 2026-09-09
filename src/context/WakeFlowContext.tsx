import React, { createContext, useContext, useState, ReactNode } from 'react';

export type WakeFlowStatus = 'idle' | 'ringing' | 'snoozed';

export type WakeFlowState = {
  status: WakeFlowStatus;
  movementProgress: number;
  snoozeSecondsRemaining: number;
};

const DEFAULT_WAKE_FLOW: WakeFlowState = {
  status: 'idle',
  movementProgress: 0,
  snoozeSecondsRemaining: 0,
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
  const [wakeFlow, setWakeFlow] = useState<WakeFlowState>(DEFAULT_WAKE_FLOW);

  const startPreview = () => {
    setWakeFlow({
      status: 'ringing',
      movementProgress: 0,
      snoozeSecondsRemaining: 0,
    });
  };

  const dismissWake = () => {
    setWakeFlow({
      status: 'idle',
      movementProgress: 0,
      snoozeSecondsRemaining: 0,
    });
  };

  const incrementMovement = (max: number) => {
    setWakeFlow((prev) => ({
      ...prev,
      movementProgress: Math.min(prev.movementProgress + 1, max),
    }));
  };

  const startSnooze = () => {
    setWakeFlow((prev) => ({
      ...prev,
      status: 'snoozed',
      snoozeSecondsRemaining: 300,
    }));
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
    setWakeFlow({
      status: 'ringing',
      movementProgress: 0,
      snoozeSecondsRemaining: 0,
    });
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
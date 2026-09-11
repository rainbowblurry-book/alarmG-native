import React, { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { WakeFlowProvider, useWakeFlow } from './src/context/WakeFlowContext';
import RingingScreen from './src/screens/RingingScreen';
import {
  ensureAlarmPermissions,
  setupAlarmChannel,
  scheduleAlarmNotification,
  cancelScheduledAlarm,
} from './src/services/alarmScheduler';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function useForegroundAlarmTrigger() {
  const { settings } = useSettings();
  const { wakeFlow, startPreview } = useWakeFlow();
  const lastFiredMinuteRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      if (wakeFlow.status !== 'idle') return;
      if (!settings.isArmed) return;

      const now = new Date();
      const currentDay = now.getDay();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentEpochMinute = Math.floor(now.getTime() / 60000);

      const dayMatches = settings.repeatDays.includes(currentDay);

      if (
        dayMatches &&
        currentHour === settings.alarmHour &&
        currentMinute === settings.alarmMinute &&
        lastFiredMinuteRef.current !== currentEpochMinute
      ) {
        lastFiredMinuteRef.current = currentEpochMinute;
        startPreview();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [wakeFlow.status, settings.isArmed, settings.alarmHour, settings.alarmMinute, settings.repeatDays]);
}

function useBackgroundAlarmScheduler() {
  const { settings } = useSettings();

  useEffect(() => {
    (async () => {
      await ensureAlarmPermissions();
      await setupAlarmChannel();
    })();
  }, []);

  useEffect(() => {
    if (settings.isArmed) {
      scheduleAlarmNotification(
        settings.alarmHour,
        settings.alarmMinute,
        settings.repeatDays,
        settings.wakeItemName
      );
    } else {
      cancelScheduledAlarm();
    }
  }, [settings.isArmed, settings.alarmHour, settings.alarmMinute, settings.repeatDays, settings.wakeItemName]);
}

function useNotificationResponseListener() {
  const { wakeFlow, startPreview } = useWakeFlow();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      if (wakeFlow.status === 'idle') {
        startPreview();
      }
    });

    return () => subscription.remove();
  }, [wakeFlow.status]);
}

function RootContent() {
  const { wakeFlow } = useWakeFlow();
  useForegroundAlarmTrigger();
  useBackgroundAlarmScheduler();
  useNotificationResponseListener();

  if (wakeFlow.status === 'ringing' || wakeFlow.status === 'snoozed') {
    return <RingingScreen />;
  }

  return (
    <NavigationContainer theme={DarkTheme}>
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <WakeFlowProvider>
          <RootContent />
        </WakeFlowProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

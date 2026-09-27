import React, { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import {
  useFonts as usePlusJakartaSans,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts as useSyne, Syne_700Bold, Syne_800ExtraBold } from '@expo-google-fonts/syne';
import { useFonts as useOrbitron, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { useFonts as useComfortaa, Comfortaa_700Bold } from '@expo-google-fonts/comfortaa';
import { useFonts as useCinzel, Cinzel_700Bold } from '@expo-google-fonts/cinzel';
import AppNavigator from './src/navigation/AppNavigator';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { WakeFlowProvider, useWakeFlow } from './src/context/WakeFlowContext';
import { ThemeProvider } from './src/context/ThemeContext';
import RingingScreen from './src/screens/RingingScreen';
import {
  ensureAlarmPermissions,
  setupAlarmChannel,
  scheduleAlarmNotification,
  cancelScheduledAlarm,
  dismissAlarmNotification,
  ALARM_NOTIFICATION_ID,
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
  const handledColdStartRef = useRef(false);

  useEffect(() => {
    if (handledColdStartRef.current) return;
    handledColdStartRef.current = true;

    Notifications.getLastNotificationResponseAsync().then((response) => {
      const isAlarmNotification = response?.notification.request.identifier === ALARM_NOTIFICATION_ID;
      const wasTapped = response?.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER;

      if (isAlarmNotification && wasTapped && wakeFlow.status === 'idle') {
        startPreview();
      }
      if (isAlarmNotification) {
        dismissAlarmNotification();
      }
      Notifications.clearLastNotificationResponseAsync();
    });
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const isAlarmNotification = response.notification.request.identifier === ALARM_NOTIFICATION_ID;
      const wasTapped = response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER;

      if (isAlarmNotification && wasTapped && wakeFlow.status === 'idle') {
        startPreview();
      }
      if (isAlarmNotification) {
        dismissAlarmNotification();
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
  const [plusJakartaLoaded] = usePlusJakartaSans({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const [syneLoaded] = useSyne({ Syne_700Bold, Syne_800ExtraBold });
  const [orbitronLoaded] = useOrbitron({ Orbitron_700Bold });
  const [comfortaaLoaded] = useComfortaa({ Comfortaa_700Bold });
  const [cinzelLoaded] = useCinzel({ Cinzel_700Bold });

  const fontsLoaded =
    plusJakartaLoaded && syneLoaded && orbitronLoaded && comfortaaLoaded && cinzelLoaded;

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SettingsProvider>
          <WakeFlowProvider>
            <RootContent />
          </WakeFlowProvider>
        </SettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

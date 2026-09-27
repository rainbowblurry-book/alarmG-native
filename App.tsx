import React, { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
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
import {
  isNativeAlarmAvailable,
  consumePendingRing,
  canUseFullScreenIntent,
  openFullScreenIntentSettings,
} from './src/native/alarmClock';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// JS-clock fallback trigger. Only used when the native alarm module is NOT
// available (Expo Go / old dev client). With the native module present it is
// disabled so it can't race the native alarm.
function useForegroundAlarmTrigger() {
  const { settings } = useSettings();
  const { wakeFlow, startPreview } = useWakeFlow();
  const lastFiredMinuteRef = useRef<number | null>(null);

  useEffect(() => {
    if (isNativeAlarmAvailable()) return;

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

// Native alarm auto-launch: the receiver sets a "pending ring" flag and opens
// MainActivity via the full-screen intent. Check it on launch and on foreground.
function useNativeAlarmLaunch() {
  const { wakeFlow, startPreview } = useWakeFlow();
  const statusRef = useRef(wakeFlow.status);
  statusRef.current = wakeFlow.status;
  const prevStatusRef = useRef(wakeFlow.status);

  useEffect(() => {
    const check = async () => {
      if (statusRef.current !== 'idle') return;
      const pending = await consumePendingRing();
      if (pending && statusRef.current === 'idle') {
        startPreview();
      }
    };

    check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => subscription.remove();
  }, []);

  // Entering ringing: in-app tone takes over, clear native notification + flag.
  useEffect(() => {
    if (wakeFlow.status === 'ringing') {
      dismissAlarmNotification();
      consumePendingRing();
    }
  }, [wakeFlow.status]);

  // Leaving ringing/snoozed back to idle (disarm): sweep flag + notification
  // again so a late native fire can't re-trigger ringing on next open.
  useEffect(() => {
    const wasActive = prevStatusRef.current !== 'idle';
    prevStatusRef.current = wakeFlow.status;

    if (wakeFlow.status === 'idle' && wasActive) {
      dismissAlarmNotification();
      consumePendingRing();
    }
  }, [wakeFlow.status]);
}

// Wheels default to the CURRENT time whenever the app is opened, brought back
// to the foreground, or an alarm has just been disarmed — but only while not
// armed and not ringing, so an armed alarm time is never overwritten.
function useCurrentTimeWhenIdle() {
  const { settings, updateSettings } = useSettings();
  const { wakeFlow } = useWakeFlow();
  const latestRef = useRef({ isArmed: settings.isArmed, status: wakeFlow.status });
  latestRef.current = { isArmed: settings.isArmed, status: wakeFlow.status };
  const prevStatusRef = useRef(wakeFlow.status);

  const setToNow = () => {
    const { isArmed, status } = latestRef.current;
    if (isArmed || status !== 'idle') return;
    const now = new Date();
    updateSettings({ alarmHour: now.getHours(), alarmMinute: now.getMinutes() });
  };

  useEffect(() => {
    setToNow();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToNow();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const wasActive = prevStatusRef.current !== 'idle';
    prevStatusRef.current = wakeFlow.status;
    if (wakeFlow.status === 'idle' && wasActive) {
      setToNow();
    }
  }, [wakeFlow.status, settings.isArmed]);
}

// Android 14+: full-screen intents are a special permission the user can turn off.
function useFullScreenPermissionCheck() {
  const { settings } = useSettings();

  useEffect(() => {
    if (!settings.isArmed) return;
    canUseFullScreenIntent().then((allowed) => {
      if (allowed) return;
      Alert.alert(
        'Allow full-screen alarm',
        'Android is blocking ClockGuard from opening by itself when the alarm rings. Turn on full-screen notifications for ClockGuard so the alarm opens automatically.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Open settings', onPress: openFullScreenIntentSettings },
        ]
      );
    });
  }, [settings.isArmed]);
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
  useNativeAlarmLaunch();
  useCurrentTimeWhenIdle();
  useFullScreenPermissionCheck();
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

import React, { useEffect, useRef } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import AppNavigator from './src/navigation/AppNavigator';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { WakeFlowProvider, useWakeFlow } from './src/context/WakeFlowContext';
import RingingScreen from './src/screens/RingingScreen';

/** Android 13+: ask for notification permission once (needed for the ringing notification). */
function useNotificationPermission() {
  useEffect(() => {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch(() => {});
    }
  }, []);
}

/**
 * While NOT armed and NOT ringing, the wheels show the current time whenever
 * the app opens or returns to the foreground (DECISIONS D-10). While armed,
 * the wheels show the armed time from the native engine.
 */
function useWheelTimeSync() {
  const { updateSettings } = useSettings();
  const { alarm } = useWakeFlow();
  const latest = useRef(alarm);
  latest.current = alarm;

  useEffect(() => {
    const sync = () => {
      const a = latest.current;
      if (a.state !== 'idle') return;
      if (a.armed) {
        updateSettings({ alarmHour: a.hour, alarmMinute: a.minute, repeatDays: a.days });
      } else {
        const now = new Date();
        updateSettings({ alarmHour: now.getHours(), alarmMinute: now.getMinutes() });
      }
    };
    sync();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') sync();
    });
    return () => sub.remove();
  }, []);
}

function RootContent() {
  const { alarm } = useWakeFlow();
  useNotificationPermission();
  useWheelTimeSync();

  if (alarm.state !== 'idle') {
    return <RingingScreen />;
  }

  return (
    <NavigationContainer theme={DarkTheme}>
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SettingsProvider>
        <WakeFlowProvider>
          <RootContent />
        </WakeFlowProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

import React, { useEffect, useRef } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Manrope_400Regular, Manrope_600SemiBold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Unbounded_300Light } from '@expo-google-fonts/unbounded';
import { Caveat_600SemiBold, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';
import { Nunito_300Light, Nunito_400Regular, Nunito_600SemiBold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { VT323_400Regular } from '@expo-google-fonts/vt323';
import AppNavigator from './src/navigation/AppNavigator';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { WakeFlowProvider, useWakeFlow } from './src/context/WakeFlowContext';
import { DesignProvider, useDesign } from './src/context/DesignContext';
import RingingScreen from './src/screens/RingingScreen';
import ErrorBoundary from './src/components/ErrorBoundary';

/** All fonts are free Google Fonts (OFL), bundled with the app. */
export const FONTS = {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_800ExtraBold,
  Unbounded_300Light,
  Caveat_600SemiBold,
  Caveat_700Bold,
  PatrickHand_400Regular,
  Nunito_300Light,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_800ExtraBold,
  VT323_400Regular,
};

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

/** Shared by the real app and the web preview. */
export function AppShell({ initialRoute }: { initialRoute?: React.ComponentProps<typeof AppNavigator>['initialRoute'] }) {
  const { alarm } = useWakeFlow();
  const { pack } = useDesign();

  if (alarm.state !== 'idle') {
    return (
      <>
        <StatusBar style="light" />
        <RingingScreen />
      </>
    );
  }

  const base = pack.mode === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <>
      <StatusBar style={pack.mode === 'dark' || pack.chrome === 'bevel' ? 'light' : 'dark'} />
      <NavigationContainer theme={{ ...base, colors: { ...base.colors, background: pack.colors.bg, card: pack.colors.surface, text: pack.colors.text, border: pack.colors.border, primary: pack.colors.accent } }}>
        <AppNavigator initialRoute={initialRoute} />
      </NavigationContainer>
    </>
  );
}

function RootContent() {
  useNotificationPermission();
  useWheelTimeSync();
  return <AppShell />;
}

export default function App() {
  const [fontsLoaded] = useFonts(FONTS);

  if (!fontsLoaded) return null;

  // TESTING-ONLY START: web-only visual preview with a mocked engine (never on Android)
  if (Platform.OS === 'web') {
    const PreviewApp = require('./src/preview/PreviewApp').default;
    return <PreviewApp />;
  }
  // TESTING-ONLY END

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <SettingsProvider>
          <WakeFlowProvider>
            <DesignProvider>
              <RootContent />
            </DesignProvider>
          </WakeFlowProvider>
        </SettingsProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import IntroScreen from '../screens/IntroScreen';
import { ItemScreen, MovementScreen, PinScreen } from '../screens/MissionScreens';
import { DesignScreen, ReadinessScreen, SettingsScreen, WelcomeScreen } from '../screens/SettingsScreens';
import { useDesign } from '../context/DesignContext';
import { useWakeFlow } from '../context/WakeFlowContext';
import type { RootStack } from './types';

const Stack = createNativeStackNavigator<RootStack>();

/**
 * Home without tabs. Mission pages (Item, PIN, Movement) are locked while armed:
 * their chips are disabled and the pages close themselves if the alarm gets armed.
 * Settings stays reachable while armed (D-35).
 */
export default function AppNavigator({ initialRoute }: { initialRoute?: keyof RootStack }) {
  const { pack, onboarded } = useDesign();
  const { alarm } = useWakeFlow();
  const first: keyof RootStack = initialRoute ?? (!onboarded && !alarm.armed ? 'Intro' : 'Home');

  return (
    <Stack.Navigator
      initialRouteName={first}
      screenOptions={{
        headerShown: false,
        animation: pack.chrome === 'bevel' ? 'none' : 'slide_from_right',
        contentStyle: { backgroundColor: pack.colors.bg },
      }}
    >
      <Stack.Screen name="Intro" component={IntroScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Item" component={ItemScreen} />
      <Stack.Screen name="Pin" component={PinScreen} />
      <Stack.Screen name="Movement" component={MovementScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Readiness" component={ReadinessScreen} />
      {/* TESTING-ONLY START */}
      <Stack.Screen name="Design" component={DesignScreen} />
      {/* TESTING-ONLY END */}
    </Stack.Navigator>
  );
}

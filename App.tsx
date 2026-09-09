import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { SettingsProvider } from './src/context/SettingsContext';
import { WakeFlowProvider, useWakeFlow } from './src/context/WakeFlowContext';
import RingingScreen from './src/screens/RingingScreen';

function RootContent() {
  const { wakeFlow } = useWakeFlow();

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
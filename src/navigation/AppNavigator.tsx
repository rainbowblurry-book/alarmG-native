import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AlarmScreen from '../screens/AlarmScreen';
import SetupScreen from '../screens/SetupScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const { theme } = useTheme();
  const { settings } = useSettings();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopWidth: 0,
          elevation: 0,
          height: 65,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'shield';

          if (route.name === 'Alarm') {
            iconName = focused ? 'shield' : 'shield-outline';
          } else if (route.name === 'Setup') {
            iconName = focused ? 'scan' : 'scan-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Alarm" component={AlarmScreen} />
      <Tab.Screen
        name="Setup"
        component={SetupScreen}
        listeners={{
          tabPress: (e) => {
            if (settings.isArmed) e.preventDefault();
          },
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        listeners={{
          tabPress: (e) => {
            if (settings.isArmed) e.preventDefault();
          },
        }}
      />
    </Tab.Navigator>
  );
}

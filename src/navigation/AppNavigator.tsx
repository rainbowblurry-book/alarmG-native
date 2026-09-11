import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AlarmScreen from '../screens/AlarmScreen';
import SetupScreen from '../screens/SetupScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { colors } from '../theme/colors';
import { Image } from 'react-native';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 0,
          elevation: 0,
          height: 65,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.amberAccent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'alarm';

          if (route.name === 'Alarm') {
            iconName = focused ? 'alarm' : 'alarm-outline';
          } else if (route.name === 'Setup') {
            iconName = focused ? 'scan' : 'scan-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
  name="Alarm"
  component={AlarmScreen}
  options={{
    tabBarIcon: ({ size }) => (
      <Image
        source={require('../../assets/tab-icon-alarm.png')}
        style={{ width: size, height: size, resizeMode: 'contain' }}
      />
    ),
  }}
/>
      <Tab.Screen name="Setup" component={SetupScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
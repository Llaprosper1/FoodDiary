import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import MealsScreen from './src/screens/MealsScreen';
import SymptomsScreen from './src/screens/SymptomsScreen';
import DiaryScreen from './src/screens/DiaryScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const COLORS = {
  primary: '#1a472a',
  accent: '#52b788',
  background: '#f8f9fa',
  white: '#ffffff',
  gray: '#6c757d',
};

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor={COLORS.primary} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            const icons = {
              Mahlzeiten: focused ? 'restaurant' : 'restaurant-outline',
              Symptome: focused ? 'medical' : 'medical-outline',
              Tagebuch: focused ? 'book' : 'book-outline',
              Analyse: focused ? 'analytics' : 'analytics-outline',
              Einstellungen: focused ? 'settings' : 'settings-outline',
            };
            return <Ionicons name={icons[route.name]} size={size} color={color} />;
          },
          tabBarActiveTintColor: COLORS.accent,
          tabBarInactiveTintColor: COLORS.gray,
          tabBarStyle: {
            backgroundColor: COLORS.white,
            borderTopColor: '#e9ecef',
            paddingBottom: 4,
            height: 60,
          },
          headerStyle: {
            backgroundColor: COLORS.primary,
          },
          headerTintColor: COLORS.white,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        })}
      >
        <Tab.Screen
          name="Mahlzeiten"
          component={MealsScreen}
          options={{ title: '🍽️ Mahlzeiten' }}
        />
        <Tab.Screen
          name="Symptome"
          component={SymptomsScreen}
          options={{ title: '🤒 Symptome' }}
        />
        <Tab.Screen
          name="Tagebuch"
          component={DiaryScreen}
          options={{ title: '📖 Tagebuch' }}
        />
        <Tab.Screen
          name="Analyse"
          component={AnalysisScreen}
          options={{ title: '🔍 Analyse' }}
        />
        <Tab.Screen
          name="Einstellungen"
          component={SettingsScreen}
          options={{ title: '⚙️ Einstellungen' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

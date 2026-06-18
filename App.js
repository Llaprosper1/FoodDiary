import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

import { ThemeProvider, useTheme } from './src/utils/themeContext';
import MealsScreen from './src/screens/MealsScreen';
import SymptomsScreen from './src/screens/SymptomsScreen';
import DiaryScreen from './src/screens/DiaryScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function AppTabs() {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={theme.surface} />
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
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            paddingBottom: 4,
            height: 60,
          },
          headerStyle: { backgroundColor: theme.surface, borderBottomColor: theme.border, borderBottomWidth: 1 },
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: 'bold' },
          headerRight: () => (
            <TouchableOpacity onPress={toggleTheme} style={{ marginRight: 16 }}>
              <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={22} color={theme.text} />
            </TouchableOpacity>
          ),
        })}
      >
        <Tab.Screen name="Mahlzeiten" component={MealsScreen} options={{ title: '🍽️ Mahlzeiten' }} />
        <Tab.Screen name="Symptome" component={SymptomsScreen} options={{ title: '🤒 Symptome' }} />
        <Tab.Screen name="Tagebuch" component={DiaryScreen} options={{ title: '📖 Tagebuch' }} />
        <Tab.Screen name="Analyse" component={AnalysisScreen} options={{ title: '🔍 Analyse' }} />
        <Tab.Screen name="Einstellungen" component={SettingsScreen} options={{ title: '⚙️ Einstellungen' }} />
      </Tab.Navigator>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <AppTabs />
      </NavigationContainer>
    </ThemeProvider>
  );
}

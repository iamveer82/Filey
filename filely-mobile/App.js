// SharedArrayBuffer polyfill - MUST be first (fixes whatwg-url crash in Hermes)
import './src/lib/polyfills';
// React Native URL polyfill - second
import 'react-native-url-polyfill/auto';
// Gesture handler must be imported before navigation
import 'react-native-gesture-handler';

import React, { useState, useCallback } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import AIInitializationScreen from './src/screens/AIInitializationScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import CompanySetupScreen from './src/screens/CompanySetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import AIMessagingHub from './src/screens/AIMessagingHub';
import TeamScreen from './src/screens/TeamScreen';
import ComplianceVault from './src/screens/ComplianceVault';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const FilelyLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    border: 'rgba(15,23,42,0.08)',
    primary: '#44e571',
  },
};

const FilelyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0B0F1E',
    card: '#141B2D',
    text: '#FFFFFF',
    border: 'rgba(255,255,255,0.08)',
    primary: '#44e571',
  },
};

// Tab icon config
const TAB_ICONS = {
  Home:     { active: 'home',              inactive: 'home-outline'              },
  Chat:     { active: 'chatbubbles',       inactive: 'chatbubbles-outline'       },
  Vault:    { active: 'shield-checkmark',  inactive: 'shield-checkmark-outline'  },
  Team:     { active: 'people',            inactive: 'people-outline'            },
  Settings: { active: 'settings',          inactive: 'settings-outline'          },
};

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [darkMode, setDarkMode]     = useState(true);   // default dark – matches navy theme
  const [aiReady, setAiReady]       = useState(true);   // demo mode: skip download
  const [checkingAi]                = useState(false);

  const [showOnboarding,   setShowOnboarding]   = useState(false);
  const [showCompanySetup, setShowCompanySetup] = useState(false);

  const toggleDarkMode = useCallback(() => setDarkMode(p => !p), []);
  const theme = darkMode ? FilelyDarkTheme : FilelyLightTheme;

  const c = {
    bg:        darkMode ? '#0B0F1E'                 : '#F8FAFC',
    navBg:     darkMode ? 'rgba(11,15,30,0.97)'     : 'rgba(255,255,255,0.95)',
    headerBg:  darkMode ? 'rgba(20,27,45,0.98)'     : 'rgba(255,255,255,0.98)',
    text:      darkMode ? '#FFFFFF'                 : '#0F172A',
    textMuted: darkMode ? 'rgba(255,255,255,0.35)'  : '#94A3B8',
    border:    darkMode ? 'rgba(255,255,255,0.08)'  : 'rgba(15,23,42,0.08)',
    lime:      '#44e571',
    accent:    '#4F8EFF',
  };

  if (loading || checkingAi) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator size="large" color="#44e571" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen darkMode={darkMode} onNavigateToCompanySetup={() => setShowCompanySetup(true)} />;
  }

  if (showCompanySetup) {
    return (
      <CompanySetupScreen
        darkMode={darkMode}
        onComplete={() => { setShowCompanySetup(false); setShowOnboarding(true); }}
      />
    );
  }

  if (showOnboarding) {
    return <OnboardingScreen darkMode={darkMode} onComplete={() => setShowOnboarding(false)} />;
  }

  if (!aiReady && Platform.OS !== 'web') {
    return <AIInitializationScreen darkMode={darkMode} onComplete={() => setAiReady(true)} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <NavigationContainer theme={theme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color }) => {
              const icons = TAB_ICONS[route.name];
              const iconName = focused ? icons.active : icons.inactive;

              if (focused) {
                return (
                  <View style={{
                    backgroundColor: '#44e571',
                    borderRadius: 24,
                    width: 48,
                    height: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#44e571',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 12,
                    elevation: 6,
                  }}>
                    <Ionicons name={iconName} size={22} color="#003516" />
                  </View>
                );
              }
              return <Ionicons name={iconName} size={24} color={color} />;
            },
            tabBarActiveTintColor:   '#44e571',
            tabBarInactiveTintColor: c.textMuted,
            tabBarShowLabel: false,
            tabBarStyle: {
              position: 'absolute',
              bottom: 20,
              left: 20,
              right: 20,
              borderRadius: 30,
              height: 70,
              backgroundColor: c.navBg,
              borderTopWidth: 0,
              shadowColor: darkMode ? '#4F8EFF' : '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: darkMode ? 0.20 : 0.10,
              shadowRadius: 24,
              elevation: 20,
              paddingBottom: 0,
            },
            headerStyle: {
              backgroundColor: c.headerBg,
              shadowColor: 'transparent',
              elevation: 0,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
            },
            headerTitleStyle: {
              fontWeight: '800',
              fontSize: 20,
              letterSpacing: -0.5,
              color: c.text,
            },
            headerTintColor: c.text,
          })}
        >
          <Tab.Screen
            name="Home"
            options={{
              headerTitle: 'Filey',
              headerLeft: () => (
                <View style={{ marginLeft: 16 }}>
                  <Ionicons name="wallet" size={22} color="#44e571" />
                </View>
              ),
              headerRight: () => (
                <TouchableOpacity
                  onPress={toggleDarkMode}
                  style={{ marginRight: 16, padding: 4, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                  accessibilityRole="button"
                  accessibilityLabel={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  <Ionicons name={darkMode ? 'sunny' : 'moon'} size={22} color={c.textMuted} />
                </TouchableOpacity>
              ),
            }}
          >
            {(props) => <HomeScreen {...props} darkMode={darkMode} />}
          </Tab.Screen>

          <Tab.Screen
            name="Chat"
            options={{
              headerTitle: 'AI Hub',
              headerLeft: () => (
                <View style={{ marginLeft: 16 }}>
                  <Ionicons name="sparkles" size={22} color="#4F8EFF" />
                </View>
              ),
            }}
          >
            {(props) => <AIMessagingHub {...props} darkMode={darkMode} />}
          </Tab.Screen>

          <Tab.Screen
            name="Vault"
            options={{
              headerTitle: '5-Year Vault',
              headerLeft: () => (
                <View style={{ marginLeft: 16 }}>
                  <Ionicons name="shield-checkmark" size={22} color="#44e571" />
                </View>
              ),
            }}
          >
            {(props) => <ComplianceVault {...props} darkMode={darkMode} />}
          </Tab.Screen>

          <Tab.Screen
            name="Team"
            options={{
              headerTitle: 'Team Hub',
              headerLeft: () => (
                <View style={{ marginLeft: 16 }}>
                  <Ionicons name="people" size={22} color="#4F8EFF" />
                </View>
              ),
            }}
          >
            {(props) => <TeamScreen {...props} darkMode={darkMode} />}
          </Tab.Screen>

          <Tab.Screen
            name="Settings"
            options={{
              headerTitle: 'Settings',
              headerLeft: () => (
                <View style={{ marginLeft: 16 }}>
                  <Ionicons name="settings" size={22} color={c.textMuted} />
                </View>
              ),
              headerRight: () => (
                <TouchableOpacity
                  onPress={toggleDarkMode}
                  style={{ marginRight: 16, padding: 4, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                  accessibilityRole="button"
                  accessibilityLabel={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  <Ionicons name={darkMode ? 'sunny' : 'moon'} size={22} color={c.textMuted} />
                </TouchableOpacity>
              ),
            }}
          >
            {(props) => <SettingsScreen {...props} darkMode={darkMode} onLogout={signOut} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

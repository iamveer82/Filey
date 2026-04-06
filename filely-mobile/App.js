import React, { useState, useCallback } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { View, useColorScheme } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';
import TeamScreen from './src/screens/TeamScreen';
import FilesScreen from './src/screens/FilesScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const FilelyLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f9f9f9',
    card: '#ffffff',
    text: '#0c1e26',
    border: 'rgba(12,30,38,0.1)',
    primary: '#44e571',
  },
};

const FilelyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0a0a0a',
    card: '#1a1a1a',
    text: '#ffffff',
    border: 'rgba(255,255,255,0.1)',
    primary: '#44e571',
  },
};

export default function App() {
  const systemScheme = useColorScheme();
  const [darkMode, setDarkMode] = useState(systemScheme === 'dark');

  const toggleDarkMode = useCallback(() => setDarkMode(prev => !prev), []);

  const theme = darkMode ? FilelyDarkTheme : FilelyLightTheme;

  return (
    <SafeAreaProvider>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <NavigationContainer theme={theme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
              else if (route.name === 'Chat') iconName = focused ? 'chatbubble' : 'chatbubble-outline';
              else if (route.name === 'Team') iconName = focused ? 'people' : 'people-outline';
              else if (route.name === 'Files') iconName = focused ? 'folder-open' : 'folder-open-outline';
              else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';

              if (focused) {
                return (
                  <View style={{
                    backgroundColor: '#44e571',
                    borderRadius: 24,
                    width: 48,
                    height: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Ionicons name={iconName} size={22} color="#00531f" />
                  </View>
                );
              }
              return <Ionicons name={iconName} size={24} color={color} />;
            },
            tabBarActiveTintColor: '#44e571',
            tabBarInactiveTintColor: darkMode ? 'rgba(255,255,255,0.4)' : '#94a3b8',
            tabBarShowLabel: false,
            tabBarStyle: {
              position: 'absolute',
              bottom: 20,
              left: 20,
              right: 20,
              borderRadius: 30,
              height: 70,
              backgroundColor: darkMode ? 'rgba(26,26,26,0.9)' : 'rgba(255,255,255,0.85)',
              borderTopWidth: 0,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.12,
              shadowRadius: 30,
              elevation: 20,
              paddingBottom: 0,
            },
            headerStyle: {
              backgroundColor: darkMode ? 'rgba(26,26,26,0.9)' : 'rgba(255,255,255,0.85)',
              shadowColor: 'transparent',
              elevation: 0,
            },
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 24,
              letterSpacing: -0.5,
            },
            headerTintColor: darkMode ? '#fff' : '#0c1e26',
          })}
        >
          <Tab.Screen
            name="Home"
            options={{
              headerTitle: 'Filely',
              headerLeft: () => (
                <View style={{ marginLeft: 16 }}>
                  <Ionicons name="wallet" size={24} color="#44e571" />
                </View>
              ),
              headerRight: () => (
                <View style={{ marginRight: 16 }}>
                  <Ionicons
                    name={darkMode ? 'sunny' : 'moon'}
                    size={22}
                    color={darkMode ? '#fff' : '#94a3b8'}
                    onPress={toggleDarkMode}
                  />
                </View>
              ),
            }}
          >
            {(props) => <HomeScreen {...props} darkMode={darkMode} />}
          </Tab.Screen>

          <Tab.Screen
            name="Chat"
            options={{
              headerTitle: 'Filely AI',
              headerLeft: () => (
                <View style={{ marginLeft: 16 }}>
                  <Ionicons name="wallet" size={24} color="#44e571" />
                </View>
              ),
            }}
          >
            {(props) => <ChatScreen {...props} darkMode={darkMode} />}
          </Tab.Screen>

          <Tab.Screen
            name="Team"
            options={{
              headerTitle: 'Team Hub',
              headerLeft: () => (
                <View style={{ marginLeft: 16 }}>
                  <Ionicons name="wallet" size={24} color="#44e571" />
                </View>
              ),
            }}
          >
            {(props) => <TeamScreen {...props} darkMode={darkMode} />}
          </Tab.Screen>

          <Tab.Screen
            name="Files"
            options={{
              headerTitle: 'Files Vault',
              headerLeft: () => (
                <View style={{ marginLeft: 16 }}>
                  <Ionicons name="wallet" size={24} color="#44e571" />
                </View>
              ),
            }}
          >
            {(props) => <FilesScreen {...props} darkMode={darkMode} />}
          </Tab.Screen>

          <Tab.Screen
            name="Settings"
            options={{
              headerTitle: 'Settings',
              headerLeft: () => (
                <View style={{ marginLeft: 16 }}>
                  <Ionicons name="wallet" size={24} color="#44e571" />
                </View>
              ),
              headerRight: () => (
                <View style={{ marginRight: 16 }}>
                  <Ionicons
                    name={darkMode ? 'sunny' : 'moon'}
                    size={22}
                    color={darkMode ? '#fff' : '#94a3b8'}
                    onPress={toggleDarkMode}
                  />
                </View>
              ),
            }}
          >
            {(props) => <SettingsScreen {...props} darkMode={darkMode} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// SharedArrayBuffer polyfill - MUST be first (fixes whatwg-url crash in Hermes)
import './src/lib/polyfills';
// React Native URL polyfill - second
import 'react-native-url-polyfill/auto';
// Gesture handler must be imported before navigation
import 'react-native-gesture-handler';

import React, { useState, useCallback, useEffect } from 'react';
import { registerRootComponent } from 'expo';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

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
// const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Themes ────────────────────────────────────────────────────────────────────

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

// ─── Tab icon config ───────────────────────────────────────────────────────────

const TAB_ICONS = {
  Home:     { active: 'home',             inactive: 'home-outline'             },
  Chat:     { active: 'chatbubbles',      inactive: 'chatbubbles-outline'      },
  Vault:    { active: 'shield-checkmark', inactive: 'shield-checkmark-outline' },
  Team:     { active: 'people',           inactive: 'people-outline'           },
  Settings: { active: 'settings',         inactive: 'settings-outline'         },
};

const TAB_KEYS = ['Home', 'Chat', 'Vault', 'Team', 'Settings'];

// ─── Spring configs ────────────────────────────────────────────────────────────

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 0.8,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

const BOUNCE_SPRING = {
  damping: 10,
  stiffness: 200,
  mass: 0.6,
};

// ─── Animated Tab Icon ─────────────────────────────────────────────────────────

function AnimatedTabIcon({ routeName, focused, darkMode }) {
  const scale = useSharedValue(focused ? 1 : 0.85);
  const pillScale = useSharedValue(focused ? 1 : 0);
  const pillOpacity = useSharedValue(focused ? 1 : 0);
  const iconTranslateY = useSharedValue(focused ? -2 : 0);

  useEffect(() => {
    if (focused) {
      // Animate in: bounce scale + pill grows
      scale.value = withSpring(1.15, BOUNCE_SPRING, () => {
        scale.value = withSpring(1, SPRING_CONFIG);
      });
      pillScale.value = withSpring(1, SPRING_CONFIG);
      pillOpacity.value = withTiming(1, { duration: 200 });
      iconTranslateY.value = withSpring(-2, SPRING_CONFIG);
    } else {
      scale.value = withSpring(0.85, SPRING_CONFIG);
      pillScale.value = withSpring(0, { ...SPRING_CONFIG, stiffness: 200 });
      pillOpacity.value = withTiming(0, { duration: 150 });
      iconTranslateY.value = withSpring(0, SPRING_CONFIG);
    }
  }, [focused]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: iconTranslateY.value },
    ],
  }));

  const animatedPillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pillScale.value }],
    opacity: pillOpacity.value,
  }));

  const icons = TAB_ICONS[routeName];
  const iconName = focused ? icons.active : icons.inactive;
  const inactiveColor = darkMode ? 'rgba(255,255,255,0.35)' : '#94A3B8';

  return (
    <View style={tabIconStyles.wrapper}>
      {/* Lime pill background */}
      <Animated.View style={[tabIconStyles.pill, animatedPillStyle]}>
        <View style={tabIconStyles.pillInner} />
      </Animated.View>
      {/* Icon */}
      <Animated.View style={[tabIconStyles.iconContainer, animatedIconStyle]}>
        <Ionicons
          name={iconName}
          size={focused ? 22 : 24}
          color={focused ? '#003516' : inactiveColor}
        />
      </Animated.View>
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  wrapper: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#44e571',
    shadowColor: '#44e571',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Custom Tab Bar ────────────────────────────────────────────────────────────

function CustomTabBar({ state, descriptors, navigation, darkMode }) {
  const barBg = darkMode
    ? 'rgba(14, 19, 35, 0.88)'
    : 'rgba(255, 255, 255, 0.82)';
  const barBorder = darkMode
    ? 'rgba(255,255,255,0.06)'
    : 'rgba(15,23,42,0.06)';
  const barShadowColor = darkMode ? '#4F8EFF' : '#000000';

  return (
    <View style={[
      customBarStyles.outer,
      {
        shadowColor: barShadowColor,
        shadowOpacity: darkMode ? 0.25 : 0.12,
      },
    ]}>
      <View style={[
        customBarStyles.container,
        {
          backgroundColor: barBg,
          borderColor: barBorder,
        },
      ]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={customBarStyles.tab}
              android_ripple={{ color: 'rgba(68,229,113,0.15)', borderless: true }}
            >
              <AnimatedTabIcon
                routeName={route.name}
                focused={isFocused}
                darkMode={darkMode}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const customBarStyles = StyleSheet.create({
  outer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 18,
    left: 16,
    right: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 30,
    elevation: 24,
  },
  container: {
    flexDirection: 'row',
    borderRadius: 32,
    height: 72,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    // Frosted glass reinforcement: inner shadow via overlapping borders
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 72,
  },
});

// ─── Header dark/light toggle button ──────────────────────────────────────────

function DarkModeToggle({ darkMode, onToggle }) {
  const rotation = useSharedValue(darkMode ? 0 : 1);

  useEffect(() => {
    rotation.value = withSpring(darkMode ? 0 : 1, {
      damping: 12,
      stiffness: 100,
    });
  }, [darkMode]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(rotation.value, [0, 1], [0, 180])}deg` },
    ],
  }));

  const mutedColor = darkMode ? 'rgba(255,255,255,0.45)' : '#94A3B8';

  return (
    <TouchableOpacity
      onPress={onToggle}
      style={toggleStyles.button}
      accessibilityRole="button"
      accessibilityLabel={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Animated.View style={animatedStyle}>
        <Ionicons
          name={darkMode ? 'sunny' : 'moon'}
          size={20}
          color={mutedColor}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const toggleStyles = StyleSheet.create({
  button: {
    marginRight: 16,
    padding: 6,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
});

// ─── Main App Content ──────────────────────────────────────────────────────────

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [darkMode, setDarkMode]     = useState(true);   // default dark -- matches navy theme
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

  // ── Auth flow gates ─────────────────────────────────────────────────────────

  if (loading || checkingAi) {
    return (
      <View style={[gateStyles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color="#44e571" />
      </View>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        darkMode={darkMode}
        onNavigateToCompanySetup={() => setShowCompanySetup(true)}
      />
    );
  }

  if (showCompanySetup) {
    return (
      <CompanySetupScreen
        darkMode={darkMode}
        onComplete={() => {
          setShowCompanySetup(false);
          setShowOnboarding(true);
        }}
      />
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingScreen
        darkMode={darkMode}
        onComplete={() => setShowOnboarding(false)}
      />
    );
  }

  if (!aiReady && Platform.OS !== 'web') {
    return (
      <AIInitializationScreen
        darkMode={darkMode}
        onComplete={() => setAiReady(true)}
      />
    );
  }

  // ── Main tab navigator ──────────────────────────────────────────────────────

  return (
    <SafeAreaProvider>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <NavigationContainer theme={theme}>
        <Tab.Navigator
          tabBar={(props) => (
            <CustomTabBar {...props} darkMode={darkMode} />
          )}
          screenOptions={{
            headerStyle: {
              backgroundColor: c.headerBg,
              shadowColor: 'transparent',
              elevation: 0,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: c.border,
            },
            headerTitleStyle: {
              fontWeight: '800',
              fontSize: 20,
              letterSpacing: -0.5,
              color: c.text,
            },
            headerTintColor: c.text,
            // Extra bottom padding so content doesn't hide behind floating bar
            sceneStyle: {
              paddingBottom: 0,
            },
          }}
        >
          {/* ── Home ──────────────────────────────────────────────────── */}
          <Tab.Screen
            name="Home"
            options={{
              headerTitle: 'Filey',
              headerLeft: () => (
                <View style={headerStyles.iconLeft}>
                  <Ionicons name="wallet" size={22} color="#44e571" />
                </View>
              ),
              headerRight: () => (
                <DarkModeToggle darkMode={darkMode} onToggle={toggleDarkMode} />
              ),
            }}
          >
            {(props) => <HomeScreen {...props} darkMode={darkMode} />}
          </Tab.Screen>

          {/* ── Chat ──────────────────────────────────────────────────── */}
          <Tab.Screen
            name="Chat"
            options={{
              headerTitle: 'AI Hub',
              headerLeft: () => (
                <View style={headerStyles.iconLeft}>
                  <Ionicons name="sparkles" size={22} color="#4F8EFF" />
                </View>
              ),
              headerRight: () => (
                <DarkModeToggle darkMode={darkMode} onToggle={toggleDarkMode} />
              ),
            }}
          >
            {(props) => <AIMessagingHub {...props} darkMode={darkMode} />}
          </Tab.Screen>

          {/* ── Vault ─────────────────────────────────────────────────── */}
          <Tab.Screen
            name="Vault"
            options={{
              headerTitle: '5-Year Vault',
              headerLeft: () => (
                <View style={headerStyles.iconLeft}>
                  <Ionicons name="shield-checkmark" size={22} color="#44e571" />
                </View>
              ),
              headerRight: () => (
                <DarkModeToggle darkMode={darkMode} onToggle={toggleDarkMode} />
              ),
            }}
          >
            {(props) => <ComplianceVault {...props} darkMode={darkMode} />}
          </Tab.Screen>

          {/* ── Team ──────────────────────────────────────────────────── */}
          <Tab.Screen
            name="Team"
            options={{
              headerTitle: 'Team Hub',
              headerLeft: () => (
                <View style={headerStyles.iconLeft}>
                  <Ionicons name="people" size={22} color="#4F8EFF" />
                </View>
              ),
              headerRight: () => (
                <DarkModeToggle darkMode={darkMode} onToggle={toggleDarkMode} />
              ),
            }}
          >
            {(props) => <TeamScreen {...props} darkMode={darkMode} />}
          </Tab.Screen>

          {/* ── Settings ──────────────────────────────────────────────── */}
          <Tab.Screen
            name="Settings"
            options={{
              headerTitle: 'Settings',
              headerLeft: () => (
                <View style={headerStyles.iconLeft}>
                  <Ionicons name="settings" size={22} color={c.textMuted} />
                </View>
              ),
              headerRight: () => (
                <DarkModeToggle darkMode={darkMode} onToggle={toggleDarkMode} />
              ),
            }}
          >
            {(props) => (
              <SettingsScreen {...props} darkMode={darkMode} onLogout={signOut} />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

const gateStyles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const headerStyles = StyleSheet.create({
  iconLeft: {
    marginLeft: 16,
  },
});

// ─── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

registerRootComponent(App);

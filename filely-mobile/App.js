// SharedArrayBuffer polyfill - MUST be first (fixes whatwg-url crash in Hermes)
import './src/lib/polyfills';
// React Native URL polyfill - second
import 'react-native-url-polyfill/auto';
// Gesture handler must be imported before navigation
import 'react-native-gesture-handler';

import React, { useState, useCallback, useEffect } from 'react';
import { registerRootComponent } from 'expo';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  ActivityIndicator,
  Platform,
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
import OnboardingScreen from './src/screens/OnboardingScreen';
import CompanySetupScreen from './src/screens/CompanySetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';
import TeamScreen from './src/screens/TeamScreen';
import FilesScreen from './src/screens/FilesScreen';
import ComplianceVault from './src/screens/ComplianceVault';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

// ─── Light Only Theme ──────────────────────────────────────────────────────────

const FilelyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    border: 'rgba(15,23,42,0.08)',
    primary: '#3B6BFF',
  },
};

// ─── Colors object for non-themed components ────────────────────────────────────

const LIGHT = {
  bg: '#F8FAFC',
  navBg: 'rgba(255,255,255,0.95)',
  headerBg: 'rgba(255,255,255,0.98)',
  text: '#0F172A',
  textMuted: '#94A3B8',
  border: 'rgba(15,23,42,0.08)',
  accent: '#3B6BFF',
};

// ─── Tab icons ──────────────────────────────────────────────────────────────────

const TAB_ICONS = {
  Home:     { active: 'home',             inactive: 'home-outline'             },
  Chat:     { active: 'chatbubbles',      inactive: 'chatbubbles-outline'      },
  Files:    { active: 'document-text',    inactive: 'document-text-outline'    },
  Vault:    { active: 'shield-checkmark', inactive: 'shield-checkmark-outline' },
  Settings: { active: 'settings',         inactive: 'settings-outline'         },
};

// ─── Spring configs ────────────────────────────────────────────────────────────

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 0.8,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

const BOUNCE_SPRING = { damping: 10, stiffness: 200, mass: 0.6 };

// ─── Animated Tab Icon (light only) ─────────────────────────────────────────────

function AnimatedTabIcon({ routeName, focused }) {
  const scale = useSharedValue(focused ? 1 : 0.85);
  const pillScale = useSharedValue(focused ? 1 : 0);
  const pillOpacity = useSharedValue(focused ? 1 : 0);
  const iconTranslateY = useSharedValue(focused ? -2 : 0);

  useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.15, BOUNCE_SPRING, () => { scale.value = withSpring(1, SPRING_CONFIG); });
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

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { translateY: iconTranslateY.value }] }));
  const pillStyle = useAnimatedStyle(() => ({ transform: [{ scale: pillScale.value }], opacity: pillOpacity.value }));

  const icons = TAB_ICONS[routeName];
  const iconName = focused ? icons.active : icons.inactive;

  return (
    <View style={tabIconStyles.wrapper}>
      <Animated.View style={[tabIconStyles.pill, pillStyle]}>
        <View style={tabIconStyles.pillInner} />
      </Animated.View>
      <Animated.View style={[tabIconStyles.iconContainer, iconStyle]}>
        <Ionicons name={iconName} size={focused ? 22 : 24} color={focused ? '#FFFFFF' : '#94A3B8'} />
      </Animated.View>
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  wrapper: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  pillInner: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#3B6BFF',
    shadowColor: '#3B6BFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  iconContainer: { alignItems: 'center', justifyContent: 'center' },
});

// ─── Custom Tab Bar (light only) ────────────────────────────────────────────────

function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={[customBarStyles.outer, { shadowColor: '#000', shadowOpacity: 0.12 }]}>
      <View style={[customBarStyles.container, { backgroundColor: 'rgba(255,255,255,0.82)', borderColor: 'rgba(15,23,42,0.06)' }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={customBarStyles.tab}
              android_ripple={{ color: 'rgba(59,107,255,0.15)', borderless: true }}
            >
              <AnimatedTabIcon routeName={route.name} focused={isFocused} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const customBarStyles = StyleSheet.create({
  outer: {
    position: 'absolute', bottom: Platform.OS === 'ios' ? 28 : 18, left: 16, right: 16,
    shadowOffset: { width: 0, height: 10 }, shadowRadius: 30, elevation: 24,
  },
  container: {
    flexDirection: 'row', borderRadius: 32, height: 72, alignItems: 'center',
    justifyContent: 'space-around', borderWidth: 1, overflow: 'hidden',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 72 },
});

// ─── Header Left Icon ──────────────────────────────────────────────────────────

function HeaderIcon({ icon, color = '#3B6BFF' }) {
  return (
    <View style={headerStyles.iconLeft}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
  );
}

const headerStyles = StyleSheet.create({ iconLeft: { marginLeft: 16 } });

// ─── Main App Content ──────────────────────────────────────────────────────────

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCompanySetup, setShowCompanySetup] = useState(false);

  if (loading) {
    return (
      <View style={gateStyles.center}>
        <ActivityIndicator size="large" color="#3B6BFF" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen onNavigateToCompanySetup={() => setShowCompanySetup(true)} />;
  }

  if (showCompanySetup) {
    return (
      <CompanySetupScreen
        onComplete={() => { setShowCompanySetup(false); setShowOnboarding(true); }}
      />
    );
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer theme={FilelyTheme}>
        <Tab.Navigator
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{
            headerStyle: { backgroundColor: LIGHT.headerBg, shadowColor: 'transparent', elevation: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LIGHT.border },
            headerTitleStyle: { fontWeight: '800', fontSize: 20, letterSpacing: -0.5, color: LIGHT.text },
            headerTintColor: LIGHT.text,
          }}
        >
          <Tab.Screen
            name="Home"
            options={{ headerTitle: 'Filey', headerLeft: () => <HeaderIcon icon="wallet" /> }}
            component={HomeScreen}
          />
          <Tab.Screen
            name="Chat"
            options={{ headerTitle: 'Fili Chat', headerLeft: () => <HeaderIcon icon="sparkles" /> }}
            component={ChatScreen}
          />
          <Tab.Screen
            name="Files"
            options={{ headerTitle: 'Files', headerLeft: () => <HeaderIcon icon="document-text" /> }}
            component={FilesScreen}
          />
          <Tab.Screen
            name="Vault"
            options={{ headerTitle: 'VAT Vault', headerLeft: () => <HeaderIcon icon="shield-checkmark" /> }}
            component={ComplianceVault}
          />
          <Tab.Screen
            name="Settings"
            options={{ headerTitle: 'Settings', headerLeft: () => <HeaderIcon icon="settings" color="#94A3B8" /> }}
          >
            {(props) => <SettingsScreen {...props} onLogout={signOut} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// ─── Shared ────────────────────────────────────────────────────────────────────

const gateStyles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
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

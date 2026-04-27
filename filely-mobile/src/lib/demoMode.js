/**
 * Demo Mode Detection and Configuration
 * Automatically detects Expo Go vs Development/Production builds
 * Provides mock implementations for native modules when in Expo Go
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Detect if running in Expo Go
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Demo mode configuration
export const DemoConfig = {
  enabled: isExpoGo,
  isExpoGo,

  // Mock detection delay (ms)
  mockDetectionDelay: 800,

  // Mock processing delay (ms)
  mockProcessingDelay: 1500,

  // Log demo mode status
  logStatus: () => {
    console.log(`[DemoMode] ${isExpoGo ? 'EXPO GO MODE' : 'NATIVE MODE'} - ${isExpoGo ? 'Using mock implementations' : 'Using native modules'}`);
  }
};

// Log on load
DemoConfig.logStatus();

export default DemoConfig;

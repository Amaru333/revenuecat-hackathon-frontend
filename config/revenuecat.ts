/**
 * RevenueCat Configuration
 * 
 * IMPORTANT: Replace these with your actual API keys from RevenueCat Dashboard
 * Get them from: https://app.revenuecat.com → Your Project → API Keys
 * 
 * Currently configured for ANDROID ONLY
 */

import { Platform } from 'react-native';

export const REVENUECAT_CONFIG = {
  // API Keys
  apiKeys: {
    ios: '', // Not configured - iOS not supported
    android: 'goog_ajmoFBLQGwxCUkmZHxYseGzoPRv', // Android Public API Key
  },
  
  // Get the appropriate API key for current platform
  get apiKey() {
    return Platform.OS === 'ios' ? this.apiKeys.ios : this.apiKeys.android;
  },
  
  // Entitlement ID
  entitlementId: 'Byte to bite Pro',
  
  // Product IDs
  products: {
    monthly: 'monthly',
    yearly: 'yearly',
  },
  
  // Offering ID (optional - uses default if not specified)
  defaultOffering: null,
} as const;

export default REVENUECAT_CONFIG;

/**
 * RevenueCat Configuration
 *
 * IMPORTANT: Replace these with your actual API keys from RevenueCat Dashboard
 * Get them from: https://app.revenuecat.com → Your Project → API Keys
 *
 * TEST STORE (no real payments):
 * - Dashboard → Apps and providers → Test configuration → Create Test Store
 * - Copy the Test Store API key and set it below
 * - Set EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE=true in .env to use it (debug only!)
 *
 * Currently configured for ANDROID ONLY
 */

import { Platform } from "react-native";

const useTestStore = typeof process !== "undefined" && process.env?.EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE === "true";

export const REVENUECAT_CONFIG = {
  // API Keys
  apiKeys: {
    ios: "", // Not configured - iOS not supported
    android: "goog_ajmoFBLQGwxCUkmZHxYseGzoPRv", // Android Public API Key
    // Test Store key: get from Dashboard → Apps and providers → Test configuration
    testStore: "test_yfWnfZvwIefumAkmhlaFRHeLqgQ", // e.g. 'rcb_xxxxxxxxxxxx' - only used when EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE=true
  },

  // Use Test Store in debug when env is set (never use in production builds!)
  get useTestStore() {
    return useTestStore && __DEV__;
  },

  // Get the appropriate API key for current platform (or Test Store when enabled)
  get apiKey() {
    if (this.useTestStore && this.apiKeys.testStore) {
      return this.apiKeys.testStore;
    }
    return Platform.OS === "ios" ? this.apiKeys.ios : this.apiKeys.android;
  },

  // Entitlement ID
  entitlementId: "Byte to Bite Pro",

  // Product IDs
  products: {
    monthly: "monthly",
    yearly: "yearly",
  },

  // Offering ID (optional - uses default if not specified)
  defaultOffering: null,
} as const;

export default REVENUECAT_CONFIG;

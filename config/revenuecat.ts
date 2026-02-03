/**
 * RevenueCat Configuration
 */

export const REVENUECAT_CONFIG = {
  // API Key
  apiKey: 'test_DyunOsAaeJIODBZwJGKbTZnoZVS',
  
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

import Purchases, { CustomerInfo, PurchasesOfferings } from 'react-native-purchases';
import { REVENUECAT_CONFIG } from '@/config/revenuecat';
import { Platform } from 'react-native';

/**
 * Initialize RevenueCat SDK
 */
export const initializeRevenueCat = async (): Promise<void> => {
  try {
    // Only initialize on Android
    if (Platform.OS === 'ios') {
      console.log('ℹ️ RevenueCat: Skipping iOS initialization (Android only)');
      return;
    }

    // Get Android API key
    const apiKey = REVENUECAT_CONFIG.apiKeys.android;

    // Check if API key is still placeholder
    if (apiKey.includes('XXXXXXX')) {
      console.warn('⚠️ RevenueCat API key not configured. Please update config/revenuecat.ts with your actual API key.');
      return;
    }

    // Configure SDK with API key
    await Purchases.configure({
      apiKey: apiKey,
    });

    console.log('✅ RevenueCat SDK initialized successfully (Android)');
  } catch (error) {
    console.error('❌ Failed to initialize RevenueCat:', error);
    throw error;
  }
};

/**
 * Set user ID for RevenueCat
 */
export const setRevenueCatUserId = async (userId: string): Promise<void> => {
  try {
    await Purchases.logIn(userId.toString());
    console.log('✅ RevenueCat user ID set:', userId);
  } catch (error) {
    console.error('❌ Failed to set RevenueCat user ID:', error);
  }
};

/**
 * Get customer info
 */
export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('❌ Failed to get customer info:', error);
    return null;
  }
};

/**
 * Check if user has Pro entitlement
 */
export const hasProEntitlement = async (): Promise<boolean> => {
  try {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) return false;

    const entitlement = customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlementId];
    return entitlement != null;
  } catch (error) {
    console.error('❌ Failed to check entitlement:', error);
    return false;
  }
};

/**
 * Get available offerings
 */
export const getOfferings = async (): Promise<PurchasesOfferings | null> => {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (error) {
    console.error('❌ Failed to get offerings:', error);
    return null;
  }
};

/**
 * Restore purchases
 */
export const restorePurchases = async (): Promise<CustomerInfo | null> => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    console.log('✅ Purchases restored');
    return customerInfo;
  } catch (error) {
    console.error('❌ Failed to restore purchases:', error);
    return null;
  }
};

/**
 * Get subscription status info
 */
export const getSubscriptionStatus = async (): Promise<{
  isPro: boolean;
  expirationDate: string | null;
  willRenew: boolean;
  productIdentifier: string | null;
}> => {
  try {
    const customerInfo = await getCustomerInfo();
    
    if (!customerInfo) {
      return {
        isPro: false,
        expirationDate: null,
        willRenew: false,
        productIdentifier: null,
      };
    }

    const entitlement = customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlementId];
    
    if (!entitlement) {
      return {
        isPro: false,
        expirationDate: null,
        willRenew: false,
        productIdentifier: null,
      };
    }

    return {
      isPro: true,
      expirationDate: entitlement.expirationDate,
      willRenew: entitlement.willRenew,
      productIdentifier: entitlement.productIdentifier,
    };
  } catch (error) {
    console.error('❌ Failed to get subscription status:', error);
    return {
      isPro: false,
      expirationDate: null,
      willRenew: false,
      productIdentifier: null,
    };
  }
};

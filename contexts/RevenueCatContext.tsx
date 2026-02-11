import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import Purchases, { CustomerInfo, CustomerInfoUpdateListener } from 'react-native-purchases';
import { Platform, Alert, AppState, AppStateStatus } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { REVENUECAT_CONFIG } from '@/config/revenuecat';
import {
  getCustomerInfo,
  restorePurchases,
  setRevenueCatUserId,
} from '@/services/subscriptionService';
import {
  syncSubscriptionWithBackend,
  getSubscriptionStatus as getBackendSubscriptionStatus,
  UsageSummary,
  SubscriptionInfo,
} from '@/services/subscriptionApiService';
import { useAuth } from './AuthContext';

interface SubscriptionStatus {
  isPro: boolean;
  expirationDate: string | null;
  willRenew: boolean;
  productIdentifier: string | null;
}

interface RevenueCatContextType {
  customerInfo: CustomerInfo | null;
  isPro: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionInfo: SubscriptionInfo | null;
  usage: UsageSummary | null;
  isLoading: boolean;
  refreshCustomerInfo: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  showPaywall: () => Promise<void>;
  showCustomerCenter: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  showUpgradePrompt: (feature?: string) => void;
  canUseFeature: (action: string) => { allowed: boolean; current: number; limit: number; remaining: number };
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

export const useRevenueCat = () => {
  const context = useContext(RevenueCatContext);
  if (!context) {
    throw new Error('useRevenueCat must be used within RevenueCatProvider');
  }
  return context;
};

/**
 * Check pro status directly from CustomerInfo (no extra SDK call)
 */
function checkProFromCustomerInfo(info: CustomerInfo | null): boolean {
  if (!info) return false;

  const entitlementId = REVENUECAT_CONFIG.entitlementId;
  const entitlement = info.entitlements.active[entitlementId];

  if (entitlement != null) {
    return true;
  }

  // Fallback: check if there are ANY active entitlements (in case of entitlement ID mismatch)
  const activeKeys = Object.keys(info.entitlements.active);
  if (activeKeys.length > 0) {
    console.warn(
      `[RevenueCat] No entitlement found for "${entitlementId}", but found active entitlements: ${activeKeys.join(', ')}. ` +
      `Check that your entitlement ID in config/revenuecat.ts matches the one in RevenueCat Dashboard.`
    );
    return true; // Grant pro if any entitlement is active (graceful handling)
  }

  return false;
}

/**
 * Extract subscription details from CustomerInfo
 */
function getStatusFromCustomerInfo(info: CustomerInfo | null): SubscriptionStatus {
  if (!info) {
    return { isPro: false, expirationDate: null, willRenew: false, productIdentifier: null };
  }

  const entitlementId = REVENUECAT_CONFIG.entitlementId;
  let entitlement = info.entitlements.active[entitlementId];

  // Fallback: use first active entitlement if configured ID doesn't match
  if (!entitlement) {
    const activeKeys = Object.keys(info.entitlements.active);
    if (activeKeys.length > 0) {
      entitlement = info.entitlements.active[activeKeys[0]];
    }
  }

  if (!entitlement) {
    return { isPro: false, expirationDate: null, willRenew: false, productIdentifier: null };
  }

  return {
    isPro: true,
    expirationDate: entitlement.expirationDate,
    willRenew: entitlement.willRenew,
    productIdentifier: entitlement.productIdentifier,
  };
}

interface RevenueCatProviderProps {
  children: ReactNode;
}

export const RevenueCatProvider: React.FC<RevenueCatProviderProps> = ({ children }) => {
  const { user, token } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isPro: false,
    expirationDate: null,
    willRenew: false,
    productIdentifier: null,
  });
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use refs to always have latest token/isPro without stale closures
  const tokenRef = useRef(token);
  const isProRef = useRef(isPro);
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { isProRef.current = isPro; }, [isPro]);

  // Sync subscription status with backend (uses ref so never stale)
  const syncWithBackend = useCallback(async (status: SubscriptionStatus) => {
    const currentToken = tokenRef.current;
    if (!currentToken) {
      console.log('[RevenueCat] Skipping backend sync - no token yet');
      return;
    }

    try {
      console.log('[RevenueCat] Syncing with backend:', { isPro: status.isPro, product: status.productIdentifier });
      await syncSubscriptionWithBackend(currentToken, {
        isPro: status.isPro,
        productIdentifier: status.productIdentifier,
        expirationDate: status.expirationDate,
      });
      console.log('[RevenueCat] Backend sync complete');
    } catch (error) {
      console.error('[RevenueCat] Failed to sync with backend:', error);
    }
  }, []);

  // Refresh usage data from backend
  const refreshUsage = useCallback(async () => {
    const currentToken = tokenRef.current;
    if (!currentToken) return;

    try {
      const response = await getBackendSubscriptionStatus(currentToken);
      if (response.success) {
        setSubscriptionInfo(response.subscription);
        setUsage(response.usage);

        // If backend says user is Pro (e.g. from webhook or test-toggle), update local state
        if (response.subscription.isPro && !isProRef.current) {
          console.log('[RevenueCat] Backend says Pro - updating local state');
          setIsPro(true);
        }
      }
    } catch (error) {
      console.error('[RevenueCat] Failed to refresh usage:', error);
    }
  }, []);

  // Process customer info from any source (SDK call, listener, etc.)
  const processCustomerInfo = useCallback(async (info: CustomerInfo) => {
    setCustomerInfo(info);

    const proStatus = checkProFromCustomerInfo(info);
    const status = getStatusFromCustomerInfo(info);

    console.log('[RevenueCat] Customer info processed:', {
      isPro: proStatus,
      activeEntitlements: Object.keys(info.entitlements.active),
      product: status.productIdentifier,
    });

    setIsPro(proStatus);
    setSubscriptionStatus(status);

    // Sync with backend
    await syncWithBackend(status);

    // Refresh usage from backend
    await refreshUsage();
  }, [syncWithBackend, refreshUsage]);

  // Initialize and fetch customer info
  const refreshCustomerInfo = useCallback(async () => {
    // Skip RevenueCat SDK on iOS (Android only)
    if (Platform.OS === 'ios') {
      setIsLoading(false);
      await refreshUsage();
      return;
    }

    try {
      setIsLoading(true);

      // Set user ID if logged in
      if (user?.id) {
        await setRevenueCatUserId(user.id.toString());
      }

      // Get customer info from RevenueCat
      const info = await getCustomerInfo();
      if (info) {
        await processCustomerInfo(info);
      } else {
        console.warn('[RevenueCat] No customer info returned');
        // Still try backend as fallback
        await refreshUsage();
      }
    } catch (error) {
      console.error('[RevenueCat] Failed to refresh customer info:', error);
      // Try backend as fallback
      await refreshUsage();
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, processCustomerInfo, refreshUsage]);

  // Show paywall
  const showPaywall = useCallback(async () => {
    if (Platform.OS === 'ios') {
      console.log('[RevenueCat] Paywall not available on iOS');
      return;
    }

    try {
      const paywallResult = await RevenueCatUI.presentPaywall();

      console.log('[RevenueCat] Paywall result:', paywallResult);

      // Refresh customer info after any interaction (purchase, restore, or cancel)
      // because the user might have subscribed outside the paywall flow
      await refreshCustomerInfo();
    } catch (error) {
      console.error('[RevenueCat] Failed to show paywall:', error);
    }
  }, [refreshCustomerInfo]);

  // Show customer center
  const showCustomerCenter = useCallback(async () => {
    if (Platform.OS === 'ios') {
      console.log('[RevenueCat] Customer center not available on iOS');
      return;
    }

    try {
      await RevenueCatUI.presentCustomerCenter();
      await refreshCustomerInfo();
    } catch (error) {
      console.error('[RevenueCat] Failed to show customer center:', error);
    }
  }, [refreshCustomerInfo]);

  // Restore purchases
  const handleRestorePurchases = useCallback(async () => {
    try {
      const info = await restorePurchases();
      if (info) {
        await processCustomerInfo(info);
      }
    } catch (error) {
      console.error('[RevenueCat] Failed to restore purchases:', error);
    }
  }, [processCustomerInfo]);

  // Show upgrade prompt when user hits a limit
  const showUpgradePrompt = useCallback((feature?: string) => {
    const featureText = feature ? ` for ${feature}` : '';
    Alert.alert(
      'Upgrade to Pro',
      `You've reached your free plan limit${featureText}. Upgrade to Bytes Pro for unlimited access to all features!`,
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Upgrade',
          onPress: () => showPaywall(),
          style: 'default',
        },
      ],
    );
  }, [showPaywall]);

  // Check if user can use a feature (based on cached usage data)
  const canUseFeature = useCallback((action: string): { allowed: boolean; current: number; limit: number; remaining: number } => {
    if (isProRef.current) {
      return { allowed: true, current: 0, limit: -1, remaining: -1 };
    }

    if (!usage) {
      return { allowed: true, current: 0, limit: -1, remaining: -1 };
    }

    const dailyActions = ['recipe_generation', 'inventory_scan', 'recipe_suggestion'];
    if (dailyActions.includes(action)) {
      const info = (usage.daily as any)[action];
      if (info) return info;
    }

    const totalActions = ['cookbook_upload', 'saved_recipes', 'shopping_lists'];
    if (totalActions.includes(action)) {
      const info = (usage.total as any)[action];
      if (info) return info;
    }

    return { allowed: true, current: 0, limit: -1, remaining: -1 };
  }, [usage]);

  // === SDK Listener: React to real-time subscription changes ===
  useEffect(() => {
    if (Platform.OS === 'ios') return;

    const listener: CustomerInfoUpdateListener = (info: CustomerInfo) => {
      console.log('[RevenueCat] SDK listener: customer info updated');
      processCustomerInfo(info);
    };

    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [processCustomerInfo]);

  // === AppState Listener: Re-check when app comes to foreground ===
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        console.log('[RevenueCat] App came to foreground - refreshing subscription');
        refreshCustomerInfo();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [refreshCustomerInfo]);

  // === Load on mount and when user changes ===
  useEffect(() => {
    refreshCustomerInfo();
  }, [user?.id, token]);

  // Refresh usage periodically (every 60 seconds)
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      refreshUsage();
    }, 60000);

    return () => clearInterval(interval);
  }, [token, refreshUsage]);

  const value: RevenueCatContextType = {
    customerInfo,
    isPro,
    subscriptionStatus,
    subscriptionInfo,
    usage,
    isLoading,
    refreshCustomerInfo,
    refreshUsage,
    showPaywall,
    showCustomerCenter,
    restorePurchases: handleRestorePurchases,
    showUpgradePrompt,
    canUseFeature,
  };

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
};

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { CustomerInfo } from 'react-native-purchases';
import { Platform, Alert } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import {
  getCustomerInfo,
  hasProEntitlement,
  getSubscriptionStatus as getRCSubscriptionStatus,
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

  // Sync subscription status with backend
  const syncWithBackend = useCallback(async (status: SubscriptionStatus) => {
    if (!token) return;

    try {
      await syncSubscriptionWithBackend(token, {
        isPro: status.isPro,
        productIdentifier: status.productIdentifier,
        expirationDate: status.expirationDate,
      });
    } catch (error) {
      console.error('Failed to sync subscription with backend:', error);
    }
  }, [token]);

  // Refresh usage data from backend
  const refreshUsage = useCallback(async () => {
    if (!token) return;

    try {
      const response = await getBackendSubscriptionStatus(token);
      if (response.success) {
        setSubscriptionInfo(response.subscription);
        setUsage(response.usage);

        // If backend says user is Pro (e.g. from webhook), update local state
        if (response.subscription.isPro && !isPro) {
          setIsPro(true);
        }
      }
    } catch (error) {
      console.error('Failed to refresh usage:', error);
    }
  }, [token, isPro]);

  // Initialize and fetch customer info
  const refreshCustomerInfo = async () => {
    // Skip on iOS (Android only)
    if (Platform.OS === 'ios') {
      setIsLoading(false);
      // Still fetch backend status on iOS
      if (token) {
        await refreshUsage();
      }
      return;
    }

    try {
      setIsLoading(true);
      
      // Set user ID if logged in
      if (user?.id) {
        await setRevenueCatUserId(user.id.toString());
      }

      // Get customer info
      const info = await getCustomerInfo();
      setCustomerInfo(info);

      // Check Pro status
      const proStatus = await hasProEntitlement();
      setIsPro(proStatus);

      // Get subscription details
      const status = await getRCSubscriptionStatus();
      setSubscriptionStatus(status);

      // Sync with backend
      await syncWithBackend(status);

      // Fetch usage data from backend
      if (token) {
        await refreshUsage();
      }
    } catch (error) {
      console.error('Failed to refresh customer info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show paywall
  const showPaywall = async () => {
    // Skip on iOS
    if (Platform.OS === 'ios') {
      console.log('Paywall not available on iOS (Android only)');
      return;
    }

    try {
      const paywallResult = await RevenueCatUI.presentPaywall();
      
      // Refresh customer info after purchase
      if (paywallResult === RevenueCatUI.PAYWALL_RESULT.PURCHASED || 
          paywallResult === RevenueCatUI.PAYWALL_RESULT.RESTORED) {
        await refreshCustomerInfo();
      }
    } catch (error) {
      console.error('Failed to show paywall:', error);
    }
  };

  // Show customer center
  const showCustomerCenter = async () => {
    // Skip on iOS
    if (Platform.OS === 'ios') {
      console.log('Customer center not available on iOS (Android only)');
      return;
    }

    try {
      await RevenueCatUI.presentCustomerCenter();
      // Refresh after customer center closes
      await refreshCustomerInfo();
    } catch (error) {
      console.error('Failed to show customer center:', error);
    }
  };

  // Restore purchases
  const handleRestorePurchases = async () => {
    try {
      const info = await restorePurchases();
      if (info) {
        setCustomerInfo(info);
        await refreshCustomerInfo();
      }
    } catch (error) {
      console.error('Failed to restore purchases:', error);
    }
  };

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
  }, []);

  // Check if user can use a feature (based on cached usage data)
  const canUseFeature = useCallback((action: string): { allowed: boolean; current: number; limit: number; remaining: number } => {
    if (isPro) {
      return { allowed: true, current: 0, limit: -1, remaining: -1 };
    }

    if (!usage) {
      return { allowed: true, current: 0, limit: -1, remaining: -1 }; // Allow if usage hasn't loaded yet
    }

    // Check daily limits
    const dailyActions = ['recipe_generation', 'inventory_scan', 'recipe_suggestion'];
    if (dailyActions.includes(action)) {
      const info = (usage.daily as any)[action];
      if (info) return info;
    }

    // Check total limits
    const totalActions = ['cookbook_upload', 'saved_recipes', 'shopping_lists'];
    if (totalActions.includes(action)) {
      const info = (usage.total as any)[action];
      if (info) return info;
    }

    return { allowed: true, current: 0, limit: -1, remaining: -1 };
  }, [isPro, usage]);

  // Load customer info on mount and when user changes
  useEffect(() => {
    refreshCustomerInfo();
  }, [user?.id]);

  // Refresh usage periodically (every 60 seconds when app is active)
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

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CustomerInfo } from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';
import {
  getCustomerInfo,
  hasProEntitlement,
  getSubscriptionStatus,
  restorePurchases,
  setRevenueCatUserId,
} from '@/services/subscriptionService';
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
  isLoading: boolean;
  refreshCustomerInfo: () => Promise<void>;
  showPaywall: () => Promise<void>;
  showCustomerCenter: () => Promise<void>;
  restorePurchases: () => Promise<void>;
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
  const { user } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isPro: false,
    expirationDate: null,
    willRenew: false,
    productIdentifier: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and fetch customer info
  const refreshCustomerInfo = async () => {
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
      const status = await getSubscriptionStatus();
      setSubscriptionStatus(status);
    } catch (error) {
      console.error('Failed to refresh customer info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show paywall
  const showPaywall = async () => {
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

  // Load customer info on mount and when user changes
  useEffect(() => {
    refreshCustomerInfo();
  }, [user?.id]);

  const value: RevenueCatContextType = {
    customerInfo,
    isPro,
    subscriptionStatus,
    isLoading,
    refreshCustomerInfo,
    showPaywall,
    showCustomerCenter,
    restorePurchases: handleRestorePurchases,
  };

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
};

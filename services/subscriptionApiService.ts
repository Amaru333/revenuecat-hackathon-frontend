import axios from 'axios';
import { BACKEND_URL } from '../constants/URL';

const API_URL = BACKEND_URL;

export interface UsageLimitInfo {
  allowed: boolean;
  current: number;
  limit: number;  // -1 means unlimited
  remaining: number;  // -1 means unlimited
}

export interface UsageSummary {
  daily: {
    recipe_generation: UsageLimitInfo;
    inventory_scan: UsageLimitInfo;
    recipe_suggestion: UsageLimitInfo;
  };
  total: {
    cookbook_upload: UsageLimitInfo;
    saved_recipes: UsageLimitInfo;
    shopping_lists: UsageLimitInfo;
  };
}

export interface SubscriptionInfo {
  tier: 'free' | 'pro';
  isPro: boolean;
  productId: string | null;
  expiresAt: string | null;
  limits: {
    recipe_generation: number;
    inventory_scan: number;
    recipe_suggestion: number;
    cookbook_upload: number;
    saved_recipes: number;
    shopping_lists: number;
  };
}

export interface SubscriptionStatusResponse {
  success: boolean;
  subscription: SubscriptionInfo;
  usage: UsageSummary;
}

/**
 * Sync subscription status from RevenueCat to the backend
 */
export const syncSubscriptionWithBackend = async (
  token: string,
  data: {
    isPro: boolean;
    productIdentifier: string | null;
    expirationDate: string | null;
    revenuecatId?: string;
  }
): Promise<{ success: boolean; subscription: any }> => {
  try {
    const response = await axios.post(
      `${API_URL}/subscription/sync`,
      data,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error syncing subscription:', error);
    throw error;
  }
};

/**
 * Get subscription status and usage from backend
 */
export const getSubscriptionStatus = async (
  token: string
): Promise<SubscriptionStatusResponse> => {
  try {
    const response = await axios.get(`${API_URL}/subscription/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting subscription status:', error);
    throw error;
  }
};

/**
 * Check if an error response is a usage limit error (status 429)
 */
export const isUsageLimitError = (error: any): boolean => {
  return axios.isAxiosError(error) && error.response?.status === 429;
};

/**
 * Extract limit info from a 429 error response
 */
export const getLimitInfoFromError = (error: any): {
  action: string;
  current: number;
  limit: number;
  remaining: number;
  tier: string;
  upgradeRequired: boolean;
  message: string;
} | null => {
  if (!isUsageLimitError(error)) return null;
  
  const data = error.response?.data;
  return {
    action: data?.limitInfo?.action || '',
    current: data?.limitInfo?.current || 0,
    limit: data?.limitInfo?.limit || 0,
    remaining: data?.limitInfo?.remaining || 0,
    tier: data?.limitInfo?.tier || 'free',
    upgradeRequired: data?.limitInfo?.upgradeRequired || false,
    message: data?.message || 'Usage limit reached',
  };
};

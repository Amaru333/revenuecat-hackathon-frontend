import api from './api';

export interface CookLog {
  id: number;
  userId: number;
  recipeId: number;
  cookedAt: string;
  rating: number | null;
  notes: string | null;
  recipe?: {
    id: number;
    name: string;
    cuisineType?: string;
  };
}

export interface CookStats {
  cookCount: number;
  averageRating: number | null;
  lastCooked: string | null;
  recentLogs: CookLog[];
}

export interface CookHistoryResponse {
  cookLogs: CookLog[];
  totalCount: number;
  stats: {
    totalCooks: number;
    averageRating: number | null;
  };
}

/**
 * Log a recipe cook with optional rating and notes
 */
export const logCook = async (
  recipeId: number,
  rating?: number,
  notes?: string,
  token?: string
): Promise<{ cookLog: CookLog; cookCount: number }> => {
  const response = await api.post(
    '/cook-history/log',
    { recipeId, rating, notes },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

/**
 * Get user's cook history
 */
export const getCookHistory = async (
  token: string,
  limit = 20,
  offset = 0
): Promise<CookHistoryResponse> => {
  const response = await api.get('/cook-history', {
    headers: { Authorization: `Bearer ${token}` },
    params: { limit, offset }
  });
  return response.data;
};

/**
 * Get cook stats for a specific recipe
 */
export const getRecipeCookStats = async (
  recipeId: number,
  token: string
): Promise<CookStats> => {
  const response = await api.get(`/cook-history/recipe/${recipeId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

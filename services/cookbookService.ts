import axios from 'axios';
import { BACKEND_URL } from '../constants/URL';

const API_URL = BACKEND_URL;

export interface CookbookRecipeIngredient {
  item: string;
  amount: string;
}

export interface Nutrition {
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
  fiber?: string;
  sugar?: string;
}

export interface CookbookRecipe {
  id: number;
  cookbookId: number;
  name: string;
  description: string | null;
  ingredients: CookbookRecipeIngredient[];
  instructions: string[];
  nutrition: Nutrition | null;
  prepTime: string | null;
  cookTime: string | null;
  servings: string | null;
  pageNumber: number | null;
  createdAt: string;
}

export interface Cookbook {
  id: number;
  name: string;
  description: string | null;
  totalRecipes: number;
  createdAt: string;
  updatedAt: string;
}

export interface IngredientCheckResult {
  success: boolean;
  recipeName: string;
  totalIngredients: number;
  matched: CookbookRecipeIngredient[];
  missing: CookbookRecipeIngredient[];
  matchedCount: number;
  missingCount: number;
  canMake: boolean;
}

/**
 * Upload a cookbook PDF
 */
export const uploadCookbook = async (
  base64Data: string,
  name: string,
  token: string,
): Promise<{ cookbook: Cookbook & { recipes: CookbookRecipe[] } }> => {
  try {
    const response = await axios.post(
      `${API_URL}/cookbooks/upload`,
      { base64Data, name },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000, // 2 min timeout for large PDFs
      },
    );

    if (response.data.success) {
      return { cookbook: response.data.cookbook };
    }

    throw new Error(response.data.error || 'Failed to upload cookbook');
  } catch (error: any) {
    console.error('Upload cookbook error:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data?.error || 'Failed to upload cookbook');
    }
    throw error;
  }
};

/**
 * Get all cookbooks for the user
 */
export const getUserCookbooks = async (token: string): Promise<Cookbook[]> => {
  try {
    const response = await axios.get(`${API_URL}/cookbooks`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data.success) {
      return response.data.cookbooks;
    }

    throw new Error(response.data.error || 'Failed to get cookbooks');
  } catch (error: any) {
    console.error('Get cookbooks error:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data?.error || 'Failed to get cookbooks');
    }
    throw error;
  }
};

/**
 * Get all recipes in a cookbook
 */
export const getCookbookRecipes = async (
  cookbookId: number,
  token: string,
): Promise<{ cookbook: { id: number; name: string; description: string | null }; recipes: CookbookRecipe[] }> => {
  try {
    const response = await axios.get(`${API_URL}/cookbooks/${cookbookId}/recipes`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data.success) {
      return {
        cookbook: response.data.cookbook,
        recipes: response.data.recipes,
      };
    }

    throw new Error(response.data.error || 'Failed to get cookbook recipes');
  } catch (error: any) {
    console.error('Get cookbook recipes error:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data?.error || 'Failed to get cookbook recipes');
    }
    throw error;
  }
};

/**
 * Check ingredient availability for a cookbook recipe
 */
export const checkIngredients = async (
  cookbookRecipeId: number,
  token: string,
): Promise<IngredientCheckResult> => {
  try {
    const response = await axios.post(
      `${API_URL}/cookbooks/check-ingredients`,
      { cookbookRecipeId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (response.data.success) {
      return response.data;
    }

    throw new Error(response.data.error || 'Failed to check ingredients');
  } catch (error: any) {
    console.error('Check ingredients error:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data?.error || 'Failed to check ingredients');
    }
    throw error;
  }
};

/**
 * Save a cookbook recipe to user's recipe list
 */
export const saveCookbookRecipeToMyRecipes = async (
  cookbookRecipeId: number,
  token: string,
): Promise<{ id: number; name: string }> => {
  try {
    const response = await axios.post(
      `${API_URL}/cookbooks/save-recipe`,
      { cookbookRecipeId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (response.data.success) {
      return response.data.recipe;
    }

    throw new Error(response.data.error || 'Failed to save recipe');
  } catch (error: any) {
    console.error('Save cookbook recipe error:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data?.error || 'Failed to save recipe');
    }
    throw error;
  }
};

/**
 * Delete a cookbook
 */
export const deleteCookbook = async (cookbookId: number, token: string): Promise<void> => {
  try {
    const response = await axios.delete(`${API_URL}/cookbooks/${cookbookId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete cookbook');
    }
  } catch (error: any) {
    console.error('Delete cookbook error:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data?.error || 'Failed to delete cookbook');
    }
    throw error;
  }
};

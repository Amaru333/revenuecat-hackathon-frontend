import axios from 'axios';
import { BACKEND_URL } from '../constants/URL';

const API_URL = BACKEND_URL;

export interface MealPlanEntry {
  id: number;
  mealPlanId: number;
  recipeId: number;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
  notes: string | null;
  createdAt: string;
  recipe: {
    id: number;
    name: string;
    description: string | null;
    prepTime: string | null;
    cookTime: string | null;
    servings: string | null;
    calories: string | null;
    protein: string | null;
    carbohydrates: string | null;
    fat: string | null;
    ingredients?: Array<{ id: number; item: string; amount: string | null }>;
  };
}

export interface MealPlan {
  id: number;
  userId: number;
  name: string;
  startDate: string;
  endDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  entries?: MealPlanEntry[];
  _count?: { entries: number };
}

export interface GroceryList {
  needToBuy: Array<{
    id: string;
    name: string;
    amount: string | null;
    fromRecipes: string[];
    mealCount: number;
    checked: boolean;
  }>;
  alreadyHave: Array<{
    id: string;
    name: string;
    amount: string | null;
    fromRecipes: string[];
    mealCount: number;
    checked: boolean;
  }>;
  totalItems: number;
  recipesIncluded: Array<{ id: number; name: string }>;
  totalMeals: number;
  savedId: number;
}

export interface NutritionSummary {
  daily: Array<{
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealCount: number;
  }>;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  averageDaily: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  totalMeals: number;
  totalDays: number;
}

// Create a new meal plan
export const createMealPlan = async (
  data: { name: string; startDate: string; endDate: string; notes?: string },
  token: string,
): Promise<MealPlan> => {
  try {
    const response = await axios.post(`${API_URL}/meal-prep`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.data.success) {
      return response.data.mealPlan;
    }
    throw new Error(response.data.error || 'Failed to create meal plan');
  } catch (error: any) {
    console.error('Create meal plan error:', error);
    throw error;
  }
};

// Get all meal plans
export const getMealPlans = async (token: string): Promise<MealPlan[]> => {
  try {
    const response = await axios.get(`${API_URL}/meal-prep`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.data.success) {
      return response.data.mealPlans;
    }
    throw new Error(response.data.error || 'Failed to get meal plans');
  } catch (error: any) {
    console.error('Get meal plans error:', error);
    throw error;
  }
};

// Get a specific meal plan with entries
export const getMealPlan = async (id: number, token: string): Promise<MealPlan> => {
  try {
    const response = await axios.get(`${API_URL}/meal-prep/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.data.success) {
      return response.data.mealPlan;
    }
    throw new Error(response.data.error || 'Failed to get meal plan');
  } catch (error: any) {
    console.error('Get meal plan error:', error);
    throw error;
  }
};

// Update a meal plan
export const updateMealPlan = async (
  id: number,
  data: { name?: string; startDate?: string; endDate?: string; notes?: string },
  token: string,
): Promise<MealPlan> => {
  try {
    const response = await axios.put(`${API_URL}/meal-prep/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.data.success) {
      return response.data.mealPlan;
    }
    throw new Error(response.data.error || 'Failed to update meal plan');
  } catch (error: any) {
    console.error('Update meal plan error:', error);
    throw error;
  }
};

// Delete a meal plan
export const deleteMealPlan = async (id: number, token: string): Promise<void> => {
  try {
    const response = await axios.delete(`${API_URL}/meal-prep/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete meal plan');
    }
  } catch (error: any) {
    console.error('Delete meal plan error:', error);
    throw error;
  }
};

// Add a meal entry to a plan
export const addMealEntry = async (
  planId: number,
  data: {
    recipeId: number;
    date: string;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    servings?: number;
    notes?: string;
  },
  token: string,
): Promise<MealPlanEntry> => {
  try {
    const response = await axios.post(`${API_URL}/meal-prep/${planId}/entries`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.data.success) {
      return response.data.entry;
    }
    throw new Error(response.data.error || 'Failed to add meal entry');
  } catch (error: any) {
    console.error('Add meal entry error:', error);
    throw error;
  }
};

// Remove a meal entry
export const removeMealEntry = async (
  planId: number,
  entryId: number,
  token: string,
): Promise<void> => {
  try {
    const response = await axios.delete(`${API_URL}/meal-prep/${planId}/entries/${entryId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to remove meal entry');
    }
  } catch (error: any) {
    console.error('Remove meal entry error:', error);
    throw error;
  }
};

// Generate grocery list from a meal plan
export const generateGroceryListFromPlan = async (
  planId: number,
  token: string,
): Promise<GroceryList> => {
  try {
    const response = await axios.post(
      `${API_URL}/meal-prep/${planId}/grocery-list`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (response.data.success) {
      return response.data.groceryList;
    }
    throw new Error(response.data.error || 'Failed to generate grocery list');
  } catch (error: any) {
    console.error('Generate grocery list error:', error);
    throw error;
  }
};

// Get nutrition summary for a meal plan
export const getNutritionSummary = async (
  planId: number,
  token: string,
): Promise<NutritionSummary> => {
  try {
    const response = await axios.get(`${API_URL}/meal-prep/${planId}/nutrition`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.data.success) {
      return response.data.summary;
    }
    throw new Error(response.data.error || 'Failed to get nutrition summary');
  } catch (error: any) {
    console.error('Get nutrition summary error:', error);
    throw error;
  }
};

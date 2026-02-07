import axios from 'axios';
import { BACKEND_URL } from '../constants/URL';

const API_URL = BACKEND_URL;

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: string;
  cookTime: string;
  servings: number;
  imageUrl?: string;
  isFavorite?: boolean;
  nutrition?: {
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
  };
}

export interface UploadMediaResponse {
  success: boolean;
  recipe?: Recipe;
  message?: string;
}

/**
 * Upload media (image or video) to get recipe suggestions
 * @param mediaUri - Local URI of the image or video
 * @param type - Type of media ('image' or 'video')
 * @param userId - Optional user ID to associate recipe with
 * @returns Recipe data or error message
 */
export const uploadMediaForRecipe = async (
  mediaUri: string,
  type: 'image' | 'video',
  userId?: number
): Promise<UploadMediaResponse> => {
  try {
    // Convert image URI to base64
    const response = await fetch(mediaUri);
    const blob = await response.blob();
    
    // Convert blob to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64String = base64.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Determine MIME type
    const mimeType = blob.type || (type === 'image' ? 'image/jpeg' : 'video/mp4');

    // Call backend API
    const apiResponse = await axios.post(
      `${API_URL}/recipes/analyze`,
      {
        base64Data,
        mimeType,
        userId,
        prompt: type === 'image'
          ? "Analyze this food image and provide a detailed recipe. Include ingredients with measurements and step-by-step instructions."
          : "Analyze this recipe video carefully. Observe all ingredients used, their quantities, and the preparation steps. Provide the full recipe.",
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (apiResponse.data.success && apiResponse.data.recipe) {
      const recipeData = apiResponse.data.recipe;
      
      // Transform backend response to match frontend Recipe interface
      const recipe: Recipe = {
        id: recipeData.id?.toString() || '1',
        name: recipeData.name,
        description: recipeData.description || '',
        ingredients: recipeData.ingredients?.map((ing: any) => 
          typeof ing === 'string' ? ing : `${ing.amount} ${ing.item}`
        ) || [],
        instructions: recipeData.instructions || [],
        prepTime: recipeData.prepTime || 'N/A',
        cookTime: recipeData.cookTime || 'N/A',
        servings: parseInt(recipeData.servings) || 1,
        imageUrl: mediaUri,
        nutrition: {
          calories: parseInt(recipeData.calories) || 0,
          protein: recipeData.protein || '0g',
          carbs: recipeData.carbohydrates || '0g',
          fat: recipeData.fat || '0g',
        },
      };

      return {
        success: true,
        recipe,
      };
    }

    return {
      success: false,
      message: 'Failed to analyze media. Please try again.',
    };
  } catch (error) {
    console.error('Error uploading media for recipe:', error);
    
    // Provide more specific error messages
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return {
          success: false,
          message: error.response.data?.error || 'Server error. Please try again.',
        };
      } else if (error.request) {
        return {
          success: false,
          message: 'Cannot connect to server. Please check your connection.',
        };
      }
    }
    
    return {
      success: false,
      message: 'Failed to analyze media. Please try again.',
    };
  }
};

/**
 * Get recipe by ID
 * @param recipeId - Recipe ID
 * @returns Recipe data
 */
export const getRecipeById = async (recipeId: string): Promise<Recipe | null> => {
  try {
    const response = await axios.get(`${API_URL}/recipes/${recipeId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return null;
  }
};

/**
 * Save recipe to user's favorites
 * @param recipeId - Recipe ID
 * @returns Success status
 */
export const saveRecipe = async (recipeId: string): Promise<boolean> => {
  try {
    await axios.post(`${API_URL}/recipes/${recipeId}/save`);
    return true;
  } catch (error) {
    console.error('Error saving recipe:', error);
    return false;
  }
};

/**
 * Get all recipes for a user
 * @param userId - User ID
 * @returns Array of recipes
 */
export const getUserRecipes = async (userId: number): Promise<Recipe[]> => {
  try {
    const response = await axios.get(`${API_URL}/recipes/user/${userId}`);
    
    // Transform backend response to match frontend Recipe interface
    const recipes: Recipe[] = response.data.map((recipeData: any) => ({
      id: recipeData.id?.toString() || '',
      name: recipeData.name,
      description: recipeData.description || '',
      ingredients: recipeData.ingredients?.map((ing: any) => 
        typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.item}`.trim()
      ) || [],
      instructions: recipeData.instructions?.map((inst: any) => 
        typeof inst === 'string' ? inst : inst.instruction
      ) || [],
      prepTime: recipeData.prepTime || 'N/A',
      cookTime: recipeData.cookTime || 'N/A',
      servings: parseInt(recipeData.servings) || 1,
      nutrition: {
        calories: parseInt(recipeData.calories) || 0,
        protein: recipeData.protein || '0g',
        carbs: recipeData.carbohydrates || '0g',
        fat: recipeData.fat || '0g',
      },
    }));
    
    return recipes;
  } catch (error) {
    console.error('Error fetching user recipes:', error);
    return [];
  }
};

/**
 * Get recipe suggestions based on user's inventory
 * @param token - Authentication token
 * @returns Array of recipe suggestions
 */
export const getSuggestionsFromInventory = async (token: string): Promise<Recipe[]> => {
  try {
    const response = await axios.get(`${API_URL}/recipes/suggestions-from-inventory`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (response.data.success && response.data.suggestions) {
      // Transform backend response to match frontend Recipe interface
      const recipes: Recipe[] = response.data.suggestions.map((recipeData: any) => ({
        id: recipeData.id?.toString() || '',
        name: recipeData.name,
        description: recipeData.description || '',
        ingredients: recipeData.ingredients?.map((ing: any) => 
          typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.item}`.trim()
        ) || [],
        instructions: recipeData.instructions || [],
        prepTime: recipeData.prepTime || 'N/A',
        cookTime: recipeData.cookTime || 'N/A',
        servings: parseInt(recipeData.servings) || 1,
        nutrition: {
          calories: parseInt(recipeData.calories) || 0,
          protein: recipeData.protein || '0g',
          carbs: recipeData.carbohydrates || '0g',
          fat: recipeData.fat || '0g',
        },
      }));
      
      return recipes;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching recipe suggestions:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data?.error || 'Failed to get recipe suggestions');
    }
    throw new Error('Failed to get recipe suggestions');
  }
};

/**
 * Save a recipe from suggestions to user's recipe list
 * @param recipe - Recipe object to save
 * @param token - Authentication token
 * @returns Saved recipe with database ID
 */
export const saveRecipeFromSuggestion = async (recipe: Recipe, token: string): Promise<Recipe> => {
  try {
    const response = await axios.post(
      `${API_URL}/recipes/save-from-suggestion`,
      { recipe },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (response.data.success && response.data.recipe) {
      const recipeData = response.data.recipe;
      return {
        id: recipeData.id?.toString() || '',
        name: recipeData.name,
        description: recipeData.description || '',
        ingredients: recipeData.ingredients || [],
        instructions: recipeData.instructions || [],
        prepTime: recipeData.prepTime || 'N/A',
        cookTime: recipeData.cookTime || 'N/A',
        servings: parseInt(recipeData.servings) || 1,
        nutrition: recipeData.nutrition || {
          calories: 0,
          protein: '0g',
          carbs: '0g',
          fat: '0g',
        },
      };
    }
    
    throw new Error('Failed to save recipe');
  } catch (error) {
    console.error('Error saving recipe from suggestion:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data?.error || 'Failed to save recipe');
    }
    throw new Error('Failed to save recipe');
  }
};

/**
 * Delete a recipe by ID
 * @param recipeId - ID of the recipe to delete
 * @param token - Authentication token
 */
export const deleteRecipe = async (recipeId: string, token: string): Promise<void> => {
  try {
    const response = await axios.delete(`${API_URL}/recipes/${recipeId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.data.success) {
      throw new Error('Failed to delete recipe');
    }
  } catch (error) {
    console.error('Error deleting recipe:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data?.error || 'Failed to delete recipe');
    }
    throw new Error('Failed to delete recipe');
  }
};

/**
 * Toggle favorite status of a recipe
 * @param recipeId - ID of the recipe to toggle
 * @param token - Authentication token
 * @returns Updated favorite status
 */
export const toggleFavorite = async (recipeId: string, token: string): Promise<boolean> => {
  try {
    const response = await axios.patch(
      `${API_URL}/recipes/${recipeId}/favorite`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    
    if (response.data.success) {
      return response.data.isFavorite;
    }
    
    throw new Error('Failed to toggle favorite');
  } catch (error) {
    console.error('Error toggling favorite:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data?.error || 'Failed to toggle favorite');
    }
    throw new Error('Failed to toggle favorite');
  }
};

/**
 * Get all favorite recipes for the authenticated user
 * @param token - Authentication token
 * @returns Array of favorite recipes
 */
export const getFavoriteRecipes = async (token: string): Promise<Recipe[]> => {
  try {
    const response = await axios.get(`${API_URL}/recipes/favorites`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (response.data.success && response.data.recipes) {
      const recipes: Recipe[] = response.data.recipes.map((recipeData: any) => ({
        id: recipeData.id?.toString() || '',
        name: recipeData.name,
        description: recipeData.description || '',
        ingredients: recipeData.ingredients || [],
        instructions: recipeData.instructions || [],
        prepTime: recipeData.prepTime || 'N/A',
        cookTime: recipeData.cookTime || 'N/A',
        servings: parseInt(recipeData.servings) || 1,
        isFavorite: recipeData.isFavorite || false,
        nutrition: recipeData.nutrition || {
          calories: 0,
          protein: '0g',
          carbs: '0g',
          fat: '0g',
        },
      }));
      
      return recipes;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching favorite recipes:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data?.error || 'Failed to get favorite recipes');
    }
    throw new Error('Failed to get favorite recipes');
  }
};

/**
 * Generate recipe from text description
 * @param description - Text description of desired recipe
 * @param token - Authentication token
 * @returns Recipe data or error message
 */
export const generateRecipeFromText = async (
  description: string,
  token: string
): Promise<UploadMediaResponse> => {
  try {
    const response = await axios.post(
      `${API_URL}/recipes/generate-from-text`,
      { description },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.success && response.data.recipe) {
      const recipeData = response.data.recipe;
      
      // Transform backend response to match frontend Recipe interface
      const recipe: Recipe = {
        id: recipeData.id?.toString() || '1',
        name: recipeData.name,
        description: recipeData.description || '',
        ingredients: recipeData.ingredients || [],
        instructions: recipeData.instructions || [],
        prepTime: recipeData.prepTime || 'N/A',
        cookTime: recipeData.cookTime || 'N/A',
        servings: parseInt(recipeData.servings) || 1,
        nutrition: {
          calories: recipeData.nutrition?.calories || 0,
          protein: recipeData.nutrition?.protein || '0g',
          carbs: recipeData.nutrition?.carbs || '0g',
          fat: recipeData.nutrition?.fat || '0g',
        },
      };

      return {
        success: true,
        recipe,
      };
    }

    return {
      success: false,
      message: 'Failed to generate recipe. Please try again.',
    };
  } catch (error) {
    console.error('Error generating recipe from text:', error);
    
    // Provide more specific error messages
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return {
          success: false,
          message: error.response.data?.error || 'Server error. Please try again.',
        };
      } else if (error.request) {
        return {
          success: false,
          message: 'Cannot connect to server. Please check your connection.',
        };
      }
    }
    
    return {
      success: false,
      message: 'Failed to generate recipe. Please try again.',
    };
  }
};


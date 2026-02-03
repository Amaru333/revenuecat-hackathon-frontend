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

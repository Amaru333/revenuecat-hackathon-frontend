import axios from 'axios';
import { BACKEND_URL } from '../constants/URL';
// Backend API configuration
const API_BASE_URL = BACKEND_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for large file uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Recipe {
  id?: number;
  name: string;
  description: string;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  servings: string;
  calories: string;
  protein: string;
  carbohydrates: string;
  fat: string;
  fiber: string;
  sugar: string;
  sodium: string;
  cuisineType: string;
  difficultyLevel: string;
  ingredients: Array<{
    item: string;
    amount: string;
  }>;
  instructions: string[];
  tips: string[];
}

export interface AnalyzeRecipeRequest {
  base64Data: string;
  mimeType: string;
  userId?: number;
  prompt?: string;
}

export interface AnalyzeRecipeResponse {
  success: boolean;
  recipeId: number;
  recipe: Recipe;
}

/**
 * Analyze a food image or video and get recipe details
 */
export async function analyzeRecipe(
  base64Data: string,
  mimeType: string,
  userId?: number,
  customPrompt?: string,
): Promise<AnalyzeRecipeResponse> {
  const response = await api.post<AnalyzeRecipeResponse>('/recipes/analyze', {
    base64Data,
    mimeType,
    userId,
    prompt: customPrompt,
  });
  return response.data;
}

/**
 * Get a specific recipe by ID
 */
export async function getRecipeById(id: number): Promise<Recipe> {
  const response = await api.get<Recipe>(`/recipes/${id}`);
  return response.data;
}

/**
 * Get all recipes for a specific user
 */
export async function getUserRecipes(userId: number): Promise<Recipe[]> {
  const response = await api.get<Recipe[]>(`/recipes/user/${userId}`);
  return response.data;
}

/**
 * Get all recipes with pagination
 */
export async function getAllRecipes(limit: number = 50, offset: number = 0): Promise<Recipe[]> {
  const response = await api.get<Recipe[]>('/recipes', {
    params: { limit, offset },
  });
  return response.data;
}

/**
 * Health check for API
 */
export async function healthCheck(): Promise<{ status: string; message: string }> {
  const response = await api.get('/health');
  return response.data;
}

export default {
  analyzeRecipe,
  getRecipeById,
  getUserRecipes,
  getAllRecipes,
  healthCheck,
  // Export axios instance for direct use
  get: api.get.bind(api),
  post: api.post.bind(api),
  put: api.put.bind(api),
  delete: api.delete.bind(api),
};

// Also export the axios instance directly
export { api };

import axios from 'axios';
import { BACKEND_URL } from '../constants/URL';

const API_URL = BACKEND_URL;

export interface ShoppingListItem {
  id: string;
  name: string;
  amount: string | null;
  fromRecipes: string[];
  checked: boolean;
}

export interface ShoppingList {
  needToBuy: ShoppingListItem[];
  alreadyHave: ShoppingListItem[];
  totalItems: number;
  recipesIncluded: { id: number; name: string }[];
}

// Generate shopping list from selected recipe IDs
export const generateShoppingList = async (
  recipeIds: string[],
  token: string
): Promise<ShoppingList> => {
  try {
    const response = await axios.post(
      `${API_URL}/shopping/generate`,
      { recipeIds },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.success) {
      return response.data.shoppingList;
    }

    throw new Error(response.data.error || 'Failed to generate shopping list');
  } catch (error: any) {
    console.error('Generate shopping list error:', error);
    throw error;
  }
};

// Add items to inventory
export const addItemsToInventory = async (
  items: ShoppingListItem[],
  token: string
): Promise<void> => {
  try {
    const itemsToAdd = items.map(item => ({
      name: item.name,
      quantity: 1,
    }));

    const response = await axios.post(
      `${API_URL}/shopping/add-to-inventory`,
      { items: itemsToAdd },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to add items to inventory');
    }
  } catch (error: any) {
    console.error('Add to inventory error:', error);
    throw error;
  }
};

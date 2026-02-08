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
  savedId?: number;
}

export interface SavedShoppingList extends ShoppingList {
  savedId: number;
  name: string;
  checkedItems: string[];
  createdAt: string;
  updatedAt: string;
}

// Generate shopping list from selected recipe IDs (auto-saves on backend)
export const generateShoppingList = async (
  recipeIds: string[],
  token: string,
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
      },
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

// Get all saved shopping lists
export const getSavedShoppingLists = async (token: string): Promise<SavedShoppingList[]> => {
  try {
    const response = await axios.get(`${API_URL}/shopping/saved`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data.success) {
      return response.data.shoppingLists;
    }

    throw new Error(response.data.error || 'Failed to get shopping lists');
  } catch (error: any) {
    console.error('Get saved shopping lists error:', error);
    throw error;
  }
};

// Update a saved shopping list (checked items, moved items, etc.)
export const updateSavedShoppingList = async (
  id: number,
  data: {
    checkedItems?: string[];
    needToBuy?: ShoppingListItem[];
    alreadyHave?: ShoppingListItem[];
    name?: string;
    totalItems?: number;
    recipesIncluded?: { id: number; name: string }[];
  },
  token: string,
): Promise<void> => {
  try {
    const response = await axios.put(`${API_URL}/shopping/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update shopping list');
    }
  } catch (error: any) {
    console.error('Update shopping list error:', error);
    throw error;
  }
};

// Add more recipes to an existing saved shopping list
export const addRecipesToList = async (
  id: number,
  recipeIds: string[],
  token: string,
): Promise<ShoppingList> => {
  try {
    const response = await axios.post(
      `${API_URL}/shopping/${id}/add-recipes`,
      { recipeIds },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (response.data.success) {
      return response.data.shoppingList;
    }

    throw new Error(response.data.error || 'Failed to add recipes to list');
  } catch (error: any) {
    console.error('Add recipes to list error:', error);
    throw error;
  }
};

// Add a manual item to an existing saved shopping list
export const addManualItemToList = async (
  id: number,
  name: string,
  amount: string | null,
  token: string,
): Promise<ShoppingListItem> => {
  try {
    const response = await axios.post(
      `${API_URL}/shopping/${id}/add-item`,
      { name, amount },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (response.data.success) {
      return response.data.item;
    }

    throw new Error(response.data.error || 'Failed to add item');
  } catch (error: any) {
    console.error('Add manual item error:', error);
    throw error;
  }
};

// Delete a saved shopping list
export const deleteSavedShoppingList = async (id: number, token: string): Promise<void> => {
  try {
    const response = await axios.delete(`${API_URL}/shopping/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete shopping list');
    }
  } catch (error: any) {
    console.error('Delete shopping list error:', error);
    throw error;
  }
};

// Add items to inventory
export const addItemsToInventory = async (
  items: ShoppingListItem[],
  token: string,
): Promise<void> => {
  try {
    const itemsToAdd = items.map((item) => ({
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
      },
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to add items to inventory');
    }
  } catch (error: any) {
    console.error('Add to inventory error:', error);
    throw error;
  }
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getUserRecipes, Recipe } from '@/services/recipeService';
import { generateShoppingList, addItemsToInventory, ShoppingListItem } from '@/services/shoppingService';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';

interface ShoppingList {
  needToBuy: ShoppingListItem[];
  alreadyHave: ShoppingListItem[];
  totalItems: number;
  recipesIncluded: { id: number; name: string }[];
}

export default function ShoppingListScreen() {
  const { user, token } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set());
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [addingToInventory, setAddingToInventory] = useState(false);

  const fetchRecipes = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const userRecipes = await getUserRecipes(user.id);
      setRecipes(userRecipes);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Refresh recipes every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchRecipes();
    }, [fetchRecipes])
  );

  const toggleRecipeSelection = (recipeId: string) => {
    const newSelected = new Set(selectedRecipes);
    if (newSelected.has(recipeId)) {
      newSelected.delete(recipeId);
    } else {
      newSelected.add(recipeId);
    }
    setSelectedRecipes(newSelected);
  };

  const handleGenerateList = async () => {
    if (!token || selectedRecipes.size === 0) {
      Alert.alert('Select Recipes', 'Please select at least one recipe to generate a shopping list.');
      return;
    }

    setGenerating(true);
    try {
      const list = await generateShoppingList(Array.from(selectedRecipes), token);
      setShoppingList(list);
      setCheckedItems(new Set()); // Reset checked items
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error generating shopping list:', error);
      Alert.alert('Error', 'Failed to generate shopping list. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleItemCheck = (itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
  };

  const handleAddToInventory = async () => {
    if (!token || checkedItems.size === 0) {
      Alert.alert('Select Items', 'Please check off items you\'ve purchased to add them to inventory.');
      return;
    }

    const itemsToAdd = shoppingList?.needToBuy.filter(item => checkedItems.has(item.id)) || [];
    
    if (itemsToAdd.length === 0) {
      Alert.alert('No Items', 'Please check items from the "Need to Buy" section.');
      return;
    }

    setAddingToInventory(true);
    try {
      await addItemsToInventory(itemsToAdd, token);
      Alert.alert('Success', `Added ${itemsToAdd.length} items to your inventory!`);
      
      // Remove added items from need to buy list
      if (shoppingList) {
        const updatedNeedToBuy = shoppingList.needToBuy.filter(item => !checkedItems.has(item.id));
        const addedItems = shoppingList.needToBuy.filter(item => checkedItems.has(item.id));
        setShoppingList({
          ...shoppingList,
          needToBuy: updatedNeedToBuy,
          alreadyHave: [...shoppingList.alreadyHave, ...addedItems.map(i => ({ ...i, checked: true }))],
        });
        setCheckedItems(new Set());
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error adding to inventory:', error);
      Alert.alert('Error', 'Failed to add items to inventory.');
    } finally {
      setAddingToInventory(false);
    }
  };

  const renderRecipeSelector = () => {
    // Sort recipes: favorites first, then by name
    const favoriteRecipes = recipes.filter(r => r.isFavorite);
    const otherRecipes = recipes.filter(r => !r.isFavorite);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Recipes</Text>
        <Text style={styles.sectionSubtitle}>Choose recipes to generate your shopping list</Text>
        
        {recipes.length === 0 ? (
          <Text style={styles.emptyText}>No saved recipes yet. Create some recipes first!</Text>
        ) : (
          <View style={styles.recipeList}>
            {/* Favorites Section */}
            {favoriteRecipes.length > 0 && (
              <>
                <Text style={styles.recipeSectionLabel}>❤️ Favorites</Text>
                {favoriteRecipes.map((recipe) => (
                  <TouchableOpacity
                    key={recipe.id}
                    style={[
                      styles.recipeItem,
                      styles.recipeItemFavorite,
                      selectedRecipes.has(recipe.id) && styles.recipeItemFavoriteSelected,
                    ]}
                    onPress={() => toggleRecipeSelection(recipe.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={selectedRecipes.has(recipe.id) ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={selectedRecipes.has(recipe.id) ? '#000' : '#999'}
                    />
                    <Text style={[
                      styles.recipeName,
                      selectedRecipes.has(recipe.id) && styles.recipeNameSelected,
                    ]}>
                      {recipe.name}
                    </Text>
                    <Ionicons name="heart" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Other Recipes Section */}
            {otherRecipes.length > 0 && (
              <>
                {favoriteRecipes.length > 0 && (
                  <Text style={styles.recipeSectionLabel}>📖 Other Recipes</Text>
                )}
                {otherRecipes.map((recipe) => (
                  <TouchableOpacity
                    key={recipe.id}
                    style={[
                      styles.recipeItem,
                      selectedRecipes.has(recipe.id) && styles.recipeItemSelected,
                    ]}
                    onPress={() => toggleRecipeSelection(recipe.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={selectedRecipes.has(recipe.id) ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={selectedRecipes.has(recipe.id) ? '#000' : '#999'}
                    />
                    <Text style={[
                      styles.recipeName,
                      selectedRecipes.has(recipe.id) && styles.recipeNameSelected,
                    ]}>
                      {recipe.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        )}
        
        <TouchableOpacity
          style={[styles.generateButton, selectedRecipes.size === 0 && styles.buttonDisabled]}
          onPress={handleGenerateList}
          disabled={selectedRecipes.size === 0 || generating}
        >
          {generating ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="list" size={20} color="#FFF" />
              <Text style={styles.generateButtonText}>Generate Shopping List</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderShoppingList = () => (
    <View style={styles.section}>
      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>Shopping List</Text>
        <TouchableOpacity onPress={() => setShoppingList(null)}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.sectionSubtitle}>
        From: {shoppingList?.recipesIncluded.map(r => r.name).join(', ')}
      </Text>

      {/* Need to Buy Section */}
      <View style={styles.listSection}>
        <Text style={styles.listSectionTitle}>
          🛒 Need to Buy ({shoppingList?.needToBuy.length})
        </Text>
        {shoppingList?.needToBuy.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.listItem}
            onPress={() => toggleItemCheck(item.id)}
          >
            <Ionicons
              name={checkedItems.has(item.id) ? 'checkbox' : 'square-outline'}
              size={24}
              color={checkedItems.has(item.id) ? '#4CAF50' : '#999'}
            />
            <View style={styles.itemDetails}>
              <Text style={[
                styles.itemName,
                checkedItems.has(item.id) && styles.itemNameChecked,
              ]}>
                {item.amount ? `${item.amount} ` : ''}{item.name}
              </Text>
              <Text style={styles.itemRecipes}>
                For: {item.fromRecipes.join(', ')}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Already Have Section */}
      {shoppingList && shoppingList.alreadyHave.length > 0 && (
        <View style={styles.listSection}>
          <Text style={styles.listSectionTitle}>
            ✓ Already Have ({shoppingList.alreadyHave.length})
          </Text>
          {shoppingList.alreadyHave.map((item) => (
            <View key={item.id} style={styles.listItemDimmed}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <View style={styles.itemDetails}>
                <Text style={styles.itemNameDimmed}>
                  {item.amount ? `${item.amount} ` : ''}{item.name}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Add to Inventory Button */}
      {checkedItems.size > 0 && (
        <TouchableOpacity
          style={styles.addInventoryButton}
          onPress={handleAddToInventory}
          disabled={addingToInventory}
        >
          {addingToInventory ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.addInventoryText}>
                Add {checkedItems.size} Item{checkedItems.size > 1 ? 's' : ''} to Inventory
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading recipes...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shopping List</Text>
        <Text style={styles.subtitle}>Generate a list from your recipes</Text>
      </View>

      {shoppingList ? renderShoppingList() : renderRecipeSelector()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
  section: {
    backgroundColor: '#FFF',
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
    fontFamily: 'Poppins_400Regular',
  },
  recipeList: {
    gap: 8,
  },
  recipeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  recipeItemFavorite: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  recipeItemFavoriteSelected: {
    backgroundColor: '#FFECEC',
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  recipeItemSelected: {
    backgroundColor: '#E8F5E9',
  },
  recipeSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 8,
    marginBottom: 8,
  },
  recipeName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Poppins_400Regular',
  },
  recipeNameSelected: {
    color: '#000',
    fontWeight: '600',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
  listSection: {
    marginBottom: 20,
  },
  listSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  listItemDimmed: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    opacity: 0.6,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#000',
    fontFamily: 'Poppins_400Regular',
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  itemNameDimmed: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
  itemRecipes: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  addInventoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  addInventoryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
});

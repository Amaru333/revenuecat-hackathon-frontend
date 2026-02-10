import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getUserRecipes, Recipe } from '@/services/recipeService';
import {
  generateShoppingList,
  addItemsToInventory,
  getSavedShoppingLists,
  updateSavedShoppingList,
  deleteSavedShoppingList,
  addRecipesToList,
  addManualItemToList,
  ShoppingListItem,
  SavedShoppingList,
} from '@/services/shoppingService';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';

interface ShoppingList {
  needToBuy: ShoppingListItem[];
  alreadyHave: ShoppingListItem[];
  totalItems: number;
  recipesIncluded: { id: number; name: string }[];
  savedId?: number;
}

type Tab = 'saved' | 'generate';
type DetailMode = 'view' | 'add-recipes';

export default function ShoppingListScreen() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('saved');
  const [savedLists, setSavedLists] = useState<SavedShoppingList[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set());
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [addingToInventory, setAddingToInventory] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [detailMode, setDetailMode] = useState<DetailMode>('view');
  const [addingRecipes, setAddingRecipes] = useState(false);
  // Manual item input
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualItemName, setManualItemName] = useState('');
  const [manualItemAmount, setManualItemAmount] = useState('');
  const [addingManualItem, setAddingManualItem] = useState(false);
  // Multi-select for deletion
  const [deleteMode, setDeleteMode] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<Set<string>>(new Set());

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSavedLists = useCallback(async () => {
    if (!token) return;
    try {
      const lists = await getSavedShoppingLists(token);
      setSavedLists(lists);
    } catch (error) {
      console.error('Error fetching saved lists:', error);
    }
  }, [token]);

  const fetchRecipes = useCallback(async () => {
    if (!user?.id) return;
    try {
      const userRecipes = await getUserRecipes(user.id);
      setRecipes(userRecipes);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  }, [user?.id]);

  // Load saved lists + recipes on focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([fetchSavedLists(), fetchRecipes()]).finally(() => setLoading(false));
    }, [fetchSavedLists, fetchRecipes]),
  );

  // Open a saved list for viewing
  const openSavedList = (saved: SavedShoppingList) => {
    const restoredChecked = new Set<string>(saved.checkedItems || []);
    setShoppingList({
      needToBuy: saved.needToBuy,
      alreadyHave: saved.alreadyHave,
      totalItems: saved.totalItems,
      recipesIncluded: saved.recipesIncluded,
      savedId: saved.savedId,
    });
    setCheckedItems(restoredChecked);
    setDetailMode('view');
    setDeleteMode(false);
    setItemsToDelete(new Set());
    setShowManualInput(false);
    setActiveTab('saved');
  };

  // Close detail view and go to a tab
  const closeDetail = () => {
    setShoppingList(null);
    setCheckedItems(new Set());
    setDetailMode('view');
    setDeleteMode(false);
    setItemsToDelete(new Set());
    setShowManualInput(false);
  };

  const handleDeleteList = (id: number, name: string) => {
    Alert.alert('Delete List', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!token) return;
          setDeletingId(id);
          try {
            await deleteSavedShoppingList(id, token);
            setSavedLists((prev) => prev.filter((l) => l.savedId !== id));
            if (shoppingList?.savedId === id) {
              setShoppingList(null);
              setCheckedItems(new Set());
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert('Error', 'Failed to delete shopping list.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

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
      Alert.alert(
        'Select Recipes',
        'Please select at least one recipe to generate a shopping list.',
      );
      return;
    }

    setGenerating(true);
    try {
      const list = await generateShoppingList(Array.from(selectedRecipes), token);
      setShoppingList(list);
      setCheckedItems(new Set());
      setSelectedRecipes(new Set());
      // Refresh saved lists since generate auto-saves
      await fetchSavedLists();
      setActiveTab('saved');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error generating shopping list:', error);
      Alert.alert('Error', 'Failed to generate shopping list. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Persist checked items with debounce
  const persistCheckedItems = useCallback(
    (newChecked: Set<string>) => {
      if (!token || !shoppingList?.savedId) return;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(async () => {
        try {
          await updateSavedShoppingList(
            shoppingList.savedId!,
            { checkedItems: Array.from(newChecked) },
            token,
          );
        } catch (error) {
          console.error('Error persisting checked items:', error);
        }
      }, 600);
    },
    [token, shoppingList?.savedId],
  );

  const toggleItemCheck = (itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
    persistCheckedItems(newChecked);
  };

  const handleAddToInventory = async () => {
    if (!token || checkedItems.size === 0) {
      Alert.alert(
        'Select Items',
        "Please check off items you've purchased to add them to inventory.",
      );
      return;
    }

    const itemsToAdd = shoppingList?.needToBuy.filter((item) => checkedItems.has(item.id)) || [];

    if (itemsToAdd.length === 0) {
      Alert.alert('No Items', 'Please check items from the "Need to Buy" section.');
      return;
    }

    setAddingToInventory(true);
    try {
      await addItemsToInventory(itemsToAdd, token);
      Alert.alert('Success', `Added ${itemsToAdd.length} items to your inventory!`);

      // Update local state
      if (shoppingList) {
        const updatedNeedToBuy = shoppingList.needToBuy.filter(
          (item) => !checkedItems.has(item.id),
        );
        const addedItems = shoppingList.needToBuy.filter((item) => checkedItems.has(item.id));
        const updatedList = {
          ...shoppingList,
          needToBuy: updatedNeedToBuy,
          alreadyHave: [
            ...shoppingList.alreadyHave,
            ...addedItems.map((i) => ({ ...i, checked: true })),
          ],
        };
        setShoppingList(updatedList);
        setCheckedItems(new Set());

        // Persist the updated list
        if (shoppingList.savedId && token) {
          await updateSavedShoppingList(
            shoppingList.savedId,
            {
              needToBuy: updatedList.needToBuy,
              alreadyHave: updatedList.alreadyHave,
              checkedItems: [],
            },
            token,
          );
          await fetchSavedLists();
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error adding to inventory:', error);
      Alert.alert('Error', 'Failed to add items to inventory.');
    } finally {
      setAddingToInventory(false);
    }
  };

  // ─── Add recipes to existing list ───
  const handleAddRecipesToList = async () => {
    if (!token || !shoppingList?.savedId || selectedRecipes.size === 0) return;

    setAddingRecipes(true);
    try {
      const updated = await addRecipesToList(
        shoppingList.savedId,
        Array.from(selectedRecipes),
        token,
      );
      setShoppingList({
        ...updated,
        savedId: shoppingList.savedId,
      });
      setSelectedRecipes(new Set());
      setDetailMode('view');
      await fetchSavedLists();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error adding recipes to list:', error);
      Alert.alert('Error', 'Failed to add recipes to list.');
    } finally {
      setAddingRecipes(false);
    }
  };

  // ─── Add manual item ───
  const handleAddManualItem = async () => {
    if (!token || !shoppingList?.savedId || !manualItemName.trim()) return;

    setAddingManualItem(true);
    try {
      const newItem = await addManualItemToList(
        shoppingList.savedId,
        manualItemName.trim(),
        manualItemAmount.trim() || null,
        token,
      );
      setShoppingList((prev) =>
        prev ? { ...prev, needToBuy: [...prev.needToBuy, newItem] } : prev,
      );
      setManualItemName('');
      setManualItemAmount('');
      setShowManualInput(false);
      await fetchSavedLists();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error adding manual item:', error);
      Alert.alert('Error', 'Failed to add item.');
    } finally {
      setAddingManualItem(false);
    }
  };

  // ─── Delete individual item ───
  const handleDeleteItem = async (itemId: string) => {
    if (!token || !shoppingList?.savedId) return;

    const updatedNeedToBuy = shoppingList.needToBuy.filter((i) => i.id !== itemId);
    const updatedAlreadyHave = shoppingList.alreadyHave.filter((i) => i.id !== itemId);
    setShoppingList({
      ...shoppingList,
      needToBuy: updatedNeedToBuy,
      alreadyHave: updatedAlreadyHave,
    });

    // Remove from checked if present
    const newChecked = new Set(checkedItems);
    newChecked.delete(itemId);
    setCheckedItems(newChecked);

    try {
      await updateSavedShoppingList(
        shoppingList.savedId,
        {
          needToBuy: updatedNeedToBuy,
          alreadyHave: updatedAlreadyHave,
          totalItems: updatedNeedToBuy.length + updatedAlreadyHave.length,
          checkedItems: Array.from(newChecked),
        },
        token,
      );
      await fetchSavedLists();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  // ─── Delete selected items (multi-select) ───
  const handleDeleteSelectedItems = async () => {
    if (!token || !shoppingList?.savedId || itemsToDelete.size === 0) return;

    Alert.alert(
      'Delete Items',
      `Remove ${itemsToDelete.size} item${itemsToDelete.size > 1 ? 's' : ''} from list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedNeedToBuy = shoppingList.needToBuy.filter((i) => !itemsToDelete.has(i.id));
            const updatedAlreadyHave = shoppingList.alreadyHave.filter(
              (i) => !itemsToDelete.has(i.id),
            );
            const newChecked = new Set(
              Array.from(checkedItems).filter((id) => !itemsToDelete.has(id)),
            );

            setShoppingList({
              ...shoppingList,
              needToBuy: updatedNeedToBuy,
              alreadyHave: updatedAlreadyHave,
            });
            setCheckedItems(newChecked);
            setItemsToDelete(new Set());
            setDeleteMode(false);

            try {
              await updateSavedShoppingList(
                shoppingList.savedId!,
                {
                  needToBuy: updatedNeedToBuy,
                  alreadyHave: updatedAlreadyHave,
                  totalItems: updatedNeedToBuy.length + updatedAlreadyHave.length,
                  checkedItems: Array.from(newChecked),
                },
                token,
              );
              await fetchSavedLists();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Error deleting items:', error);
            }
          },
        },
      ],
    );
  };

  // ─── Clear all items ───
  const handleClearAllItems = async () => {
    if (!token || !shoppingList?.savedId) return;

    const totalCount = shoppingList.needToBuy.length + shoppingList.alreadyHave.length;
    if (totalCount === 0) return;

    Alert.alert('Clear All Items', `Remove all ${totalCount} items from this list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          setShoppingList({
            ...shoppingList,
            needToBuy: [],
            alreadyHave: [],
          });
          setCheckedItems(new Set());
          setDeleteMode(false);
          setItemsToDelete(new Set());

          try {
            await updateSavedShoppingList(
              shoppingList.savedId!,
              {
                needToBuy: [],
                alreadyHave: [],
                totalItems: 0,
                checkedItems: [],
              },
              token,
            );
            await fetchSavedLists();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error) {
            console.error('Error clearing items:', error);
          }
        },
      },
    ]);
  };

  const toggleDeleteSelection = (itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSet = new Set(itemsToDelete);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    setItemsToDelete(newSet);
  };

  // ─── Tab bar ───
  const renderTabs = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'saved' && !shoppingList && styles.tabActive]}
        onPress={() => {
          closeDetail();
          setActiveTab('saved');
        }}
      >
        <Ionicons
          name="list"
          size={18}
          color={activeTab === 'saved' && !shoppingList ? '#000' : '#999'}
        />
        <Text
          style={[styles.tabLabel, activeTab === 'saved' && !shoppingList && styles.tabLabelActive]}
        >
          My Lists
        </Text>
        {savedLists.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{savedLists.length}</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'generate' && !shoppingList && styles.tabActive]}
        onPress={() => {
          closeDetail();
          setActiveTab('generate');
        }}
      >
        <Ionicons
          name="add-circle-outline"
          size={18}
          color={activeTab === 'generate' && !shoppingList ? '#000' : '#999'}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === 'generate' && !shoppingList && styles.tabLabelActive,
          ]}
        >
          New List
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Saved lists overview ───
  const renderSavedLists = () => {
    if (savedLists.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>No shopping lists yet</Text>
          <Text style={styles.emptySubtitle}>Tap "New List" to generate one from your recipes</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => setActiveTab('generate')}>
            <Ionicons name="add-circle-outline" size={20} color="#FFF" />
            <Text style={styles.emptyButtonText}>Create Shopping List</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.savedListsContainer}>
        {savedLists.map((list) => {
          const checkedCount = (list.checkedItems || []).length;
          const totalNeedToBuy = list.needToBuy?.length || 0;
          const isActive = shoppingList?.savedId === list.savedId;

          return (
            <TouchableOpacity
              key={list.savedId}
              style={[styles.savedCard, isActive && styles.savedCardActive]}
              onPress={() => openSavedList(list)}
              activeOpacity={0.7}
            >
              <View style={styles.savedCardHeader}>
                <View style={styles.savedCardInfo}>
                  <Text style={styles.savedCardTitle} numberOfLines={2}>
                    {list.name}
                  </Text>
                  <Text style={styles.savedCardDate}>
                    {new Date(list.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteList(list.savedId, list.name)}
                  disabled={deletingId === list.savedId}
                >
                  {deletingId === list.savedId ? (
                    <ActivityIndicator size="small" color="#FF3B30" />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.savedCardStats}>
                <View style={styles.stat}>
                  <Ionicons name="cart" size={14} color="#666" />
                  <Text style={styles.statText}>{totalNeedToBuy} to buy</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                  <Text style={styles.statText}>{checkedCount} checked</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="restaurant" size={14} color="#666" />
                  <Text style={styles.statText}>
                    {list.recipesIncluded?.length || 0} recipe
                    {(list.recipesIncluded?.length || 0) !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              {totalNeedToBuy > 0 && (
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.round((checkedCount / totalNeedToBuy) * 100)}%`,
                      },
                    ]}
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ─── Recipe selector (Generate tab) ───
  const renderRecipeSelector = () => {
    const favoriteRecipes = recipes.filter((r) => r.isFavorite);
    const otherRecipes = recipes.filter((r) => !r.isFavorite);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Recipes</Text>
        <Text style={styles.sectionSubtitle}>Choose recipes to generate your shopping list</Text>

        {recipes.length === 0 ? (
          <Text style={styles.emptyText}>No saved recipes yet. Create some recipes first!</Text>
        ) : (
          <View style={styles.recipeList}>
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
                    <Text
                      style={[
                        styles.recipeName,
                        selectedRecipes.has(recipe.id) && styles.recipeNameSelected,
                      ]}
                    >
                      {recipe.name}
                    </Text>
                    <Ionicons name="heart" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                ))}
              </>
            )}

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
                    <Text
                      style={[
                        styles.recipeName,
                        selectedRecipes.has(recipe.id) && styles.recipeNameSelected,
                      ]}
                    >
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

  // ─── Add-recipes sub-view inside detail ───
  const renderAddRecipesPanel = () => {
    const alreadyIncluded = new Set(shoppingList?.recipesIncluded.map((r) => String(r.id)) || []);
    const availableRecipes = recipes.filter((r) => !alreadyIncluded.has(r.id));

    return (
      <View style={styles.section}>
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Add Recipes</Text>
          <TouchableOpacity
            onPress={() => {
              setDetailMode('view');
              setSelectedRecipes(new Set());
            }}
          >
            <Ionicons name="close-circle-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionSubtitle}>
          Select additional recipes to merge into this list
        </Text>

        {availableRecipes.length === 0 ? (
          <Text style={styles.emptyText}>All your recipes are already in this list!</Text>
        ) : (
          <View style={styles.recipeList}>
            {availableRecipes.map((recipe) => (
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
                <Text
                  style={[
                    styles.recipeName,
                    selectedRecipes.has(recipe.id) && styles.recipeNameSelected,
                  ]}
                >
                  {recipe.name}
                </Text>
                {recipe.isFavorite && <Ionicons name="heart" size={18} color="#FF3B30" />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {availableRecipes.length > 0 && (
          <TouchableOpacity
            style={[styles.generateButton, selectedRecipes.size === 0 && styles.buttonDisabled]}
            onPress={handleAddRecipesToList}
            disabled={selectedRecipes.size === 0 || addingRecipes}
          >
            {addingRecipes ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="add" size={20} color="#FFF" />
                <Text style={styles.generateButtonText}>
                  Add {selectedRecipes.size > 0 ? `${selectedRecipes.size} ` : ''}Recipe
                  {selectedRecipes.size !== 1 ? 's' : ''} to List
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ─── Active shopping list detail ───
  const renderShoppingList = () => {
    if (detailMode === 'add-recipes') {
      return renderAddRecipesPanel();
    }

    return (
      <View style={styles.section}>
        {/* Header */}
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Shopping List</Text>
          <TouchableOpacity onPress={closeDetail}>
            <Ionicons name="close-circle-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionSubtitle}>
          From: {shoppingList?.recipesIncluded.map((r) => r.name).join(', ')}
        </Text>

        {/* Action bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionChip}
            onPress={() => {
              setDetailMode('add-recipes');
              setSelectedRecipes(new Set());
            }}
          >
            <Ionicons name="restaurant-outline" size={16} color="#333" />
            <Text style={styles.actionChipText}>Add Recipes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionChip}
            onPress={() => setShowManualInput(!showManualInput)}
          >
            <Ionicons name="create-outline" size={16} color="#333" />
            <Text style={styles.actionChipText}>Add Item</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionChip, deleteMode && styles.actionChipActive]}
            onPress={() => {
              setDeleteMode(!deleteMode);
              setItemsToDelete(new Set());
            }}
          >
            <Ionicons name="trash-outline" size={16} color={deleteMode ? '#FFF' : '#FF3B30'} />
            <Text style={[styles.actionChipText, deleteMode && styles.actionChipTextActive]}>
              {deleteMode ? 'Cancel' : 'Remove'}
            </Text>
          </TouchableOpacity>

          {(shoppingList?.needToBuy.length ?? 0) + (shoppingList?.alreadyHave.length ?? 0) > 0 && (
            <TouchableOpacity
              style={[styles.actionChip, { borderColor: '#FF3B30' }]}
              onPress={handleClearAllItems}
            >
              <Ionicons name="close-circle-outline" size={16} color="#FF3B30" />
              <Text style={[styles.actionChipText, { color: '#FF3B30' }]}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Manual item input */}
        {showManualInput && (
          <View style={styles.manualInputContainer}>
            <TextInput
              style={styles.manualInput}
              placeholder="Item name (e.g. Olive oil)"
              placeholderTextColor="#999"
              value={manualItemName}
              onChangeText={setManualItemName}
              autoFocus
            />
            <TextInput
              style={[styles.manualInput, styles.manualInputSmall]}
              placeholder="Amount (optional)"
              placeholderTextColor="#999"
              value={manualItemAmount}
              onChangeText={setManualItemAmount}
            />
            <TouchableOpacity
              style={[styles.manualAddButton, !manualItemName.trim() && styles.buttonDisabled]}
              onPress={handleAddManualItem}
              disabled={!manualItemName.trim() || addingManualItem}
            >
              {addingManualItem ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="add" size={18} color="#FFF" />
                  <Text style={styles.manualAddText}>Add</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Delete mode toolbar */}
        {deleteMode && (
          <View style={styles.deleteToolbar}>
            <Text style={styles.deleteToolbarText}>{itemsToDelete.size} selected</Text>
            <TouchableOpacity
              onPress={() => {
                const allIds = [
                  ...(shoppingList?.needToBuy.map((i) => i.id) || []),
                  ...(shoppingList?.alreadyHave.map((i) => i.id) || []),
                ];
                setItemsToDelete(new Set(allIds));
              }}
            >
              <Text style={styles.deleteToolbarAction}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.deleteConfirmButton,
                itemsToDelete.size === 0 && styles.buttonDisabled,
              ]}
              onPress={handleDeleteSelectedItems}
              disabled={itemsToDelete.size === 0}
            >
              <Ionicons name="trash" size={16} color="#FFF" />
              <Text style={styles.deleteConfirmText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Need to Buy */}
        <View style={styles.listSection}>
          <Text style={styles.listSectionTitle}>
            🛒 Need to Buy ({shoppingList?.needToBuy.length})
          </Text>
          {shoppingList?.needToBuy.length === 0 && (
            <Text style={styles.emptyText}>No items — add recipes or items above</Text>
          )}
          {shoppingList?.needToBuy.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.listItem}
              onPress={() =>
                deleteMode ? toggleDeleteSelection(item.id) : toggleItemCheck(item.id)
              }
              onLongPress={() => {
                if (!deleteMode) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Alert.alert('Remove Item', `Remove "${item.name}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove',
                      style: 'destructive',
                      onPress: () => handleDeleteItem(item.id),
                    },
                  ]);
                }
              }}
            >
              {deleteMode ? (
                <Ionicons
                  name={itemsToDelete.has(item.id) ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={itemsToDelete.has(item.id) ? '#FF3B30' : '#999'}
                />
              ) : (
                <Ionicons
                  name={checkedItems.has(item.id) ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={checkedItems.has(item.id) ? '#4CAF50' : '#999'}
                />
              )}
              <View style={styles.itemDetails}>
                <Text
                  style={[
                    styles.itemName,
                    !deleteMode && checkedItems.has(item.id) && styles.itemNameChecked,
                  ]}
                >
                  {item.amount ? `${item.amount} ` : ''}
                  {item.name}
                </Text>
                <Text style={styles.itemRecipes}>For: {item.fromRecipes.join(', ')}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Already Have */}
        {shoppingList && shoppingList.alreadyHave.length > 0 && (
          <View style={styles.listSection}>
            <Text style={styles.listSectionTitle}>
              ✓ Already Have ({shoppingList.alreadyHave.length})
            </Text>
            {shoppingList.alreadyHave.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.listItemDimmed}
                onPress={() => (deleteMode ? toggleDeleteSelection(item.id) : undefined)}
                onLongPress={() => {
                  if (!deleteMode) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert('Remove Item', `Remove "${item.name}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => handleDeleteItem(item.id),
                      },
                    ]);
                  }
                }}
              >
                {deleteMode ? (
                  <Ionicons
                    name={itemsToDelete.has(item.id) ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={itemsToDelete.has(item.id) ? '#FF3B30' : '#999'}
                  />
                ) : (
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                )}
                <View style={styles.itemDetails}>
                  <Text style={styles.itemNameDimmed}>
                    {item.amount ? `${item.amount} ` : ''}
                    {item.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Add to Inventory */}
        {!deleteMode && checkedItems.size > 0 && (
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
                  Add {checkedItems.size} Item
                  {checkedItems.size > 1 ? 's' : ''} to Inventory
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading shopping lists...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shopping List</Text>
        <Text style={styles.subtitle}>
          {savedLists.length > 0
            ? `${savedLists.length} saved list${savedLists.length > 1 ? 's' : ''}`
            : 'Generate a list from your recipes'}
        </Text>
      </View>

      {renderTabs()}

      {shoppingList
        ? renderShoppingList()
        : activeTab === 'saved'
          ? renderSavedLists()
          : renderRecipeSelector()}
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
    paddingBottom: 12,
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

  // ─── Tabs ───
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#FFF3ED',
  },
  tabLabel: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Poppins_600SemiBold',
  },
  tabLabelActive: {
    color: '#FF6B35',
  },
  badge: {
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // ─── Empty state ───
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'Poppins_400Regular',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },

  // ─── Saved list cards ───
  savedListsContainer: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 40,
  },
  savedCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  savedCardActive: {
    borderColor: '#000',
    borderWidth: 2,
  },
  savedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  savedCardInfo: {
    flex: 1,
    marginRight: 12,
  },
  savedCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  savedCardDate: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
  },
  deleteButton: {
    padding: 4,
  },
  savedCardStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },

  // ─── Section (recipe selector / detail) ───
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

  // ─── Recipe list ───
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
    backgroundColor: '#FF6B35',
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

  // ─── Shopping list detail ───
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  actionChipActive: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  actionChipText: {
    fontSize: 13,
    color: '#333',
    fontFamily: 'Poppins_400Regular',
  },
  actionChipTextActive: {
    color: '#FFF',
  },
  manualInputContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  manualInput: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: '#000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  manualInputSmall: {
    flex: 0,
  },
  manualAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FF6B35',
    paddingVertical: 10,
    borderRadius: 8,
  },
  manualAddText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  deleteToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF5F5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  deleteToolbarText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
  deleteToolbarAction: {
    fontSize: 13,
    color: '#007AFF',
    fontFamily: 'Poppins_600SemiBold',
  },
  deleteConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteConfirmText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
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

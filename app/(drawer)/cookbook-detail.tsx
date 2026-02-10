import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCookbookRecipes,
  checkIngredients,
  saveCookbookRecipeToMyRecipes,
  CookbookRecipe,
  CookbookRecipeIngredient,
  IngredientCheckResult,
  Nutrition,
} from '@/services/cookbookService';
import { generateShoppingList } from '@/services/shoppingService';

export default function CookbookDetailScreen() {
  const { token } = useAuth();
  const { cookbookId, cookbookName } = useLocalSearchParams<{
    cookbookId: string;
    cookbookName: string;
  }>();

  const [recipes, setRecipes] = useState<CookbookRecipe[]>([]);
  const [cookbook, setCookbook] = useState<{ id: number; name: string; description: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingRecipeId, setCheckingRecipeId] = useState<number | null>(null);
  const [savingRecipeId, setSavingRecipeId] = useState<number | null>(null);
  const [expandedRecipeId, setExpandedRecipeId] = useState<number | null>(null);

  // Ingredient check modal state
  const [ingredientModal, setIngredientModal] = useState(false);
  const [ingredientResult, setIngredientResult] = useState<IngredientCheckResult | null>(null);

  const fetchRecipes = useCallback(
    async (isRefreshing = false) => {
      if (!token || !cookbookId) {
        setLoading(false);
        return;
      }

      try {
        if (!isRefreshing) setLoading(true);
        const data = await getCookbookRecipes(parseInt(cookbookId), token);
        setCookbook(data.cookbook);
        setRecipes(data.recipes);
      } catch (err: any) {
        console.error('Failed to fetch cookbook recipes:', err);
        Alert.alert('Error', err.message || 'Failed to load recipes');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, cookbookId],
  );

  useFocusEffect(
    useCallback(() => {
      fetchRecipes();
    }, [fetchRecipes]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecipes(true);
  };

  const handleCheckIngredients = async (recipe: CookbookRecipe) => {
    if (!token) return;

    setCheckingRecipeId(recipe.id);
    try {
      const result = await checkIngredients(recipe.id, token);
      setIngredientResult(result);
      setIngredientModal(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to check ingredients');
    } finally {
      setCheckingRecipeId(null);
    }
  };

  const handleAddToShoppingList = async (recipe: CookbookRecipe) => {
    if (!token) return;

    setSavingRecipeId(recipe.id);
    try {
      // First save the cookbook recipe as a regular recipe
      const savedRecipe = await saveCookbookRecipeToMyRecipes(recipe.id, token);

      // Then generate a shopping list from it
      await generateShoppingList([savedRecipe.id.toString()], token);

      Alert.alert('Success! 🛒', `"${recipe.name}" has been saved to your recipes and a shopping list has been generated!`, [
        { text: 'View Shopping List', onPress: () => router.push('/(drawer)/shopping-list') },
        { text: 'Stay Here', style: 'cancel' },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create shopping list');
    } finally {
      setSavingRecipeId(null);
    }
  };

  const handleSaveRecipe = async (recipe: CookbookRecipe) => {
    if (!token) return;

    setSavingRecipeId(recipe.id);
    try {
      await saveCookbookRecipeToMyRecipes(recipe.id, token);
      Alert.alert('Saved! ✅', `"${recipe.name}" has been added to your recipes.`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save recipe');
    } finally {
      setSavingRecipeId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading recipes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Ionicons name="book" size={28} color="#8B5CF6" />
          <Text style={styles.headerTitle} numberOfLines={2}>
            {cookbookName || cookbook?.name || 'Cookbook'}
          </Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} found
        </Text>

        {recipes.map((recipe) => {
          const isExpanded = expandedRecipeId === recipe.id;
          return (
          <View key={recipe.id} style={styles.recipeCard}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setExpandedRecipeId(isExpanded ? null : recipe.id)}
            >
              <View style={styles.recipeHeader}>
                <Text style={styles.recipeName}>{recipe.name}</Text>
                <View style={styles.recipeHeaderRight}>
                  {recipe.pageNumber ? (
                    <Text style={styles.pageNumber}>p. {recipe.pageNumber}</Text>
                  ) : null}
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#999"
                  />
                </View>
              </View>

              {recipe.description ? (
                <Text style={styles.recipeDescription} numberOfLines={isExpanded ? undefined : 2}>
                  {recipe.description}
                </Text>
              ) : null}

              <View style={styles.recipeMetaContainer}>
                {recipe.prepTime && (
                  <View style={styles.recipeMeta}>
                    <Ionicons name="time-outline" size={14} color="#666" />
                    <Text style={styles.recipeMetaText}>{recipe.prepTime}</Text>
                  </View>
                )}
                {recipe.cookTime && (
                  <View style={styles.recipeMeta}>
                    <Ionicons name="flame-outline" size={14} color="#666" />
                    <Text style={styles.recipeMetaText}>{recipe.cookTime}</Text>
                  </View>
                )}
                {recipe.servings && (
                  <View style={styles.recipeMeta}>
                    <Ionicons name="people-outline" size={14} color="#666" />
                    <Text style={styles.recipeMetaText}>{recipe.servings} servings</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {!isExpanded && (
              <View style={styles.ingredientsPreview}>
                <Text style={styles.ingredientsLabel}>
                  Ingredients ({Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0})
                </Text>
                <Text style={styles.ingredientsText} numberOfLines={2}>
                  {Array.isArray(recipe.ingredients)
                    ? recipe.ingredients
                        .slice(0, 4)
                        .map((ing: CookbookRecipeIngredient) => ing.item || String(ing))
                        .join(', ')
                    : ''}
                  {Array.isArray(recipe.ingredients) && recipe.ingredients.length > 4 ? '...' : ''}
                </Text>
              </View>
            )}

            {isExpanded && (
              <View style={styles.expandedSection}>
                {/* Full Ingredients */}
                <View style={styles.expandedBlock}>
                  <Text style={styles.expandedBlockTitle}>
                    🧂 Ingredients ({Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0})
                  </Text>
                  {Array.isArray(recipe.ingredients) &&
                    recipe.ingredients.map((ing: CookbookRecipeIngredient, idx: number) => (
                      <View key={`ing-${idx}`} style={styles.expandedIngredientRow}>
                        <Text style={styles.expandedBullet}>•</Text>
                        <Text style={styles.expandedIngredientText}>
                          {ing.amount ? `${ing.amount} ` : ''}{ing.item}
                        </Text>
                      </View>
                    ))}
                </View>

                {/* Full Instructions */}
                {Array.isArray(recipe.instructions) && recipe.instructions.length > 0 && (
                  <View style={styles.expandedBlock}>
                    <Text style={styles.expandedBlockTitle}>👩‍🍳 Instructions</Text>
                    {recipe.instructions.map((step: string, idx: number) => (
                      <View key={`step-${idx}`} style={styles.expandedStepRow}>
                        <View style={styles.stepNumber}>
                          <Text style={styles.stepNumberText}>{idx + 1}</Text>
                        </View>
                        <Text style={styles.expandedStepText}>{step}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Nutrition */}
                {recipe.nutrition && (
                  <View style={styles.nutritionCard}>
                    <Text style={styles.expandedBlockTitle}>🔥 Nutrition (per serving)</Text>
                    <View style={styles.nutritionGrid}>
                      <View style={styles.nutritionItem}>
                        <Text style={styles.nutritionValue}>{recipe.nutrition.calories}</Text>
                        <Text style={styles.nutritionLabel}>Calories</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Text style={styles.nutritionValue}>{recipe.nutrition.protein}</Text>
                        <Text style={styles.nutritionLabel}>Protein</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Text style={styles.nutritionValue}>{recipe.nutrition.carbs}</Text>
                        <Text style={styles.nutritionLabel}>Carbs</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Text style={styles.nutritionValue}>{recipe.nutrition.fat}</Text>
                        <Text style={styles.nutritionLabel}>Fat</Text>
                      </View>
                      {recipe.nutrition.fiber && (
                        <View style={styles.nutritionItem}>
                          <Text style={styles.nutritionValue}>{recipe.nutrition.fiber}</Text>
                          <Text style={styles.nutritionLabel}>Fiber</Text>
                        </View>
                      )}
                      {recipe.nutrition.sugar && (
                        <View style={styles.nutritionItem}>
                          <Text style={styles.nutritionValue}>{recipe.nutrition.sugar}</Text>
                          <Text style={styles.nutritionLabel}>Sugar</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.checkButton}
                onPress={() => handleCheckIngredients(recipe)}
                disabled={checkingRecipeId === recipe.id}
                activeOpacity={0.7}
              >
                {checkingRecipeId === recipe.id ? (
                  <ActivityIndicator size="small" color="#8B5CF6" />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={18} color="#8B5CF6" />
                )}
                <Text style={styles.checkButtonText}>Check Ingredients</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => handleSaveRecipe(recipe)}
                disabled={savingRecipeId === recipe.id}
                activeOpacity={0.7}
              >
                {savingRecipeId === recipe.id ? (
                  <ActivityIndicator size="small" color="#FF6B35" />
                ) : (
                  <Ionicons name="bookmark-outline" size={18} color="#FF6B35" />
                )}
                <Text style={styles.saveButtonText}>Save Recipe</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shopButton}
                onPress={() => handleAddToShoppingList(recipe)}
                disabled={savingRecipeId === recipe.id}
                activeOpacity={0.7}
              >
                {savingRecipeId === recipe.id ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="cart-outline" size={18} color="#FFF" />
                )}
                <Text style={styles.shopButtonText}>Shopping List</Text>
              </TouchableOpacity>
            </View>
          </View>
          );
        })}
      </ScrollView>

      {/* Ingredient Check Modal */}
      <Modal visible={ingredientModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ingredient Check</Text>
              <TouchableOpacity onPress={() => setIngredientModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {ingredientResult && (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalRecipeName}>{ingredientResult.recipeName}</Text>

                {ingredientResult.canMake ? (
                  <View style={styles.canMakeBanner}>
                    <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                    <Text style={styles.canMakeText}>You have all ingredients!</Text>
                  </View>
                ) : (
                  <View style={styles.cantMakeBanner}>
                    <Ionicons name="alert-circle" size={24} color="#FF9500" />
                    <Text style={styles.cantMakeText}>
                      Missing {ingredientResult.missingCount} of {ingredientResult.totalIngredients}{' '}
                      ingredients
                    </Text>
                  </View>
                )}

                {ingredientResult.matched.length > 0 && (
                  <View style={styles.ingredientSection}>
                    <Text style={styles.sectionTitle}>
                      ✅ You Have ({ingredientResult.matchedCount})
                    </Text>
                    {ingredientResult.matched.map((ing, idx) => (
                      <View key={`matched-${idx}`} style={styles.ingredientRow}>
                        <Ionicons name="checkmark" size={16} color="#34C759" />
                        <Text style={styles.ingredientItemText}>
                          {ing.amount ? `${ing.amount} ` : ''}
                          {ing.item}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {ingredientResult.missing.length > 0 && (
                  <View style={styles.ingredientSection}>
                    <Text style={styles.sectionTitle}>
                      ❌ Missing ({ingredientResult.missingCount})
                    </Text>
                    {ingredientResult.missing.map((ing, idx) => (
                      <View key={`missing-${idx}`} style={styles.ingredientRow}>
                        <Ionicons name="close" size={16} color="#FF3B30" />
                        <Text style={styles.ingredientItemText}>
                          {ing.amount ? `${ing.amount} ` : ''}
                          {ing.item}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {!ingredientResult.canMake && (
                  <TouchableOpacity
                    style={styles.shopFromModalButton}
                    onPress={() => {
                      setIngredientModal(false);
                      const recipeToShop = recipes.find(
                        (r) => r.name === ingredientResult.recipeName,
                      );
                      if (recipeToShop) handleAddToShoppingList(recipeToShop);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="cart" size={20} color="#FFF" />
                    <Text style={styles.shopFromModalText}>Generate Shopping List</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    fontFamily: 'Poppins_400Regular',
  },
  recipeCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recipeHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recipeName: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
    marginRight: 8,
  },
  pageNumber: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontFamily: 'Poppins_400Regular',
  },
  recipeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  recipeMetaContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recipeMetaText: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
  ingredientsPreview: {
    backgroundColor: '#F8F5FF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8DFFF',
    marginBottom: 12,
    marginTop: 4,
  },
  ingredientsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
    fontFamily: 'Poppins_600SemiBold',
  },
  ingredientsText: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
  expandedSection: {
    marginTop: 4,
    marginBottom: 12,
  },
  expandedBlock: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  expandedBlockTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 10,
    fontFamily: 'Poppins_600SemiBold',
  },
  expandedIngredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 3,
    gap: 8,
  },
  expandedBullet: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
    marginTop: 1,
  },
  expandedIngredientText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
  },
  expandedStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  expandedStepText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 21,
    fontFamily: 'Poppins_400Regular',
  },
  nutritionCard: {
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFE8D0',
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nutritionItem: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 80,
    flex: 1,
    borderWidth: 1,
    borderColor: '#F0E8DC',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B35',
    fontFamily: 'Poppins_600SemiBold',
  },
  nutritionLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
    fontFamily: 'Poppins_400Regular',
  },
  actionButtons: {
    marginBottom: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F0EBFF',
  },
  checkButtonText: {
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FFF3ED',
  },
  saveButtonText: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#8B5CF6',
  },
  shopButtonText: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  modalScroll: {
    flex: 1,
  },
  modalRecipeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  canMakeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#E8FAE8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  canMakeText: {
    fontSize: 16,
    color: '#1B5E20',
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  cantMakeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  cantMakeText: {
    fontSize: 16,
    color: '#E65100',
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  ingredientSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: '#000',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  ingredientItemText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    fontFamily: 'Poppins_400Regular',
  },
  shopFromModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  shopFromModalText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
});

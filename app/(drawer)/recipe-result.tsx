import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Recipe, saveRecipeFromSuggestion, deleteRecipe, toggleFavorite } from '@/services/recipeService';
import { useAuth } from '@/contexts/AuthContext';
import { getRecipeCookStats, logCook, CookStats } from '@/services/cookHistoryService';

export default function RecipeResultScreen() {
  const params = useLocalSearchParams();
  const { token } = useAuth();
  
  // Parse the recipe data from URL params
  const initialRecipe: Recipe = params.recipe ? JSON.parse(params.recipe as string) : null;
  
  // State for the recipe (may be updated with saved ID)
  const [recipe, setRecipe] = useState<Recipe>(initialRecipe);
  
  // State for ingredient checklist
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isFavorite, setIsFavorite] = useState(initialRecipe?.isFavorite || false);
  
  // Cook history state
  const [cookStats, setCookStats] = useState<CookStats | null>(null);
  const [isLoggingCook, setIsLoggingCook] = useState(false);

  // Auto-save recipe if it's from suggestions (negative ID)
  useEffect(() => {
    const saveRecipeIfNeeded = async () => {
      if (!recipe || !token) return;
      
      const recipeId = parseInt(recipe.id);
      // Check if this is a suggestion (negative ID) and hasn't been saved yet
      if (recipeId < 0 && !isSaving) {
        setIsSaving(true);
        try {
          console.log('Saving recipe from suggestion:', recipe.name);
          const savedRecipe = await saveRecipeFromSuggestion(recipe, token);
          console.log('Recipe saved with ID:', savedRecipe.id);
          // Update recipe with the new database ID
          setRecipe(savedRecipe);
        } catch (error) {
          console.error('Failed to save recipe:', error);
          // Continue showing the recipe even if save fails
        } finally {
          setIsSaving(false);
        }
      }
    };

    saveRecipeIfNeeded();
  }, [recipe?.id, token]);

  // Fetch cook stats
  const fetchCookStats = useCallback(async () => {
    if (!recipe?.id || !token) return;
    const recipeId = Number(recipe.id);
    if (recipeId <= 0) return; // Skip for unsaved recipes
    
    try {
      const stats = await getRecipeCookStats(recipeId, token);
      setCookStats(stats);
    } catch (error) {
      console.error('Failed to fetch cook stats:', error);
    }
  }, [recipe?.id, token]);

  useFocusEffect(
    useCallback(() => {
      fetchCookStats();
    }, [fetchCookStats])
  );

  const handleQuickLog = async () => {
    if (!recipe?.id || !token) return;
    
    setIsLoggingCook(true);
    try {
      await logCook(Number(recipe.id), undefined, undefined, token);
      Alert.alert('Logged!', 'Cook recorded! 👨‍🍳');
      fetchCookStats(); // Refresh stats
    } catch (error) {
      console.error('Failed to log cook:', error);
      Alert.alert('Error', 'Failed to log cook');
    } finally {
      setIsLoggingCook(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Recipe',
      'Are you sure you want to delete this recipe? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!token || !recipe) return;
            
            try {
              await deleteRecipe(recipe.id, token);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete recipe. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleToggleFavorite = async () => {
    if (!token || !recipe) return;
    
    // Optimistic update
    setIsFavorite(!isFavorite);
    
    try {
      const newFavoriteStatus = await toggleFavorite(recipe.id, token);
      setIsFavorite(newFavoriteStatus);
    } catch (error) {
      // Revert on error
      setIsFavorite(!isFavorite);
      Alert.alert('Error', 'Failed to update favorite status. Please try again.');
    }
  };

  const toggleIngredient = (index: number) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedIngredients(newChecked);
  };

  if (!recipe) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No recipe data found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.recipeResultsContainer}>
        <View style={styles.recipeHeader}>
          <Text style={styles.recipeName}>{recipe.name}</Text>
          <Text style={styles.recipeDescription}>{recipe.description}</Text>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={handleToggleFavorite}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={24}
                color={isFavorite ? "#FF3B30" : "#666"}
              />
              <Text style={[styles.actionButtonText, isFavorite && styles.favoriteText]}>
                {isFavorite ? 'Favorited' : 'Favorite'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
          
          {/* Cook Stats Badge */}
          {cookStats && cookStats.cookCount > 0 && (
            <View style={styles.cookStatsBadge}>
              <Ionicons name="restaurant" size={16} color="#4CAF50" />
              <Text style={styles.cookStatsText}>
                Made {cookStats.cookCount} time{cookStats.cookCount !== 1 ? 's' : ''}
                {cookStats.averageRating && ` • ${cookStats.averageRating}★`}
              </Text>
            </View>
          )}
        </View>

        {/* Recipe Info */}
        <View style={styles.recipeInfoRow}>
          <View style={styles.infoBox}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.infoBoxLabel}>Prep</Text>
            <Text style={styles.infoBoxValue}>{recipe.prepTime}</Text>
          </View>
          <View style={styles.infoBox}>
            <Ionicons name="flame-outline" size={20} color="#666" />
            <Text style={styles.infoBoxLabel}>Cook</Text>
            <Text style={styles.infoBoxValue}>{recipe.cookTime}</Text>
          </View>
          <View style={styles.infoBox}>
            <Ionicons name="people-outline" size={20} color="#666" />
            <Text style={styles.infoBoxLabel}>Serves</Text>
            <Text style={styles.infoBoxValue}>{recipe.servings}</Text>
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.recipeSection}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {recipe.ingredients.map((ingredient, index) => {
            const isChecked = checkedIngredients.has(index);
            // Handle both string and object formats
            const ingredientText = typeof ingredient === 'string' 
              ? ingredient 
              : `${(ingredient as any).amount || ''} ${(ingredient as any).item || ''}`.trim();
            
            return (
              <TouchableOpacity
                key={index}
                style={styles.ingredientItem}
                onPress={() => toggleIngredient(index)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isChecked ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={isChecked ? "#4CAF50" : "#CCC"}
                />
                <Text
                  style={[
                    styles.ingredientText,
                    isChecked && styles.ingredientTextChecked
                  ]}
                >
                  {ingredientText}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Instructions */}
        <View style={styles.recipeSection}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          {recipe.instructions.map((instruction, index) => (
            <View key={index} style={styles.instructionItem}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.instructionText}>{instruction}</Text>
            </View>
          ))}
        </View>

        {/* Nutrition */}
        {recipe.nutrition && (
          <View style={styles.recipeSection}>
            <Text style={styles.sectionTitle}>Nutrition (per serving)</Text>
            <View style={styles.nutritionGrid}>
              {recipe.nutrition.calories != null && (
                <View style={styles.nutritionBox}>
                  <Text style={styles.nutritionValue}>{String(recipe.nutrition.calories)}</Text>
                  <Text style={styles.nutritionLabel}>Calories</Text>
                </View>
              )}
              {recipe.nutrition.protein != null && recipe.nutrition.protein !== '' && (
                <View style={styles.nutritionBox}>
                  <Text style={styles.nutritionValue}>{String(recipe.nutrition.protein)}</Text>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                </View>
              )}
              {recipe.nutrition.carbs != null && recipe.nutrition.carbs !== '' && (
                <View style={styles.nutritionBox}>
                  <Text style={styles.nutritionValue}>{String(recipe.nutrition.carbs)}</Text>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                </View>
              )}
              {recipe.nutrition.fat != null && recipe.nutrition.fat !== '' && (
                <View style={styles.nutritionBox}>
                  <Text style={styles.nutritionValue}>{String(recipe.nutrition.fat)}</Text>
                  <Text style={styles.nutritionLabel}>Fat</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Start Cooking Button */}
        <TouchableOpacity
          style={styles.startCookingButton}
          onPress={() => router.push({
            pathname: '/(drawer)/cooking-mode',
            params: { recipe: JSON.stringify(recipe) },
          })}
        >
          <Ionicons name="restaurant" size={22} color="#FFF" />
          <Text style={styles.startCookingText}>Start Cooking</Text>
        </TouchableOpacity>
        
        {/* I Made This Button */}
        <TouchableOpacity
          style={styles.madeThisButton}
          onPress={handleQuickLog}
          disabled={isLoggingCook}
        >
          {isLoggingCook ? (
            <ActivityIndicator color="#4CAF50" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={22} color="#4CAF50" />
              <Text style={styles.madeThisText}>I Made This!</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Try Another Button */}
        <TouchableOpacity
          style={styles.tryAnotherButton}
          onPress={() => router.back()}
        >
          <Ionicons name="add-circle-outline" size={22} color="#000" />
          <Text style={styles.tryAnotherText}>Try Another</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 100,
    fontFamily: 'Poppins_400Regular',
  },
  backButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#000',
    borderRadius: 8,
    alignSelf: 'center',
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  recipeResultsContainer: {
    backgroundColor: '#FFF',
    margin: 20,
    borderRadius: 16,
    padding: 20,
  },
  recipeHeader: {
    marginBottom: 20,
  },
  recipeName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 8,
  },
  recipeDescription: {
    fontSize: 15,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  favoriteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'Poppins_600SemiBold',
  },
  favoriteText: {
    color: '#FF3B30',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
    fontFamily: 'Poppins_600SemiBold',
  },
  recipeInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  infoBox: {
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: 4,
    flex: 1,
  },
  infoBoxLabel: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Poppins_400Regular',
  },
  infoBoxValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },
  recipeSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 16,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  ingredientText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontFamily: 'Poppins_400Regular',
    lineHeight: 22,
  },
  ingredientTextChecked: {
    textDecorationLine: 'line-through',
    color: '#999',
    opacity: 0.6,
  },
  instructionItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Poppins_600SemiBold',
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontFamily: 'Poppins_400Regular',
    lineHeight: 22,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nutritionBox: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#666',
  },
  startCookingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: '#000',
    borderRadius: 12,
    marginTop: 8,
  },
  startCookingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Poppins_600SemiBold',
  },
  tryAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginTop: 8,
  },
  tryAnotherText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  cookStatsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 12,
    alignSelf: 'center',
  },
  cookStatsText: {
    fontSize: 14,
    color: '#4CAF50',
    fontFamily: 'Poppins_500Medium',
  },
  madeThisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  madeThisText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    fontFamily: 'Poppins_600SemiBold',
  },
});

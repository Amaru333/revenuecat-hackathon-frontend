import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getSuggestionsFromInventory, Recipe } from '@/services/recipeService';

export default function SuggestionsScreen() {
  const { token } = useAuth();
  const [suggestions, setSuggestions] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    if (!token) {
      setError('Please log in to view suggestions');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const recipes = await getSuggestionsFromInventory(token);
      setSuggestions(recipes);
    } catch (err: any) {
      console.error('Failed to fetch suggestions:', err);
      setError(err.message || 'Failed to load recipe suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleRecipePress = (recipe: Recipe) => {
    router.push({
      pathname: '/(drawer)/recipe-result',
      params: {
        recipe: JSON.stringify(recipe),
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Generating recipe suggestions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={80} color="#FF3B30" />
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchSuggestions}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (suggestions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="restaurant-outline" size={80} color="#CCC" />
        <Text style={styles.emptyTitle}>No Suggestions Available</Text>
        <Text style={styles.emptyText}>
          Add items to your inventory to get personalized recipe suggestions!
        </Text>
        <TouchableOpacity 
          style={styles.inventoryButton} 
          onPress={() => router.push('/(drawer)/inventory')}
        >
          <Text style={styles.inventoryButtonText}>Go to Inventory</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="sparkles" size={28} color="#000" />
          <Text style={styles.headerTitle}>Recipe Suggestions</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Based on your inventory items
        </Text>

        {suggestions.map((recipe, index) => (
          <TouchableOpacity
            key={recipe.id || index}
            style={styles.recipeCard}
            onPress={() => handleRecipePress(recipe)}
            activeOpacity={0.7}
          >
            <View style={styles.recipeHeader}>
              <Text style={styles.recipeName}>{recipe.name}</Text>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </View>
            
            <Text style={styles.recipeDescription} numberOfLines={2}>
              {recipe.description}
            </Text>

            <View style={styles.recipeMetaContainer}>
              <View style={styles.recipeMeta}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.recipeMetaText}>
                  {recipe.prepTime} prep
                </Text>
              </View>
              <View style={styles.recipeMeta}>
                <Ionicons name="flame-outline" size={16} color="#666" />
                <Text style={styles.recipeMetaText}>
                  {recipe.cookTime} cook
                </Text>
              </View>
              <View style={styles.recipeMeta}>
                <Ionicons name="people-outline" size={16} color="#666" />
                <Text style={styles.recipeMetaText}>
                  {recipe.servings} servings
                </Text>
              </View>
            </View>

            <View style={styles.ingredientsPreview}>
              <Text style={styles.ingredientsLabel}>Key Ingredients:</Text>
              <Text style={styles.ingredientsText} numberOfLines={2}>
                {recipe.ingredients.slice(0, 3).join(', ')}
                {recipe.ingredients.length > 3 ? '...' : ''}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Poppins_600SemiBold',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Poppins_400Regular',
  },
  retryButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Poppins_600SemiBold',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Poppins_400Regular',
  },
  inventoryButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  inventoryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
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
    fontSize: 28,
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
    alignItems: 'center',
    marginBottom: 12,
  },
  recipeName: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  recipeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  recipeMetaContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recipeMetaText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
  ingredientsPreview: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
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
});

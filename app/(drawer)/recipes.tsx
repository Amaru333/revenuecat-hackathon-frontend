import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
} from 'react-native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getUserRecipes, deleteRecipe, Recipe } from '@/services/recipeService';
import { router, useFocusEffect } from 'expo-router';

export default function RecipesScreen() {
  const { user, token } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const fetchRecipes = useCallback(
    async (isRefreshing = false) => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        if (!isRefreshing) setLoading(true);
        const userRecipes = await getUserRecipes(user.id);
        setRecipes(userRecipes);
      } catch (error) {
        console.error('Error fetching recipes:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id],
  );

  // Refresh recipes every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchRecipes();
    }, [fetchRecipes]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecipes(true);
  };

  const handleRecipePress = (recipe: Recipe) => {
    router.push({
      pathname: '/(drawer)/recipe-result',
      params: {
        recipe: JSON.stringify(recipe),
      },
    });
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!token) {
      Alert.alert('Error', 'Please log in to delete recipes');
      return;
    }

    Alert.alert('Delete Recipe', 'Are you sure you want to delete this recipe?', [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => {
          // Close the swipeable
          swipeableRefs.current.get(recipeId)?.close();
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRecipe(recipeId, token);
            setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
          } catch (error) {
            console.error('Error deleting recipe:', error);
            Alert.alert('Error', 'Failed to delete recipe');
            swipeableRefs.current.get(recipeId)?.close();
          }
        },
      },
    ]);
  };

  const renderRightActions = (
    recipeId: string,
    progress: Animated.AnimatedInterpolation<number>,
  ) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [100, 0],
    });

    return (
      <Animated.View style={[styles.deleteAction, { transform: [{ translateX: trans }] }]}>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteRecipe(recipeId)}>
          <Ionicons name="trash-outline" size={24} color="#FFF" />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderRecipeCard = (recipe: Recipe) => (
    <Swipeable
      key={recipe.id}
      ref={(ref) => {
        if (ref) {
          swipeableRefs.current.set(recipe.id, ref);
        }
      }}
      renderRightActions={(progress) => renderRightActions(recipe.id, progress)}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        style={styles.recipeCard}
        onPress={() => handleRecipePress(recipe)}
        activeOpacity={0.7}
      >
        <View style={styles.recipeCardHeader}>
          <View style={styles.recipeIconContainer}>
            <Ionicons name="restaurant" size={18} color="#FFF" />
          </View>
          <Text style={styles.recipeName}>{recipe.name}</Text>
        </View>
        {recipe.description && (
          <Text style={styles.recipeDescription} numberOfLines={2}>
            {recipe.description}
          </Text>
        )}
        <View style={styles.recipeCardFooter}>
          <View style={styles.recipeInfo}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.recipeInfoText}>{recipe.prepTime}</Text>
          </View>
          <View style={styles.recipeInfo}>
            <Ionicons name="flame-outline" size={16} color="#666" />
            <Text style={styles.recipeInfoText}>{recipe.cookTime}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <Animated.ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>My Recipes</Text>
          <Text style={styles.subtitle}>Your recipe history</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>Loading recipes...</Text>
          </View>
        ) : recipes.length > 0 ? (
          <View style={styles.recipesContainer}>{recipes.map(renderRecipeCard)}</View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={80} color="#DDDDDD" />
            <Text style={styles.emptyTitle}>No Recipes Yet</Text>
            <Text style={styles.emptyText}>
              Upload a photo or video on the Home tab to discover your first recipe!
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(drawer)')}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFF" />
              <Text style={styles.emptyButtonText}>Create First Recipe</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.ScrollView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
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
  recipesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  recipeCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  recipeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  recipeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeName: {
    flex: 1,
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  recipeDescription: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
    marginBottom: 12,
  },
  recipeCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  recipeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recipeInfoText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  deleteAction: {
    width: 100,
    height: '100%',
    marginBottom: 16,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  deleteText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
  },
});

import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  getMealPlan,
  addMealEntry,
  removeMealEntry,
  generateGroceryListFromPlan,
  getNutritionSummary,
  MealPlan,
  MealPlanEntry,
  NutritionSummary,
} from '@/services/mealPrepService';
import { getUserRecipes, Recipe } from '@/services/recipeService';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type MealType = (typeof MEAL_TYPES)[number];

const MEAL_TYPE_CONFIG: Record<MealType, { icon: string; color: string; label: string }> = {
  breakfast: { icon: 'sunny-outline', color: '#FFB800', label: 'Breakfast' },
  lunch: { icon: 'restaurant-outline', color: '#4CAF50', label: 'Lunch' },
  dinner: { icon: 'moon-outline', color: '#5C6BC0', label: 'Dinner' },
  snack: { icon: 'cafe-outline', color: '#FF7043', label: 'Snack' },
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function MealPlanDetailScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ planId: string }>();
  const planId = parseInt(params.planId);

  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [nutrition, setNutrition] = useState<NutritionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingGrocery, setGeneratingGrocery] = useState(false);
  const [removingEntryId, setRemovingEntryId] = useState<number | null>(null);

  // Add meal modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch');
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [addingEntry, setAddingEntry] = useState(false);

  // Active day for calendar view
  const [activeDay, setActiveDay] = useState<string>('');

  // View mode
  const [showNutrition, setShowNutrition] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token || !planId) return;
    try {
      const [plan, userRecipes] = await Promise.all([
        getMealPlan(planId, token),
        getUserRecipes(user!.id),
      ]);
      setMealPlan(plan);
      setRecipes(userRecipes);

      // Set active day to today if within plan range, else first day
      const today = new Date().toISOString().split('T')[0];
      const planStart = new Date(plan.startDate).toISOString().split('T')[0];
      const planEnd = new Date(plan.endDate).toISOString().split('T')[0];
      if (today >= planStart && today <= planEnd) {
        setActiveDay(today);
      } else {
        setActiveDay(planStart);
      }

      // Fetch nutrition
      if (plan.entries && plan.entries.length > 0) {
        try {
          const nutritionData = await getNutritionSummary(planId, token);
          setNutrition(nutritionData);
        } catch (e) {
          // Non-critical
        }
      }
    } catch (error) {
      console.error('Error fetching meal plan:', error);
      Alert.alert('Error', 'Failed to load meal plan.');
    }
  }, [token, planId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
    }, [fetchData]),
  );

  // Get dates for the plan's week
  const getPlanDates = (): string[] => {
    if (!mealPlan) return [];
    const dates: string[] = [];
    const start = new Date(mealPlan.startDate);
    const end = new Date(mealPlan.endDate);
    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  // Group entries by date and meal type
  const getEntriesForDate = (dateStr: string): Record<MealType, MealPlanEntry[]> => {
    const grouped: Record<MealType, MealPlanEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };

    if (!mealPlan?.entries) return grouped;

    for (const entry of mealPlan.entries) {
      const entryDate = new Date(entry.date).toISOString().split('T')[0];
      if (entryDate === dateStr && MEAL_TYPES.includes(entry.mealType as MealType)) {
        grouped[entry.mealType as MealType].push(entry);
      }
    }

    return grouped;
  };

  const getDayMealCount = (dateStr: string): number => {
    if (!mealPlan?.entries) return 0;
    return mealPlan.entries.filter(
      (e) => new Date(e.date).toISOString().split('T')[0] === dateStr,
    ).length;
  };

  const handleAddMeal = async () => {
    if (!token || !selectedRecipeId || !selectedDate) return;

    setAddingEntry(true);
    try {
      await addMealEntry(
        planId,
        {
          recipeId: selectedRecipeId,
          date: selectedDate,
          mealType: selectedMealType,
        },
        token,
      );

      setShowAddModal(false);
      setSelectedRecipeId(null);
      await fetchData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Error adding meal:', error);
      Alert.alert('Error', error?.response?.data?.error || 'Failed to add meal.');
    } finally {
      setAddingEntry(false);
    }
  };

  const handleRemoveEntry = (entry: MealPlanEntry) => {
    Alert.alert('Remove Meal', `Remove "${entry.recipe.name}" from this day?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (!token) return;
          setRemovingEntryId(entry.id);
          try {
            await removeMealEntry(planId, entry.id, token);
            await fetchData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert('Error', 'Failed to remove meal.');
          } finally {
            setRemovingEntryId(null);
          }
        },
      },
    ]);
  };

  const handleGenerateGroceryList = async () => {
    if (!token) return;

    if (!mealPlan?.entries || mealPlan.entries.length === 0) {
      Alert.alert('No Meals', 'Add some meals to your plan first before generating a grocery list.');
      return;
    }

    setGeneratingGrocery(true);
    try {
      const groceryList = await generateGroceryListFromPlan(planId, token);
      Alert.alert(
        'Grocery List Created!',
        `${groceryList.totalItems} items from ${groceryList.totalMeals} meals.\n${groceryList.needToBuy.length} to buy, ${groceryList.alreadyHave.length} already in inventory.\n\nGo to Shopping List to view it.`,
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Go to Shopping',
            onPress: () => router.push('/(drawer)/shopping-list'),
          },
        ],
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Error generating grocery list:', error);
      Alert.alert('Error', error?.response?.data?.error || 'Failed to generate grocery list.');
    } finally {
      setGeneratingGrocery(false);
    }
  };

  const openAddModal = (date: string, mealType: MealType) => {
    setSelectedDate(date);
    setSelectedMealType(mealType);
    setSelectedRecipeId(null);
    setShowAddModal(true);
  };

  // ─── Day selector strip (top) ───
  const renderDayStrip = () => {
    const dates = getPlanDates();
    const today = new Date().toISOString().split('T')[0];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayStrip}
        contentContainerStyle={styles.dayStripContent}
      >
        {dates.map((dateStr, index) => {
          const isActive = dateStr === activeDay;
          const isToday = dateStr === today;
          const mealCount = getDayMealCount(dateStr);
          const dayIndex = (new Date(dateStr).getDay() + 6) % 7; // Monday = 0

          return (
            <TouchableOpacity
              key={dateStr}
              style={[styles.dayChip, isActive && styles.dayChipActive]}
              onPress={() => {
                setActiveDay(dateStr);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.dayChipLabel, isActive && styles.dayChipLabelActive]}>
                {DAY_NAMES[dayIndex]}
              </Text>
              <Text style={[styles.dayChipDate, isActive && styles.dayChipDateActive]}>
                {new Date(dateStr).getDate()}
              </Text>
              {mealCount > 0 && (
                <View style={[styles.dayChipDot, isActive && styles.dayChipDotActive]}>
                  <Text style={[styles.dayChipDotText, isActive && styles.dayChipDotTextActive]}>
                    {mealCount}
                  </Text>
                </View>
              )}
              {isToday && <View style={styles.todayIndicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  // ─── Meal slot for a specific type on active day ───
  const renderMealSlot = (mealType: MealType, entries: MealPlanEntry[]) => {
    const config = MEAL_TYPE_CONFIG[mealType];

    return (
      <View key={mealType} style={styles.mealSlot}>
        <View style={styles.mealSlotHeader}>
          <View style={[styles.mealTypeIcon, { backgroundColor: config.color + '18' }]}>
            <Ionicons name={config.icon as any} size={20} color={config.color} />
          </View>
          <Text style={styles.mealTypeLabel}>{config.label}</Text>
          <TouchableOpacity
            style={styles.addMealBtn}
            onPress={() => openAddModal(activeDay, mealType)}
          >
            <Ionicons name="add" size={20} color="#FF6B35" />
          </TouchableOpacity>
        </View>

        {entries.length === 0 ? (
          <TouchableOpacity
            style={styles.emptySlot}
            onPress={() => openAddModal(activeDay, mealType)}
          >
            <Ionicons name="add-circle-outline" size={24} color="#CCC" />
            <Text style={styles.emptySlotText}>Add a recipe</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.mealEntries}>
            {entries.map((entry) => (
              <View key={entry.id} style={styles.mealEntry}>
                <View style={styles.mealEntryInfo}>
                  <Text style={styles.mealEntryName} numberOfLines={1}>
                    {entry.recipe.name}
                  </Text>
                  <View style={styles.mealEntryMeta}>
                    {entry.recipe.calories && (
                      <Text style={styles.mealEntryCalories}>
                        {entry.recipe.calories} cal
                      </Text>
                    )}
                    {entry.recipe.prepTime && (
                      <Text style={styles.mealEntryTime}>
                        {entry.recipe.prepTime}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeMealBtn}
                  onPress={() => handleRemoveEntry(entry)}
                  disabled={removingEntryId === entry.id}
                >
                  {removingEntryId === entry.id ? (
                    <ActivityIndicator size="small" color="#FF3B30" />
                  ) : (
                    <Ionicons name="close-circle" size={22} color="#FF3B30" />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ─── Daily view (main content) ───
  const renderDayView = () => {
    if (!activeDay) return null;

    const entries = getEntriesForDate(activeDay);
    const dayIndex = (new Date(activeDay).getDay() + 6) % 7;
    const dayLabel = FULL_DAY_NAMES[dayIndex];
    const dateLabel = new Date(activeDay).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });

    // Daily nutrition from summary
    const dayNutrition = nutrition?.daily.find((d) => d.date === activeDay);

    return (
      <View style={styles.dayView}>
        <View style={styles.dayViewHeader}>
          <View>
            <Text style={styles.dayViewTitle}>{dayLabel}</Text>
            <Text style={styles.dayViewDate}>{dateLabel}</Text>
          </View>
          {dayNutrition && (
            <View style={styles.dayNutritionBadge}>
              <Ionicons name="flame-outline" size={14} color="#FF6B35" />
              <Text style={styles.dayNutritionText}>{dayNutrition.calories} cal</Text>
            </View>
          )}
        </View>

        {MEAL_TYPES.map((type) => renderMealSlot(type, entries[type]))}
      </View>
    );
  };

  // ─── Nutrition overview ───
  const renderNutritionOverview = () => {
    if (!nutrition) return null;

    return (
      <View style={styles.nutritionCard}>
        <TouchableOpacity
          style={styles.nutritionCardHeader}
          onPress={() => setShowNutrition(!showNutrition)}
        >
          <View style={styles.nutritionCardTitle}>
            <Ionicons name="nutrition-outline" size={20} color="#4CAF50" />
            <Text style={styles.nutritionCardTitleText}>Weekly Nutrition</Text>
          </View>
          <Ionicons
            name={showNutrition ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#999"
          />
        </TouchableOpacity>

        {showNutrition && (
          <View style={styles.nutritionDetails}>
            <Text style={styles.nutritionSectionLabel}>Daily Average</Text>
            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{nutrition.averageDaily.calories}</Text>
                <Text style={styles.nutritionLabel}>Calories</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{nutrition.averageDaily.protein}g</Text>
                <Text style={styles.nutritionLabel}>Protein</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{nutrition.averageDaily.carbs}g</Text>
                <Text style={styles.nutritionLabel}>Carbs</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{nutrition.averageDaily.fat}g</Text>
                <Text style={styles.nutritionLabel}>Fat</Text>
              </View>
            </View>

            <Text style={[styles.nutritionSectionLabel, { marginTop: 14 }]}>Week Total</Text>
            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{nutrition.totals.calories}</Text>
                <Text style={styles.nutritionLabel}>Calories</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{nutrition.totalMeals}</Text>
                <Text style={styles.nutritionLabel}>Meals</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{nutrition.totalDays}</Text>
                <Text style={styles.nutritionLabel}>Days</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  // ─── Add Meal Modal ───
  const renderAddMealModal = () => {
    const dateLabel = selectedDate
      ? new Date(selectedDate).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })
      : '';
    const config = MEAL_TYPE_CONFIG[selectedMealType];

    return (
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Meal</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.addMealInfo}>
              <View style={[styles.mealTypeBadge, { backgroundColor: config.color + '18' }]}>
                <Ionicons name={config.icon as any} size={16} color={config.color} />
                <Text style={[styles.mealTypeBadgeText, { color: config.color }]}>
                  {config.label}
                </Text>
              </View>
              <Text style={styles.addMealDate}>{dateLabel}</Text>
            </View>

            {/* Meal type selector */}
            <Text style={styles.selectorLabel}>Meal Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.mealTypeSelector}
            >
              {MEAL_TYPES.map((type) => {
                const typeConfig = MEAL_TYPE_CONFIG[type];
                const isSelected = type === selectedMealType;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.mealTypeOption,
                      isSelected && { backgroundColor: typeConfig.color + '18', borderColor: typeConfig.color },
                    ]}
                    onPress={() => setSelectedMealType(type)}
                  >
                    <Ionicons
                      name={typeConfig.icon as any}
                      size={18}
                      color={isSelected ? typeConfig.color : '#999'}
                    />
                    <Text
                      style={[
                        styles.mealTypeOptionText,
                        isSelected && { color: typeConfig.color, fontWeight: '600' },
                      ]}
                    >
                      {typeConfig.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Recipe selector */}
            <Text style={styles.selectorLabel}>Choose Recipe</Text>
            {recipes.length === 0 ? (
              <View style={styles.noRecipesContainer}>
                <Ionicons name="restaurant-outline" size={36} color="#CCC" />
                <Text style={styles.noRecipesText}>No saved recipes yet</Text>
                <Text style={styles.noRecipesSubtext}>
                  Create some recipes first, then come back to plan your meals
                </Text>
              </View>
            ) : (
              <FlatList
                data={recipes}
                keyExtractor={(item) => item.id}
                style={styles.recipeList}
                renderItem={({ item }) => {
                  const isSelected = selectedRecipeId === parseInt(item.id);
                  return (
                    <TouchableOpacity
                      style={[styles.recipeOption, isSelected && styles.recipeOptionSelected]}
                      onPress={() => {
                        setSelectedRecipeId(parseInt(item.id));
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <View style={styles.recipeOptionInfo}>
                        <Text
                          style={[
                            styles.recipeOptionName,
                            isSelected && styles.recipeOptionNameSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <View style={styles.recipeOptionMeta}>
                          {item.nutrition?.calories ? (
                            <Text style={styles.recipeOptionCalories}>
                              {item.nutrition.calories} cal
                            </Text>
                          ) : null}
                          {item.prepTime && item.prepTime !== 'N/A' && (
                            <Text style={styles.recipeOptionTime}>{item.prepTime}</Text>
                          )}
                        </View>
                      </View>
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={24}
                        color={isSelected ? '#FF6B35' : '#CCC'}
                      />
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {/* Confirm button */}
            <TouchableOpacity
              style={[styles.confirmButton, !selectedRecipeId && styles.buttonDisabled]}
              onPress={handleAddMeal}
              disabled={!selectedRecipeId || addingEntry}
            >
              {addingEntry ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                  <Text style={styles.confirmButtonText}>Add to Plan</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading meal plan...</Text>
      </View>
    );
  }

  if (!mealPlan) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#999" />
        <Text style={styles.loadingText}>Meal plan not found</Text>
      </View>
    );
  }

  const totalMeals = mealPlan.entries?.length || 0;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Plan header */}
        <View style={styles.planHeader}>
          <Text style={styles.planTitle}>{mealPlan.name}</Text>
          <Text style={styles.planDateRange}>
            {new Date(mealPlan.startDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}{' '}
            -{' '}
            {new Date(mealPlan.endDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
          <View style={styles.planStats}>
            <View style={styles.planStatItem}>
              <Ionicons name="restaurant" size={16} color="#FF6B35" />
              <Text style={styles.planStatText}>
                {totalMeals} meal{totalMeals !== 1 ? 's' : ''} planned
              </Text>
            </View>
          </View>
        </View>

        {/* Day selector */}
        {renderDayStrip()}

        {/* Nutrition overview */}
        {nutrition && renderNutritionOverview()}

        {/* Day view */}
        {renderDayView()}

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.groceryButton, totalMeals === 0 && styles.buttonDisabled]}
            onPress={handleGenerateGroceryList}
            disabled={totalMeals === 0 || generatingGrocery}
          >
            {generatingGrocery ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="cart" size={20} color="#FFF" />
                <Text style={styles.groceryButtonText}>Generate Grocery List</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {renderAddMealModal()}
    </View>
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

  // ─── Plan Header ───
  planHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  planTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  planDateRange: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
  },
  planStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  planStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planStatText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins_500Medium',
  },

  // ─── Day Strip ───
  dayStrip: {
    marginBottom: 16,
  },
  dayStripContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dayChip: {
    width: 60,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  dayChipActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  dayChipLabel: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Poppins_500Medium',
    marginBottom: 4,
  },
  dayChipLabelActive: {
    color: '#FFF',
  },
  dayChipDate: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    fontFamily: 'Poppins_700Bold',
  },
  dayChipDateActive: {
    color: '#FFF',
  },
  dayChipDot: {
    marginTop: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipDotActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dayChipDotText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B35',
  },
  dayChipDotTextActive: {
    color: '#FFF',
  },
  todayIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B35',
    position: 'absolute',
    top: 6,
    right: 6,
  },

  // ─── Day View ───
  dayView: {
    paddingHorizontal: 20,
    gap: 12,
  },
  dayViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dayViewTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Poppins_700Bold',
  },
  dayViewDate: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  dayNutritionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dayNutritionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B35',
    fontFamily: 'Poppins_600SemiBold',
  },

  // ─── Meal Slot ───
  mealSlot: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  mealSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  mealTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTypeLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Poppins_600SemiBold',
  },
  addMealBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderStyle: 'dashed',
  },
  emptySlotText: {
    fontSize: 14,
    color: '#CCC',
    fontFamily: 'Poppins_400Regular',
  },
  mealEntries: {
    gap: 8,
  },
  mealEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  mealEntryInfo: {
    flex: 1,
  },
  mealEntryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Poppins_600SemiBold',
  },
  mealEntryMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  mealEntryCalories: {
    fontSize: 12,
    color: '#FF6B35',
    fontFamily: 'Poppins_500Medium',
  },
  mealEntryTime: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Poppins_400Regular',
  },
  removeMealBtn: {
    padding: 4,
  },

  // ─── Nutrition Card ───
  nutritionCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
  },
  nutritionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  nutritionCardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nutritionCardTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Poppins_600SemiBold',
  },
  nutritionDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  nutritionSectionLabel: {
    fontSize: 13,
    color: '#999',
    fontFamily: 'Poppins_500Medium',
    marginBottom: 8,
  },
  nutritionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  nutritionItem: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    fontFamily: 'Poppins_700Bold',
  },
  nutritionLabel: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },

  // ─── Action Buttons ───
  actionButtons: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  groceryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  groceryButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },

  // ─── Modal ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
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
  modalCloseBtn: {
    padding: 4,
  },
  addMealInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  mealTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  mealTypeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  addMealDate: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins_500Medium',
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 8,
  },
  mealTypeSelector: {
    marginBottom: 16,
    maxHeight: 44,
  },
  mealTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    marginRight: 8,
  },
  mealTypeOptionText: {
    fontSize: 13,
    color: '#999',
    fontFamily: 'Poppins_500Medium',
  },
  noRecipesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noRecipesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 12,
  },
  noRecipesSubtext: {
    fontSize: 13,
    color: '#CCC',
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
  },
  recipeList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  recipeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  recipeOptionSelected: {
    backgroundColor: '#FFF3ED',
    borderColor: '#FF6B35',
  },
  recipeOptionInfo: {
    flex: 1,
    marginRight: 12,
  },
  recipeOptionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    fontFamily: 'Poppins_500Medium',
  },
  recipeOptionNameSelected: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  recipeOptionMeta: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  recipeOptionCalories: {
    fontSize: 12,
    color: '#FF6B35',
    fontFamily: 'Poppins_400Regular',
  },
  recipeOptionTime: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Poppins_400Regular',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
});

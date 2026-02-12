import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  getMealPlans,
  createMealPlan,
  deleteMealPlan,
  MealPlan,
} from '@/services/mealPrepService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MealPrepScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Create form state
  const [planName, setPlanName] = useState('');
  const [planNotes, setPlanNotes] = useState('');
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(getMonday(new Date()));

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  function getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function getSunday(monday: Date): Date {
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return sunday;
  }

  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function formatDateDisplay(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatMonthYear(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const fetchMealPlans = useCallback(async () => {
    if (!token) return;
    try {
      const plans = await getMealPlans(token);
      setMealPlans(plans);
    } catch (error) {
      console.error('Error fetching meal plans:', error);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchMealPlans().finally(() => setLoading(false));
    }, [fetchMealPlans]),
  );

  const handleCreatePlan = async () => {
    if (!token || !planName.trim()) {
      Alert.alert('Required', 'Please enter a plan name.');
      return;
    }

    setCreating(true);
    try {
      const startDate = formatDate(selectedWeekStart);
      const endDate = formatDate(getSunday(selectedWeekStart));

      await createMealPlan(
        {
          name: planName.trim(),
          startDate,
          endDate,
          notes: planNotes.trim() || undefined,
        },
        token,
      );

      setPlanName('');
      setPlanNotes('');
      setShowCreateModal(false);
      await fetchMealPlans();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error creating meal plan:', error);
      Alert.alert('Error', 'Failed to create meal plan.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePlan = (plan: MealPlan) => {
    Alert.alert('Delete Plan', `Delete "${plan.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!token) return;
          setDeletingId(plan.id);
          try {
            await deleteMealPlan(plan.id, token);
            setMealPlans((prev) => prev.filter((p) => p.id !== plan.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert('Error', 'Failed to delete meal plan.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const openPlanDetail = (plan: MealPlan) => {
    router.push({
      pathname: '/(drawer)/meal-plan-detail',
      params: { planId: plan.id.toString() },
    });
  };

  // ─── Mini Calendar for week selection ───
  const getCalendarDays = (month: Date) => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDay = new Date(year, m, 1);
    const lastDay = new Date(year, m + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0

    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, m, d));
    }
    return days;
  };

  const isSelectedWeek = (day: Date) => {
    const monday = getMonday(day);
    return formatDate(monday) === formatDate(selectedWeekStart);
  };

  const selectWeek = (day: Date) => {
    const monday = getMonday(day);
    setSelectedWeekStart(monday);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const prevMonth = () => {
    const m = new Date(calendarMonth);
    m.setMonth(m.getMonth() - 1);
    setCalendarMonth(m);
  };

  const nextMonth = () => {
    const m = new Date(calendarMonth);
    m.setMonth(m.getMonth() + 1);
    setCalendarMonth(m);
  };

  const renderMiniCalendar = () => {
    const days = getCalendarDays(calendarMonth);
    const weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={prevMonth} style={styles.calendarNavBtn}>
            <Ionicons name="chevron-back" size={20} color="#333" />
          </TouchableOpacity>
          <Text style={styles.calendarMonthText}>{formatMonthYear(calendarMonth)}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.calendarNavBtn}>
            <Ionicons name="chevron-forward" size={20} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarWeekDays}>
          {weekDayLabels.map((label) => (
            <Text key={label} style={styles.calendarWeekDayLabel}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {days.map((day, index) => {
            if (!day) {
              return <View key={`empty-${index}`} style={styles.calendarDayEmpty} />;
            }

            const isSelected = isSelectedWeek(day);
            const isToday = formatDate(day) === formatDate(new Date());
            const isMonday = day.getDay() === 1;
            const isSunday = day.getDay() === 0;

            return (
              <TouchableOpacity
                key={formatDate(day)}
                style={[
                  styles.calendarDay,
                  isSelected && styles.calendarDaySelected,
                  isSelected && isMonday && styles.calendarDaySelectedStart,
                  isSelected && isSunday && styles.calendarDaySelectedEnd,
                ]}
                onPress={() => selectWeek(day)}
              >
                <Text
                  style={[
                    styles.calendarDayText,
                    isSelected && styles.calendarDayTextSelected,
                    isToday && !isSelected && styles.calendarDayTextToday,
                  ]}
                >
                  {day.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.selectedWeekInfo}>
          <Ionicons name="calendar-outline" size={16} color="#FF6B35" />
          <Text style={styles.selectedWeekText}>
            Selected: {formatDateDisplay(formatDate(selectedWeekStart))} -{' '}
            {formatDateDisplay(formatDate(getSunday(selectedWeekStart)))}
          </Text>
        </View>
      </View>
    );
  };

  // ─── Create Modal ───
  const renderCreateModal = () => (
    <Modal visible={showCreateModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Meal Plan</Text>
            <TouchableOpacity
              onPress={() => setShowCreateModal(false)}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Plan Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Healthy Week, Bulking Plan"
              placeholderTextColor="#999"
              value={planName}
              onChangeText={setPlanName}
              autoFocus
            />

            <Text style={styles.inputLabel}>Select Week</Text>
            {renderMiniCalendar()}

            <Text style={styles.inputLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Any goals or notes for this plan..."
              placeholderTextColor="#999"
              value={planNotes}
              onChangeText={setPlanNotes}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.createButton, !planName.trim() && styles.buttonDisabled]}
              onPress={handleCreatePlan}
              disabled={!planName.trim() || creating}
            >
              {creating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="#FFF" />
                  <Text style={styles.createButtonText}>Create Meal Plan</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // ─── Plan Cards ───
  const renderPlanCard = (plan: MealPlan) => {
    const entryCount = plan._count?.entries || 0;
    const start = formatDateDisplay(plan.startDate);
    const end = formatDateDisplay(plan.endDate);

    // Determine if the plan is current, upcoming, or past
    const now = new Date();
    const planStart = new Date(plan.startDate);
    const planEnd = new Date(plan.endDate);
    let status: 'current' | 'upcoming' | 'past' = 'past';
    if (now >= planStart && now <= planEnd) status = 'current';
    else if (planStart > now) status = 'upcoming';

    const statusColors = {
      current: '#4CAF50',
      upcoming: '#2196F3',
      past: '#999',
    };
    const statusLabels = {
      current: 'This Week',
      upcoming: 'Upcoming',
      past: 'Past',
    };

    return (
      <TouchableOpacity
        key={plan.id}
        style={styles.planCard}
        onPress={() => openPlanDetail(plan)}
        activeOpacity={0.7}
      >
        <View style={styles.planCardHeader}>
          <View style={styles.planCardInfo}>
            <View style={styles.planCardTitleRow}>
              <Text style={styles.planCardTitle} numberOfLines={1}>
                {plan.name}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColors[status] + '20' }]}>
                <Text style={[styles.statusBadgeText, { color: statusColors[status] }]}>
                  {statusLabels[status]}
                </Text>
              </View>
            </View>
            <Text style={styles.planCardDate}>
              {start} - {end}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeletePlan(plan)}
            disabled={deletingId === plan.id}
          >
            {deletingId === plan.id ? (
              <ActivityIndicator size="small" color="#FF3B30" />
            ) : (
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.planCardStats}>
          <View style={styles.planStat}>
            <Ionicons name="restaurant-outline" size={16} color="#FF6B35" />
            <Text style={styles.planStatText}>
              {entryCount} meal{entryCount !== 1 ? 's' : ''} planned
            </Text>
          </View>
          {plan.notes && (
            <View style={styles.planStat}>
              <Ionicons name="document-text-outline" size={16} color="#666" />
              <Text style={styles.planStatText} numberOfLines={1}>
                {plan.notes}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.planCardFooter}>
          <Text style={styles.planCardAction}>Tap to view & edit</Text>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Empty state ───
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="calendar-outline" size={48} color="#FF6B35" />
      </View>
      <Text style={styles.emptyTitle}>No Meal Plans Yet</Text>
      <Text style={styles.emptySubtitle}>
        Plan your meals for the week, then generate a grocery list from your plan.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add-circle" size={20} color="#FFF" />
        <Text style={styles.emptyButtonText}>Create Your First Plan</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading meal plans...</Text>
      </View>
    );
  }

  // Separate plans into categories
  const now = new Date();
  const currentPlans = mealPlans.filter((p) => {
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);
    return now >= start && now <= end;
  });
  const upcomingPlans = mealPlans.filter((p) => new Date(p.startDate) > now);
  const pastPlans = mealPlans.filter((p) => new Date(p.endDate) < now);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Meal Prep</Text>
              <Text style={styles.subtitle}>
                {mealPlans.length > 0
                  ? `${mealPlans.length} plan${mealPlans.length > 1 ? 's' : ''}`
                  : 'Plan your weekly meals'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick tips card */}
        {mealPlans.length === 0 && (
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb-outline" size={20} color="#FFB800" />
              <Text style={styles.tipsTitle}>How Meal Prep Works</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>1</Text>
              <Text style={styles.tipText}>Create a weekly meal plan</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>2</Text>
              <Text style={styles.tipText}>Assign your saved recipes to each day</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>3</Text>
              <Text style={styles.tipText}>Generate a grocery list for the entire week</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>4</Text>
              <Text style={styles.tipText}>Check off items as you shop</Text>
            </View>
          </View>
        )}

        {mealPlans.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.plansContainer}>
            {/* Current plans */}
            {currentPlans.length > 0 && (
              <View style={styles.planSection}>
                <Text style={styles.planSectionTitle}>Active Plans</Text>
                {currentPlans.map(renderPlanCard)}
              </View>
            )}

            {/* Upcoming plans */}
            {upcomingPlans.length > 0 && (
              <View style={styles.planSection}>
                <Text style={styles.planSectionTitle}>Upcoming</Text>
                {upcomingPlans.map(renderPlanCard)}
              </View>
            )}

            {/* Past plans */}
            {pastPlans.length > 0 && (
              <View style={styles.planSection}>
                <Text style={styles.planSectionTitle}>Past Plans</Text>
                {pastPlans.map(renderPlanCard)}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setSelectedWeekStart(getMonday(new Date()));
          setCalendarMonth(new Date());
          setPlanName('');
          setPlanNotes('');
          setShowCreateModal(true);
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {renderCreateModal()}
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
  header: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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

  // ─── Tips Card ───
  tipsCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Poppins_600SemiBold',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  tipNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF3ED',
    color: '#FF6B35',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 28,
    fontFamily: 'Poppins_700Bold',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },

  // ─── Empty State ───
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF3ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 24,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },

  // ─── Plan Cards ───
  plansContainer: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 20,
  },
  planSection: {
    gap: 10,
  },
  planSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 4,
  },
  planCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planCardInfo: {
    flex: 1,
    marginRight: 12,
  },
  planCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  planCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  planCardDate: {
    fontSize: 13,
    color: '#999',
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
  },
  deleteBtn: {
    padding: 4,
  },
  planCardStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 14,
  },
  planStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planStatText: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
    flexShrink: 1,
  },
  planCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  planCardAction: {
    fontSize: 13,
    color: '#999',
    fontFamily: 'Poppins_400Regular',
    marginRight: 4,
  },

  // ─── FAB ───
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 8,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },

  // ─── Mini Calendar ───
  calendarContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  calendarNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Poppins_600SemiBold',
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarWeekDayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    fontFamily: 'Poppins_500Medium',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayEmpty: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDaySelected: {
    backgroundColor: '#FFF3ED',
  },
  calendarDaySelectedStart: {
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  calendarDaySelectedEnd: {
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  calendarDayText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Poppins_400Regular',
  },
  calendarDayTextSelected: {
    color: '#FF6B35',
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  calendarDayTextToday: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  selectedWeekInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  selectedWeekText: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Poppins_500Medium',
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

export default function InventoryScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [groupedItems, setGroupedItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Manual entry state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('pieces');
  const [newItemCategory, setNewItemCategory] = useState('general');
  const [addingItem, setAddingItem] = useState(false);

  const categories = [
    'produce',
    'dairy',
    'meat',
    'pantry',
    'frozen',
    'beverages',
    'snacks',
    'general',
  ];
  const units = [
    'pieces',
    'lbs',
    'oz',
    'kg',
    'g',
    'cups',
    'tbsp',
    'tsp',
    'liters',
    'ml',
    'dozen',
    'bunch',
  ];

  const fetchInventory = useCallback(async () => {
    try {
      const response = await api.get('/inventory', {
        headers: { Authorization: `Bearer ${token}` },
        params: searchQuery ? { search: searchQuery } : {},
      });

      setItems(response.data.items);
      setGroupedItems(response.data.groupedItems);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      Alert.alert('Error', 'Failed to load inventory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, searchQuery]);

  // Refresh inventory every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchInventory();
    }, [fetchInventory]),
  );

  // Also refetch when search query changes
  useEffect(() => {
    fetchInventory();
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInventory();
  };

  const handleDeleteItem = async (itemId: number) => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/inventory/${itemId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            fetchInventory();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete item');
          }
        },
      },
    ]);
  };

  const handleUpdateQuantity = async (itemId: number, currentQuantity: number, delta: number) => {
    const newQuantity = Math.max(0, currentQuantity + delta);

    if (newQuantity === 0) {
      handleDeleteItem(itemId);
      return;
    }

    try {
      await api.put(
        `/inventory/${itemId}`,
        { quantity: newQuantity },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      fetchInventory();
    } catch (error) {
      Alert.alert('Error', 'Failed to update quantity');
    }
  };

  const handleAddManualItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    setAddingItem(true);
    try {
      await api.post(
        '/inventory/confirm',
        {
          items: [
            {
              name: newItemName.trim(),
              quantity: parseFloat(newItemQuantity) || 1,
              unit: newItemUnit,
              category: newItemCategory,
            },
          ],
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // Reset form and close modal
      setNewItemName('');
      setNewItemQuantity('1');
      setNewItemUnit('pieces');
      setNewItemCategory('general');
      setShowAddModal(false);
      fetchInventory();
    } catch (error) {
      console.error('Failed to add item:', error);
      Alert.alert('Error', 'Failed to add item');
    } finally {
      setAddingItem(false);
    }
  };

  const renderItem = (item: any) => (
    <View key={item.id} style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemCategory}>{item.category || 'Other'}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDeleteItem(item.id)} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <View style={styles.quantityContainer}>
        <TouchableOpacity
          onPress={() => handleUpdateQuantity(item.id, item.quantity, -1)}
          style={styles.quantityButton}
        >
          <Ionicons name="remove" size={20} color="#000" />
        </TouchableOpacity>

        <Text style={styles.quantityText}>
          {item.quantity} {item.unit || 'pieces'}
        </Text>

        <TouchableOpacity
          onPress={() => handleUpdateQuantity(item.id, item.quantity, 1)}
          style={styles.quantityButton}
        >
          <Ionicons name="add" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {item.expiryDate && (
        <Text style={styles.expiryText}>
          Expires: {new Date(item.expiryDate).toLocaleDateString()}
        </Text>
      )}
    </View>
  );

  const renderCategorySection = (category: string, categoryItems: any[]) => (
    <View key={category} style={styles.categorySection}>
      <Text style={styles.categoryTitle}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </Text>
      {categoryItems.map(renderItem)}
    </View>
  );

  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddModal(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Item</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Item Name</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="e.g., Eggs, Milk, Bread..."
            value={newItemName}
            onChangeText={setNewItemName}
            placeholderTextColor="#999"
            autoFocus
          />

          <Text style={styles.inputLabel}>Quantity</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="1"
            value={newItemQuantity}
            onChangeText={setNewItemQuantity}
            keyboardType="numeric"
            placeholderTextColor="#999"
          />

          <Text style={styles.inputLabel}>Unit</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryPicker}
          >
            {units.map((unit) => (
              <TouchableOpacity
                key={unit}
                style={[styles.categoryChip, newItemUnit === unit && styles.categoryChipActive]}
                onPress={() => setNewItemUnit(unit)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    newItemUnit === unit && styles.categoryChipTextActive,
                  ]}
                >
                  {unit}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.inputLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryPicker}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, newItemCategory === cat && styles.categoryChipActive]}
                onPress={() => setNewItemCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    newItemCategory === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddManualItem}
            disabled={addingItem}
          >
            {addingItem ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.addButtonText}>Add to Inventory</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search inventory..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Inventory List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="basket-outline" size={80} color="#CCC" />
            <Text style={styles.emptyTitle}>No Items Yet</Text>
            <Text style={styles.emptyText}>
              Tap the + button to add items manually or scan a photo
            </Text>
          </View>
        ) : (
          Object.entries(groupedItems).map(([category, categoryItems]) =>
            renderCategorySection(category, categoryItems as any[]),
          )
        )}
      </ScrollView>

      {/* FAB Menu */}
      {showFabMenu && (
        <View style={styles.fabMenu}>
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setShowFabMenu(false);
              setShowAddModal(true);
            }}
          >
            <View style={styles.fabMenuIcon}>
              <Ionicons name="create-outline" size={20} color="#FFF" />
            </View>
            <Text style={styles.fabMenuText}>Add Manually</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setShowFabMenu(false);
              router.push('/(drawer)/inventory-scan');
            }}
          >
            <View style={styles.fabMenuIcon}>
              <Ionicons name="camera-outline" size={20} color="#FFF" />
            </View>
            <Text style={styles.fabMenuText}>Scan Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, showFabMenu && styles.fabActive]}
        onPress={() => setShowFabMenu(!showFabMenu)}
        activeOpacity={0.8}
      >
        <Ionicons name={showFabMenu ? 'close' : 'add'} size={32} color="#FFF" />
      </TouchableOpacity>

      {/* Manual Add Modal */}
      {renderAddModal()}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  categorySection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  itemCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
    fontFamily: 'Poppins_600SemiBold',
  },
  itemCategory: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
  deleteButton: {
    padding: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    minWidth: 100,
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
  },
  expiryText: {
    fontSize: 12,
    color: '#FF9500',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
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
    paddingHorizontal: 40,
    fontFamily: 'Poppins_400Regular',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabActive: {
    backgroundColor: '#E85A2A',
  },
  fabMenu: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    alignItems: 'flex-end',
    gap: 12,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fabMenuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  fabMenuText: {
    backgroundColor: '#FF6B35',
    color: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'Poppins_500Medium',
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#000',
  },
  categoryPicker: {
    marginBottom: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#FF6B35',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins_500Medium',
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  addButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
});

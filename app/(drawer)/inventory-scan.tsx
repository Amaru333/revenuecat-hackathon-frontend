import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

interface ScannedItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

export default function InventoryScanScreen() {
  const { token } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [scanType, setScanType] = useState<'receipt' | 'pantry'>('receipt');
  const [scanning, setScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [scanId, setScanId] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      let result;
      
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Camera permission is required to take photos');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: false,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Gallery permission is required to select photos');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: false,
        });
      }

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        scanImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const scanImage = async (imageUri: string) => {
    setScanning(true);
    setScannedItems([]);

    try {
      const formData = new FormData();
      
      // @ts-ignore - React Native FormData accepts this format
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'inventory.jpg',
      });
      formData.append('scanType', scanType);

      const response = await api.post('/inventory/scan', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setScanId(response.data.scanId);
      setScannedItems(response.data.items);
    } catch (error: any) {
      console.error('Scan error:', error);
      Alert.alert(
        'Scan Failed',
        error.response?.data?.error || 'Failed to scan image. Please try again.'
      );
      setSelectedImage(null);
    } finally {
      setScanning(false);
    }
  };

  const updateItemQuantity = (index: number, delta: number) => {
    const newItems = [...scannedItems];
    newItems[index].quantity = Math.max(0, newItems[index].quantity + delta);
    setScannedItems(newItems);
  };

  const updateItemField = (index: number, field: keyof ScannedItem, value: string) => {
    const newItems = [...scannedItems];
    if (field === 'quantity') {
      newItems[index][field] = parseFloat(value) || 0;
    } else {
      // @ts-ignore
      newItems[index][field] = value;
    }
    setScannedItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = scannedItems.filter((_, i) => i !== index);
    setScannedItems(newItems);
  };

  const confirmItems = async () => {
    if (scannedItems.length === 0) {
      Alert.alert('No Items', 'Please scan an image first');
      return;
    }

    setConfirming(true);

    try {
      await api.post(
        '/inventory/confirm',
        {
          scanId,
          items: scannedItems.filter(item => item.quantity > 0),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert(
        'Success',
        `${scannedItems.length} items added to your inventory`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Confirm error:', error);
      Alert.alert('Error', 'Failed to save items to inventory');
    } finally {
      setConfirming(false);
    }
  };

  const renderScannedItem = (item: ScannedItem, index: number) => (
    <View key={index} style={styles.scannedItemCard}>
      <View style={styles.itemRow}>
        <TextInput
          style={styles.itemNameInput}
          value={item.name}
          onChangeText={(value) => updateItemField(index, 'name', value)}
          placeholder="Item name"
        />
        <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeButton}>
          <Ionicons name="close-circle" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <View style={styles.itemDetailsRow}>
        <View style={styles.quantityControl}>
          <TouchableOpacity
            onPress={() => updateItemQuantity(index, -1)}
            style={styles.quantityBtn}
          >
            <Ionicons name="remove" size={20} color="#000" />
          </TouchableOpacity>
          <Text style={styles.quantityValue}>{item.quantity}</Text>
          <TouchableOpacity
            onPress={() => updateItemQuantity(index, 1)}
            style={styles.quantityBtn}
          >
            <Ionicons name="add" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.unitInput}
          value={item.unit}
          onChangeText={(value) => updateItemField(index, 'unit', value)}
          placeholder="Unit"
        />

        <TextInput
          style={styles.categoryInput}
          value={item.category}
          onChangeText={(value) => updateItemField(index, 'category', value)}
          placeholder="Category"
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Scan Type Selection */}
        {!selectedImage && (
          <View style={styles.scanTypeContainer}>
            <Text style={styles.sectionTitle}>What are you scanning?</Text>
            <View style={styles.scanTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.scanTypeButton,
                  scanType === 'receipt' && styles.scanTypeButtonActive,
                ]}
                onPress={() => setScanType('receipt')}
              >
                <Ionicons
                  name="receipt-outline"
                  size={32}
                  color={scanType === 'receipt' ? '#FFF' : '#000'}
                />
                <Text
                  style={[
                    styles.scanTypeText,
                    scanType === 'receipt' && styles.scanTypeTextActive,
                  ]}
                >
                  Receipt
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.scanTypeButton,
                  scanType === 'pantry' && styles.scanTypeButtonActive,
                ]}
                onPress={() => setScanType('pantry')}
              >
                <Ionicons
                  name="basket-outline"
                  size={32}
                  color={scanType === 'pantry' ? '#FFF' : '#000'}
                />
                <Text
                  style={[
                    styles.scanTypeText,
                    scanType === 'pantry' && styles.scanTypeTextActive,
                  ]}
                >
                  Pantry Photo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Image Selection */}
        {!selectedImage && (
          <View style={styles.imageSelectionContainer}>
            <Text style={styles.sectionTitle}>Choose Image Source</Text>
            
            <TouchableOpacity
              style={styles.imageSourceButton}
              onPress={() => pickImage('camera')}
            >
              <Ionicons name="camera" size={24} color="#000" />
              <Text style={styles.imageSourceText}>Take Photo</Text>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.imageSourceButton}
              onPress={() => pickImage('gallery')}
            >
              <Ionicons name="images" size={24} color="#000" />
              <Text style={styles.imageSourceText}>Choose from Gallery</Text>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>
          </View>
        )}

        {/* Selected Image Preview */}
        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
            {!scanning && scannedItems.length === 0 && (
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={() => {
                  setSelectedImage(null);
                  setScannedItems([]);
                }}
              >
                <Text style={styles.changeImageText}>Change Image</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Scanning Indicator */}
        {scanning && (
          <View style={styles.scanningContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.scanningText}>Analyzing image...</Text>
          </View>
        )}

        {/* Scanned Items */}
        {scannedItems.length > 0 && (
          <View style={styles.scannedItemsContainer}>
            <Text style={styles.sectionTitle}>
              Found {scannedItems.length} items
            </Text>
            <Text style={styles.sectionSubtitle}>
              Review and edit before adding to inventory
            </Text>
            {scannedItems.map(renderScannedItem)}
          </View>
        )}
      </ScrollView>

      {/* Confirm Button */}
      {scannedItems.length > 0 && (
        <View style={styles.confirmButtonContainer}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={confirmItems}
            disabled={confirming}
          >
            {confirming ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                <Text style={styles.confirmButtonText}>
                  Add to Inventory
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  scanTypeContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontFamily: 'Poppins_400Regular',
  },
  scanTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  scanTypeButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  scanTypeButtonActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  scanTypeText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  scanTypeTextActive: {
    color: '#FFF',
  },
  imageSelectionContainer: {
    padding: 20,
  },
  imageSourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  imageSourceText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    fontFamily: 'Poppins_400Regular',
  },
  imagePreviewContainer: {
    padding: 20,
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
  },
  changeImageButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  changeImageText: {
    fontSize: 16,
    color: '#007AFF',
    fontFamily: 'Poppins_600SemiBold',
  },
  scanningContainer: {
    padding: 40,
    alignItems: 'center',
  },
  scanningText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
  scannedItemsContainer: {
    padding: 20,
  },
  scannedItemCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemNameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 4,
  },
  removeButton: {
    marginLeft: 8,
  },
  itemDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 4,
  },
  quantityBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    minWidth: 40,
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
  },
  unitInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    fontFamily: 'Poppins_400Regular',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 8,
  },
  categoryInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    fontFamily: 'Poppins_400Regular',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 8,
  },
  confirmButtonContainer: {
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Poppins_600SemiBold',
  },
});

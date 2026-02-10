import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { uploadMediaForRecipe, generateRecipeFromText } from '@/services/recipeService';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function UploadScreen() {
  const { user, token } = useAuth();
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mealDescription, setMealDescription] = useState('');

  // Request permissions
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'We need camera and photo library permissions to let you upload images.',
          [{ text: 'OK' }],
        );
        return false;
      }
    }
    return true;
  };

  // Take photo with camera
  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setSelectedMedia(uri);
        setMediaType('image');

        // Auto-upload and analyze
        await handleUpload(uri, 'image');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  // Choose from gallery
  const chooseFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setSelectedMedia(uri);
        setMediaType('image');

        // Auto-upload and analyze
        await handleUpload(uri, 'image');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  // Choose video
  const chooseVideo = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setSelectedMedia(uri);
        setMediaType('video');

        // Auto-upload and analyze
        await handleUpload(uri, 'video');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select video. Please try again.');
    }
  };

  // Show upload options popup
  const showUploadOptions = () => {
    Alert.alert(
      'Upload Media',
      'Choose an option to upload your food photo or video',
      [
        {
          text: 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: 'Choose from Gallery',
          onPress: chooseFromGallery,
        },
        {
          text: 'Choose Video',
          onPress: chooseVideo,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true },
    );
  };

  // Upload and analyze
  const handleUpload = async (mediaUri?: string, type?: 'image' | 'video') => {
    const uri = mediaUri || selectedMedia;
    const mediaTypeToUse = type || mediaType;

    if (!uri || !mediaTypeToUse) return;

    console.log('🚀 Starting upload...', { uri: uri.substring(0, 50), type: mediaTypeToUse });
    setIsUploading(true);

    try {
      console.log('📤 Calling uploadMediaForRecipe API...');
      const response = await uploadMediaForRecipe(uri, mediaTypeToUse, user?.id);
      console.log('📥 API Response:', response);

      if (response.success && response.recipe) {
        console.log('✅ Recipe received:', response.recipe.name);

        // Navigate to recipe results page
        router.push({
          pathname: '/(drawer)/recipe-result',
          params: {
            recipe: JSON.stringify(response.recipe),
          },
        });

        // Reset state
        setSelectedMedia(null);
        setMediaType(null);
        setMealDescription('');
      } else {
        console.log('❌ API returned error:', response.message);
        Alert.alert('Error', response.message || 'Failed to analyze media.');
      }
    } catch (error) {
      console.error('💥 Upload error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsUploading(false);
      console.log('✅ Upload complete');
    }
  };

  // Handle text-based submit
  const handleTextSubmit = async () => {
    if (!mealDescription.trim()) {
      Alert.alert('Empty Input', 'Please describe your meal or upload a photo/video.');
      return;
    }

    if (!token) {
      Alert.alert('Authentication Required', 'Please log in to generate recipes.');
      return;
    }

    console.log('🚀 Starting text-based recipe generation...', { description: mealDescription });
    setIsUploading(true);

    try {
      console.log('📤 Calling generateRecipeFromText API...');
      const response = await generateRecipeFromText(mealDescription, token);
      console.log('📥 API Response:', response);

      if (response.success && response.recipe) {
        console.log('✅ Recipe received:', response.recipe.name);

        // Navigate to recipe results page using replace to ensure fresh state
        router.replace({
          pathname: '/(drawer)/recipe-result',
          params: {
            recipe: JSON.stringify(response.recipe),
          },
        });

        // Reset state
        setMealDescription('');
      } else {
        console.log('❌ API returned error:', response.message);
        Alert.alert('Error', response.message || 'Failed to generate recipe.');
      }
    } catch (error) {
      console.error('💥 Text generation error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsUploading(false);
      console.log('✅ Text generation complete');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#F5F5F5' }]}>
      <View style={styles.imageContainer}>
        <View style={styles.imageWrapper}>
          <Image
            source={require('@/assets/images/food.png')}
            style={styles.foodImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>What are you cooking?</Text>
        <Text style={styles.subtitle}>Snap a photo, paste a link, or describe a dish</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 119 : 0}
        style={{ flexShrink: 0 }}
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={takePhoto}
            disabled={isUploading}
            activeOpacity={0.7}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="camera" size={22} color="#FFF" />
            </View>
            <Text style={styles.quickActionLabel}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={chooseFromGallery}
            disabled={isUploading}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#4ECDC4' }]}>
              <Ionicons name="images" size={22} color="#FFF" />
            </View>
            <Text style={styles.quickActionLabel}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={chooseVideo}
            disabled={isUploading}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FF3B30' }]}>
              <Ionicons name="videocam" size={22} color="#FFF" />
            </View>
            <Text style={styles.quickActionLabel}>Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/(drawer)/suggestions')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FFB800' }]}>
              <Ionicons name="bulb" size={22} color="#FFF" />
            </View>
            <Text style={styles.quickActionLabel}>Suggest</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          {isUploading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B35" />
              <Text style={styles.loadingText}>Analyzing your meal...</Text>
            </View>
          )}

          <TextInput
            placeholder="Paste a video link or describe your meal..."
            placeholderTextColor="#999"
            style={styles.input}
            value={mealDescription}
            onChangeText={setMealDescription}
            onSubmitEditing={handleTextSubmit}
            returnKeyType="search"
            editable={!isUploading}
          />
          <View style={styles.uploadButtonsContainer}>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={showUploadOptions}
              disabled={isUploading}
            >
              <Ionicons name="attach" size={20} color="#666" />
              <Text style={styles.uploadBtnText}>Attach</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleTextSubmit}
              disabled={isUploading}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  quickActionButton: {
    alignItems: 'center',
    gap: 6,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Poppins_500Medium',
  },
  uploadButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 40,
  },
  uploadBtnText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    fontFamily: 'Poppins_400Regular',
    paddingBottom: 16,
    paddingTop: 8,
    fontSize: 15,
    color: '#000',
  },
  container: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    marginTop: 24,
    textAlign: 'center',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
    color: '#999',
    fontFamily: 'Poppins_400Regular',
    paddingHorizontal: 20,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imageWrapper: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FFF3ED',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  foodImage: {
    width: 120,
    height: 120,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
});

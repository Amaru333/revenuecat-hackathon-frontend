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
import { uploadMediaForRecipe } from '@/services/recipeService';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function UploadScreen() {
  const { user } = useAuth();
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
          [{ text: 'OK' }]
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
      { cancelable: true }
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
  const handleTextSubmit = () => {
    if (!mealDescription.trim()) {
      Alert.alert('Empty Input', 'Please describe your meal or upload a photo/video.');
      return;
    }
    
    // For now, show a message that text search is coming soon
    // In the future, this could call a different API endpoint for text-based recipe search
    Alert.alert(
      'Text Search',
      'Text-based recipe search is coming soon! For now, please upload a photo or video of your meal.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: "#F5F5F5" }]}>
      <View style={styles.imageContainer}>
        <View style={styles.imageWrapper}>
          <Image 
            source={require('@/assets/images/food.png')} 
            style={styles.foodImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.text}>Let's find out what you're eating!</Text>
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 119 : 0}
        style={{ flexShrink: 0 }}
      >
        <View style={styles.inputContainer}>
          {isUploading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#000" />
              <Text style={styles.loadingText}>Analyzing your meal...</Text>
            </View>
          )}
          
          <TextInput
            placeholder="Describe your meal or upload a photo/video"
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
              <Ionicons name="cloud-upload-outline" size={18} />
              <Text style={{ fontFamily: 'Poppins_400Regular' }}>Upload</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.uploadButton, { backgroundColor: '#000', width: 40 }]}
              onPress={handleTextSubmit}
              disabled={isUploading}
            >
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}


const styles = StyleSheet.create({
  uploadButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 999,
    padding: 10,
    justifyContent: 'center',
    height: 40,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 20,
    padding: 10,
  },
  input: {
    borderWidth: 1,
    backgroundColor: '#fff',
    borderColor: '#FFF',
    borderRadius: 10,
    fontFamily: 'Poppins_400Regular',
    paddingBottom: 20,
    paddingTop: 10,
  },
  container: {
    flex: 1,
  },
  text: {
    fontSize: 24,
    marginTop: 40,
    width: '80%',  
    textAlign: 'center',
    color: '#999',
    fontFamily: 'Poppins_400Regular',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imageWrapper: {
    
  },
  foodImage: {
    width: 200,
    height: 200,
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


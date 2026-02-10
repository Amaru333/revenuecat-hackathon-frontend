import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import {
  getUserCookbooks,
  uploadCookbook,
  deleteCookbook as deleteCookbookApi,
  Cookbook,
} from '@/services/cookbookService';

export default function CookbooksScreen() {
  const { token } = useAuth();
  const [cookbooks, setCookbooks] = useState<Cookbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchCookbooks = useCallback(
    async (isRefreshing = false) => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        if (!isRefreshing) setLoading(true);
        const data = await getUserCookbooks(token);
        setCookbooks(data);
      } catch (err: any) {
        console.error('Failed to fetch cookbooks:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      fetchCookbooks();
    }, [fetchCookbooks]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCookbooks(true);
  };

  const handleUpload = async () => {
    if (!token) {
      Alert.alert('Authentication Required', 'Please log in to upload cookbooks.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      const fileName = file.name?.replace(/\.pdf$/i, '') || 'My Cookbook';

      if (Platform.OS === 'ios') {
        Alert.prompt(
          'Cookbook Name',
          'Enter a name for this cookbook:',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Upload',
              onPress: async (name?: string) => {
                await processUpload(file.uri, name || fileName);
              },
            },
          ],
          'plain-text',
          fileName,
        );
      } else {
        await processUpload(file.uri, fileName);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to select document.');
    }
  };

  const processUpload = async (uri: string, name: string) => {
    setUploading(true);
    try {
      // Read file as base64
      const base64Data = await readAsStringAsync(uri, {
        encoding: 'base64',
      });

      const result = await uploadCookbook(base64Data, name, token!);

      Alert.alert(
        'Success! 🎉',
        `"${result.cookbook.name}" uploaded with ${result.cookbook.recipes.length} recipes extracted!`,
      );

      fetchCookbooks();
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload cookbook.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (cookbook: Cookbook) => {
    Alert.alert('Delete Cookbook', `Are you sure you want to delete "${cookbook.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCookbookApi(cookbook.id, token!);
            setCookbooks((prev) => prev.filter((c) => c.id !== cookbook.id));
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete cookbook.');
          }
        },
      },
    ]);
  };

  const handleCookbookPress = (cookbook: Cookbook) => {
    router.push({
      pathname: '/(drawer)/cookbook-detail' as any,
      params: {
        cookbookId: cookbook.id.toString(),
        cookbookName: cookbook.name,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading cookbooks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <View style={styles.uploadingCard}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.uploadingTitle}>Analyzing Cookbook...</Text>
            <Text style={styles.uploadingSubtitle}>
              AI is extracting recipes from your PDF. This may take a moment.
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Ionicons name="book" size={28} color="#8B5CF6" />
          <Text style={styles.headerTitle}>My Cookbooks</Text>
        </View>
        <Text style={styles.headerSubtitle}>Upload PDF cookbooks and explore recipes</Text>

        {cookbooks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={80} color="#CCC" />
            <Text style={styles.emptyTitle}>No Cookbooks Yet</Text>
            <Text style={styles.emptyText}>
              Upload a cookbook PDF to extract recipes and check which ones you can make with your
              current ingredients!
            </Text>
          </View>
        ) : (
          cookbooks.map((cookbook) => (
            <TouchableOpacity
              key={cookbook.id}
              style={styles.cookbookCard}
              onPress={() => handleCookbookPress(cookbook)}
              onLongPress={() => handleDelete(cookbook)}
              activeOpacity={0.7}
            >
              <View style={styles.cookbookIconContainer}>
                <Ionicons name="book" size={32} color="#8B5CF6" />
              </View>
              <View style={styles.cookbookInfo}>
                <Text style={styles.cookbookName}>{cookbook.name}</Text>
                <View style={styles.cookbookMeta}>
                  <Ionicons name="restaurant-outline" size={14} color="#666" />
                  <Text style={styles.cookbookMetaText}>
                    {cookbook.totalRecipes} recipe{cookbook.totalRecipes !== 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.cookbookMetaDot}>•</Text>
                  <Ionicons name="calendar-outline" size={14} color="#666" />
                  <Text style={styles.cookbookMetaText}>
                    {new Date(cookbook.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#CCC" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Upload FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleUpload}
        disabled={uploading}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
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
    paddingBottom: 100,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
    fontFamily: 'Poppins_400Regular',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  cookbookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cookbookIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F0EBFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cookbookInfo: {
    flex: 1,
  },
  cookbookName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
    fontFamily: 'Poppins_600SemiBold',
  },
  cookbookMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cookbookMetaText: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
  cookbookMetaDot: {
    fontSize: 13,
    color: '#CCC',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  uploadingCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  uploadingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  uploadingSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
});

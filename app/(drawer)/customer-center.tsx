import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { router } from 'expo-router';
import { useRevenueCat } from '@/contexts/RevenueCatContext';

export default function CustomerCenterScreen() {
  const { refreshCustomerInfo } = useRevenueCat();

  useEffect(() => {
    presentCustomerCenter();
  }, []);

  const presentCustomerCenter = async () => {
    try {
      await RevenueCatUI.presentCustomerCenter();
      
      // Refresh customer info after customer center closes
      await refreshCustomerInfo();
      
      // Navigate back
      router.back();
    } catch (error) {
      console.error('Customer center error:', error);
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#000" />
      <Text style={styles.loadingText}>Loading subscription management...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
});

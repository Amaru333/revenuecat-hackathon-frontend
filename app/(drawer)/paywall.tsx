import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { router } from 'expo-router';
import { useRevenueCat } from '@/contexts/RevenueCatContext';

export default function PaywallScreen() {
  const { refreshCustomerInfo } = useRevenueCat();

  useEffect(() => {
    presentPaywall();
  }, []);

  const presentPaywall = async () => {
    try {
      const result = await RevenueCatUI.presentPaywall();
      
      // Handle result
      if (result === 'PURCHASED' || result === 'RESTORED') {
        // Refresh customer info
        await refreshCustomerInfo();
        // Navigate back
        router.back();
      } else if (result === 'CANCELLED') {
        // User cancelled, go back
        router.back();
      }
    } catch (error) {
      console.error('Paywall error:', error);
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#000" />
      <Text style={styles.loadingText}>Loading subscription options...</Text>
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

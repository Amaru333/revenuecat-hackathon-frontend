import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useRevenueCat } from '@/contexts/RevenueCatContext';
import { router } from 'expo-router';

function UsageBar({ label, current, limit, icon }: { label: string; current: number; limit: number; icon: string }) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const isExhausted = !isUnlimited && current >= limit;

  return (
    <View style={usageStyles.barContainer}>
      <View style={usageStyles.barHeader}>
        <View style={usageStyles.barLabelRow}>
          <Ionicons name={icon as any} size={16} color={isExhausted ? '#FF3B30' : '#666'} />
          <Text style={[usageStyles.barLabel, isExhausted && usageStyles.barLabelExhausted]}>
            {label}
          </Text>
        </View>
        <Text style={[usageStyles.barCount, isExhausted && usageStyles.barCountExhausted]}>
          {isUnlimited ? 'Unlimited' : `${current}/${limit}`}
        </Text>
      </View>
      {!isUnlimited && (
        <View style={usageStyles.barTrack}>
          <View
            style={[
              usageStyles.barFill,
              { width: `${percentage}%` },
              isExhausted && usageStyles.barFillExhausted,
            ]}
          />
        </View>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const {
    isPro,
    isLoading,
    subscriptionStatus,
    usage,
    showPaywall,
    showCustomerCenter,
    canUseFeature,
  } = useRevenueCat();

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  const handleUpgradeToPro = async () => {
    await showPaywall();
  };

  const handleManageSubscription = async () => {
    await showCustomerCenter();
  };

  // Get usage info for each feature
  const recipeGen = canUseFeature('recipe_generation');
  const invScan = canUseFeature('inventory_scan');
  const recipeSug = canUseFeature('recipe_suggestion');
  const cookbookUp = canUseFeature('cookbook_upload');
  const savedRec = canUseFeature('saved_recipes');
  const shopLists = canUseFeature('shopping_lists');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={60} color="#FFFFFF" />
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{user?.username || 'User'}</Text>
          {isPro && (
            <View style={styles.proBadge}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>
        <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>
      </View>

      {/* Subscription Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#000" />
          </View>
        ) : isPro ? (
          <>
            <View style={styles.subscriptionCard}>
              <View style={styles.subscriptionHeader}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.subscriptionTitle}>Bytes Pro</Text>
              </View>
              <Text style={styles.subscriptionDescription}>
                You have access to all premium features
              </Text>
              {subscriptionStatus.productIdentifier && (
                <Text style={styles.subscriptionPlan}>
                  Plan: {subscriptionStatus.productIdentifier === 'monthly' ? 'Monthly' : 'Yearly'}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.manageButton}
              onPress={handleManageSubscription}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={20} color="#000" />
              <Text style={styles.manageButtonText}>Manage Subscription</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.subscriptionCard}>
              <View style={styles.subscriptionHeader}>
                <Ionicons name="star-outline" size={24} color="#666" />
                <Text style={styles.subscriptionTitle}>Free Plan</Text>
              </View>
              <Text style={styles.subscriptionDescription}>
                Upgrade to Pro for unlimited recipes and premium features
              </Text>
            </View>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleUpgradeToPro}
              activeOpacity={0.8}
            >
              <Ionicons name="star" size={20} color="#FFFFFF" />
              <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Usage Section */}
      <View style={styles.section}>
        <View style={styles.usageSectionHeader}>
          <Text style={styles.sectionTitle}>Usage</Text>
          {!isPro && (
            <View style={styles.tierBadge}>
              <Text style={styles.tierBadgeText}>FREE</Text>
            </View>
          )}
        </View>

        <View style={styles.usageCard}>
          <Text style={usageStyles.categoryTitle}>Daily Limits</Text>
          <UsageBar
            label="Recipe Generations"
            current={recipeGen.current}
            limit={recipeGen.limit}
            icon="sparkles"
          />
          <UsageBar
            label="Inventory Scans"
            current={invScan.current}
            limit={invScan.limit}
            icon="scan"
          />
          <UsageBar
            label="Recipe Suggestions"
            current={recipeSug.current}
            limit={recipeSug.limit}
            icon="bulb"
          />

          <View style={usageStyles.divider} />

          <Text style={usageStyles.categoryTitle}>Total Limits</Text>
          <UsageBar
            label="Cookbook Uploads"
            current={cookbookUp.current}
            limit={cookbookUp.limit}
            icon="book"
          />
          <UsageBar
            label="Saved Recipes"
            current={savedRec.current}
            limit={savedRec.limit}
            icon="bookmark"
          />
          <UsageBar
            label="Shopping Lists"
            current={shopLists.current}
            limit={shopLists.limit}
            icon="cart"
          />
        </View>

        {!isPro && (
          <TouchableOpacity
            style={styles.upgradeSmallButton}
            onPress={handleUpgradeToPro}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-up-circle" size={18} color="#FF6B35" />
            <Text style={styles.upgradeSmallText}>Remove all limits with Pro</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={24} color="#666" />
          <Text style={styles.menuText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <Ionicons name="heart-outline" size={24} color="#666" />
          <Text style={styles.menuText}>Favorites</Text>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <Ionicons name="settings-outline" size={24} color="#666" />
          <Text style={styles.menuText}>Preferences</Text>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <Ionicons name="help-circle-outline" size={24} color="#666" />
          <Text style={styles.menuText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <Ionicons name="information-circle-outline" size={24} color="#666" />
          <Text style={styles.menuText}>About Bytes</Text>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const usageStyles = StyleSheet.create({
  categoryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    fontFamily: 'Poppins_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  barContainer: {
    marginBottom: 12,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  barLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Poppins_400Regular',
  },
  barLabelExhausted: {
    color: '#FF3B30',
  },
  barCount: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Poppins_500Medium',
  },
  barCountExhausted: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#FF6B35',
  },
  barFillExhausted: {
    backgroundColor: '#FF3B30',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 30,
    paddingHorizontal: 20,
    backgroundColor: '#F5F5F5',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  proBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFD700',
    fontFamily: 'Poppins_600SemiBold',
  },
  email: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  usageSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    marginBottom: 12,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.5,
  },
  usageCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  upgradeSmallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 10,
  },
  upgradeSmallText: {
    fontSize: 14,
    color: '#FF6B35',
    fontFamily: 'Poppins_500Medium',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  subscriptionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins_600SemiBold',
  },
  subscriptionDescription: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
  },
  subscriptionPlan: {
    fontSize: 14,
    color: '#000',
    fontFamily: 'Poppins_500Medium',
    marginTop: 8,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  manageButtonText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    color: '#000',
    fontFamily: 'Poppins_400Regular',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#FFF',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    color: '#000',
    fontFamily: 'Poppins_400Regular',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginBottom: 20,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#FF3B30',
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  version: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Poppins_400Regular',
  },
});

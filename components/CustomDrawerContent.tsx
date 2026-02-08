import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  const menuItems = [
    {
      name: 'Home',
      icon: 'home-outline',
      route: '/(drawer)',
      activeIcon: 'home',
    },
    {
      name: 'Recipes',
      icon: 'restaurant-outline',
      route: '/(drawer)/recipes',
      activeIcon: 'restaurant',
    },
    {
      name: 'Inventory',
      icon: 'basket-outline',
      route: '/(drawer)/inventory',
      activeIcon: 'basket',
    },
    {
      name: 'Shopping List',
      icon: 'cart-outline',
      route: '/(drawer)/shopping-list',
      activeIcon: 'cart',
    },
    {
      name: 'Favorites',
      icon: 'heart-outline',
      route: '/(drawer)/favorites',
      activeIcon: 'heart',
    },
    {
      name: 'Cook History',
      icon: 'time-outline',
      route: '/(drawer)/cook-history',
      activeIcon: 'time',
    },
    {
      name: 'Profile',
      icon: 'person-outline',
      route: '/(drawer)/profile',
      activeIcon: 'person',
    },
  ];

  const currentRoute = props.state.routeNames[props.state.index];

  return (
    <View style={styles.container}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
        {/* User Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.userName}>
            {user?.username || 'User'}
          </Text>
          <Text style={styles.userEmail}>
            {user?.email || 'user@example.com'}
          </Text>
        </View>

        {/* Navigation Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => {
            const isActive = currentRoute === item.route.split('/').pop() || 
                           (item.route === '/(drawer)' && currentRoute === 'index');
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuItem,
                  isActive && styles.menuItemActive
                ]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isActive ? item.activeIcon as any : item.icon as any}
                  size={24}
                  color={isActive ? '#000' : '#666'}
                />
                <Text
                  style={[
                    styles.menuText,
                    isActive && styles.menuTextActive
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </DrawerContentScrollView>

      {/* Logout Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        
        <Text style={styles.version}>
          Version 1.0.0
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  profileSection: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 10,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#000',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: 'Poppins_600SemiBold',
    color: '#000',
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
  },
  menuSection: {
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    marginVertical: 2,
    borderRadius: 12,
  },
  menuItemActive: {
    backgroundColor: '#F5F5F5',
  },
  menuText: {
    fontSize: 16,
    marginLeft: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#666',
  },
  menuTextActive: {
    color: '#000',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
    backgroundColor: '#000',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  version: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    color: '#999',
  },
});

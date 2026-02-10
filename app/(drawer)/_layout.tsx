import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation, useRouter } from 'expo-router';
import CustomDrawerContent from '@/components/CustomDrawerContent';

// Screens that should show a back arrow instead of hamburger
const SUB_SCREENS = new Set([
  'recipe-result',
  'cooking-mode',
  'suggestions',
  'inventory-scan',
  'paywall',
  'customer-center',
]);

// Custom header with hamburger (top-level screens)
function DrawerHeader() {
  const navigation = useNavigation();

  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      >
        <Ionicons name="menu" size={24} color="#000" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => navigation.navigate('profile' as never)}
      >
        <Ionicons name="person-outline" size={24} color="#000" />
      </TouchableOpacity>
    </View>
  );
}

// Custom header with back arrow (sub-screens)
function BackHeader() {
  const router = useRouter();
  const navigation = useNavigation();

  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            navigation.navigate('index' as never);
          }
        }}
      >
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => navigation.navigate('profile' as never)}
      >
        <Ionicons name="person-outline" size={24} color="#000" />
      </TouchableOpacity>
    </View>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props: any) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerStyle: {
          backgroundColor: '#FFFFFF',
          width: 300,
        },
        headerStyle: {
          backgroundColor: '#F5F5F5',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: '#000',
        headerTitle: '',
        header: () => <DrawerHeader />,
        drawerActiveTintColor: '#000',
        drawerInactiveTintColor: '#666',
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: 'Home',
        }}
      />
      <Drawer.Screen
        name="recipes"
        options={{
          drawerLabel: 'Recipes',
        }}
      />
      <Drawer.Screen
        name="inventory"
        options={{
          drawerLabel: 'Inventory',
        }}
      />
      <Drawer.Screen
        name="favorites"
        options={{
          drawerLabel: 'Favorites',
        }}
      />
      <Drawer.Screen
        name="shopping-list"
        options={{
          drawerLabel: 'Shopping List',
        }}
      />
      <Drawer.Screen
        name="cook-history"
        options={{
          drawerLabel: 'Cook History',
        }}
      />
      <Drawer.Screen
        name="suggestions"
        options={{
          drawerLabel: 'Recipe Suggestions',
          drawerItemStyle: { display: 'none' },
          header: () => <BackHeader />,
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          drawerLabel: 'Profile',
        }}
      />
      <Drawer.Screen
        name="recipe-result"
        options={{
          drawerLabel: 'Recipe Result',
          drawerItemStyle: { display: 'none' },
          header: () => <BackHeader />,
        }}
      />
      <Drawer.Screen
        name="inventory-scan"
        options={{
          drawerLabel: 'Scan Inventory',
          drawerItemStyle: { display: 'none' },
          header: () => <BackHeader />,
        }}
      />
      <Drawer.Screen
        name="paywall"
        options={{
          drawerLabel: 'Subscription',
          drawerItemStyle: { display: 'none' },
          header: () => <BackHeader />,
        }}
      />
      <Drawer.Screen
        name="customer-center"
        options={{
          drawerLabel: 'Manage Subscription',
          drawerItemStyle: { display: 'none' },
          header: () => <BackHeader />,
        }}
      />
      <Drawer.Screen
        name="cooking-mode"
        options={{
          drawerLabel: 'Cooking Mode',
          drawerItemStyle: { display: 'none' },
          header: () => <BackHeader />,
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: '#F5F5F5',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
});

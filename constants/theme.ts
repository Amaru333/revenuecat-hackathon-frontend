/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Branding colors from shared/branding.js
const tintColorLight = '#FF6B35'; // Primary orange
const tintColorDark = '#FF8C61'; // Lighter orange

export const Colors = {
  light: {
    text: '#2C3E50',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    tint: tintColorLight,
    primary: '#FF6B35',
    primaryDark: '#E85A2A',
    primaryLight: '#FF8C61',
    secondary: '#4ECDC4',
    accent: '#FFE66D',
    icon: '#7F8C8D',
    tabIconDefault: '#7F8C8D',
    tabIconSelected: tintColorLight,
    success: '#27AE60',
    error: '#E74C3C',
    warning: '#F39C12',
    info: '#3498DB',
  },
  dark: {
    text: '#ECEDEE',
    background: '#1A1A1A',
    surface: '#2D2D2D',
    tint: tintColorDark,
    primary: '#FF8C61',
    primaryDark: '#FF6B35',
    primaryLight: '#FFB094',
    secondary: '#4ECDC4',
    accent: '#FFE66D',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    success: '#27AE60',
    error: '#E74C3C',
    warning: '#F39C12',
    info: '#3498DB',
  },
};

export const Fonts = Platform.select({
  ios: {
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semiBold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
  },
  android: {
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semiBold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
  },
  default: {
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semiBold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
  },
  web: {
    regular: 'Poppins, sans-serif',
    medium: 'Poppins, sans-serif',
    semiBold: 'Poppins, sans-serif',
    bold: 'Poppins, sans-serif',
  },
});

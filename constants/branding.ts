/**
 * Branding Constants for React Native
 *
 * This file imports the shared branding configuration and exports it
 * in a format suitable for React Native/TypeScript.
 */

// Import shared branding (you may need to adjust the path based on your setup)
// For now, we'll duplicate the constants here for TypeScript compatibility

export const BRANDING = {
  // App Identity
  APP_NAME: 'Bytes',
  APP_TAGLINE: 'Discover recipes from any food photo or video',
  APP_DESCRIPTION:
    'Upload a photo or video of food and instantly get detailed recipes with ingredients, instructions, and nutritional information.',

  // Logo & Assets
  LOGO_PATH: null as string | null,
  ICON_PATH: null as string | null,
  SPLASH_IMAGE: null as string | null,

  // Brand Colors
  COLORS: {
    primary: '#FF6B35',
    primaryDark: '#E85A2A',
    primaryLight: '#FF8C61',
    secondary: '#4ECDC4',
    accent: '#FFE66D',

    background: '#FFFFFF',
    backgroundDark: '#1A1A1A',
    surface: '#F8F9FA',
    surfaceDark: '#2D2D2D',

    textPrimary: '#2C3E50',
    textSecondary: '#7F8C8D',
    textLight: '#FFFFFF',

    success: '#27AE60',
    error: '#E74C3C',
    warning: '#F39C12',
    info: '#3498DB',
  },

  // Typography
  FONTS: {
    primary: 'Inter',
    secondary: 'Playfair Display',
    mono: 'Fira Code',
  },

  // Social & Contact
  SOCIAL: {
    website: null as string | null,
    instagram: null as string | null,
    twitter: null as string | null,
    facebook: null as string | null,
    email: 'amrutesharun0599@gmail.com',
  },

  // App Store Info
  APP_STORE: {
    iosAppId: null as string | null,
    androidPackageName: null as string | null,
  },
} as const;

export const { APP_NAME, APP_TAGLINE, APP_DESCRIPTION, COLORS, FONTS, SOCIAL } = BRANDING;

export default BRANDING;

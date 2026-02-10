import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BACKEND_URL } from '../constants/URL';

const TOKEN_KEY = '@auth_token';
const USER_KEY = '@auth_user';

// API base URL
const API_URL = `${BACKEND_URL}/auth`;

const authClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
authClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: number;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  bio?: string;
  avatarUrl?: string;
  preferences?: any;
  createdAt: string;
}

export interface SignupData {
  email: string;
  password: string;
  username: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  bio?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

/**
 * Store auth token and user data
 */
export async function storeAuth(token: string, user: User): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Get stored token
 */
export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

/**
 * Get stored user
 */
export async function getStoredUser(): Promise<User | null> {
  const userJson = await AsyncStorage.getItem(USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
}

/**
 * Clear auth data
 */
export async function clearAuth(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

/**
 * Sign up with email and password
 */
export async function signup(data: SignupData): Promise<AuthResponse> {
  const response = await authClient.post('/signup', data);
  const { token, user } = response.data;
  await storeAuth(token, user);
  return response.data;
}

/**
 * Login with email and password
 */
export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await authClient.post('/login', data);
  const { token, user } = response.data;
  await storeAuth(token, user);
  return response.data;
}

/**
 * Get current user
 */
export async function getMe(): Promise<User> {
  const response = await authClient.get('/me');
  return response.data.user;
}

/**
 * Update user profile
 */
export async function updateProfile(data: Partial<User>): Promise<User> {
  const response = await authClient.put('/profile', data);
  const user = response.data.user;
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  await clearAuth();
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}

export default {
  signup,
  login,
  getMe,
  updateProfile,
  logout,
  isAuthenticated,
  getToken,
  getStoredUser,
  storeAuth,
  clearAuth,
};

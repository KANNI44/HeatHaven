import { Platform } from 'react-native';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  // Android emulator hits host machine via 10.0.2.2
  (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000');


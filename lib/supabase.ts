import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  avatar?: string;
  googleId?: string;
  appleId?: string;
}

export interface Recording {
  id: string;
  userId: string;
  audioUrl: string;
  transcript: string;
  summary: string;
  createdAt: string;
}

export interface Event {
  id: string;
  userId: string;
  title: string;
  date: string;
  calendarId?: string;
  source: string;
}

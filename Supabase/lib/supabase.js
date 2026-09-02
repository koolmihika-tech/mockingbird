import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'Mockingbird' },
  auth: {
    // On native, persist the session and the PKCE code_verifier across app
    // restarts / backgrounding. Without this the client uses in-memory storage
    // and loses the verifier mid-OAuth, breaking exchangeCodeForSession
    // ("invalid flow state, no valid flow state found").
    // On web (incl. Expo Router's static SSR in Node), AsyncStorage resolves to
    // a window.localStorage shim that throws during server rendering, so let
    // supabase-js fall back to its own guarded localStorage handling there.
    ...(Platform.OS === 'web' ? {} : { storage: AsyncStorage }),
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dyuojszpqblzahollrbh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5dW9qc3pwcWJsemFob2xscmJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTI1ODUsImV4cCI6MjA5NDk2ODU4NX0.5jrW-SE5Fy37Nv3ZOvytH_HeKAWJiy22Tu47QCnLCKI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
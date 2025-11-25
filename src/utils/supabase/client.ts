import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Create a single shared Supabase client instance
// This prevents "Multiple GoTrueClient instances" warning
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import { debug } from './utils/debug';

// Import your Database type if you have it defined
// import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  debug.error('Missing Supabase environment variables', {
    url: !!supabaseUrl,
    anonKey: !!supabaseAnonKey
  });
  throw new Error('Missing Supabase environment variables');
}

debug.auth('Initializing Supabase client', { url: supabaseUrl });

// If you have a Database type, use it for type safety:
// export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// Set up auth state change listener
supabase.auth.onAuthStateChange((event, session) => {
  debug.auth('Auth state changed', { event, session: session?.user?.email });
}); 
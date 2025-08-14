import { supabase } from '../supabaseClient';

export interface LiveblocksTokenResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

/**
 * Fetches a Liveblocks token from our Supabase Edge Function
 */
export async function getLiveblocksToken(): Promise<string> {
  try {
    // Get the current session to include in the request
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('Authentication required to get Liveblocks token');
    }

    /*console.log(`🔐 [TOKEN-SERVICE] Requesting Liveblocks token for user: ${session.user.id}`);*/

    // Call our Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('liveblocks-token', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    /*console.log(`🔐 [TOKEN-SERVICE] Edge Function response:`, { data, error });*/

    if (error) {
     /*console.error('🔐 [TOKEN-SERVICE] Error from edge function:', error);*/
      throw new Error(`Failed to get Liveblocks token: ${error.message}`);
    }

    if (!data?.token) {
      /*console.error('🔐 [TOKEN-SERVICE] No token in response:', data);*/
      throw new Error('No token received from server');
    }

    /*console.log(`✅ [TOKEN-SERVICE] Successfully received token for user: ${data.user?.name}`);*/ 
    return data.token;

  } catch (error) {
    /*console.error('🔐 [TOKEN-SERVICE] Token request failed:', error);*/
    throw error;
  }
}

/**
 * Cached token storage for avoiding repeated requests
 */
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Gets a cached Liveblocks token or fetches a new one if expired
 */
export async function getCachedLiveblocksToken(): Promise<string> {
  const now = Date.now();
  
  // Check if we have a valid cached token (with 5 minute buffer)
  if (cachedToken && tokenExpiry > now + 300000) {
    /*console.log(`🔐 [TOKEN-SERVICE] Using cached token (expires in ${Math.round((tokenExpiry - now) / 60000)} minutes)`);*/
    return cachedToken;
  }

  // Token expired or doesn't exist, get a new one
  /*console.log(`🔐 [TOKEN-SERVICE] Token expired or missing, fetching new token`);*/
  
  try {
    const token = await getLiveblocksToken();
    
    // Cache the token (Liveblocks tokens typically last 24 hours)
    cachedToken = token;
    tokenExpiry = now + (23 * 60 * 60 * 1000); // 23 hours to be safe
    
    return token;
  } catch (error) {
    /*console.error('🔐 [TOKEN-SERVICE] Token request failed, this is expected if Edge Functions are not set up:', error);*/
    
    // Clear cached token on error
    cachedToken = null;
    tokenExpiry = 0;
    
    // For development: provide helpful error message
    throw new Error('Liveblocks token authentication not available. Please set up LIVEBLOCKS_SECRET_KEY environment variable and restart Supabase Edge Functions.');
  }
}

/**
 * Clears the cached token (useful for logout or token refresh)
 */
export function clearLiveblocksTokenCache(): void {
  /*console.log(`🔐 [TOKEN-SERVICE] Clearing token cache`);*/
  cachedToken = null;
  tokenExpiry = 0;
} 
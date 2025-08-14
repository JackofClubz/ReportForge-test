import { supabase } from '../supabaseClient';
import { Database } from '../../types/supabase';
import { debug } from '../utils/debug';

type SiteInsert = Database['public']['Tables']['sites']['Insert'];

// Cache invalidation helper - matches the cache key pattern from useDataCache
const invalidateSiteCache = (orgId: string) => {
  // This would work with the global cache from useDataCache
  const event = new CustomEvent('invalidate-cache', { 
    detail: { 
      pattern: `sites_${orgId}`,
      orgId 
    } 
  });
  window.dispatchEvent(event);
  debug.data('Cache invalidation event dispatched for sites');
};

export const createSiteWithCache = async (siteData: any, orgId: string | null, userId?: string) => {
  if (!orgId) throw new Error("Organisation ID is required to create a site.");
  
  debug.data('Input site data:', siteData);
  debug.data('Input org ID:', orgId);
  debug.data('Input user ID:', userId);
  
  let owner_id = userId;
  
  // If no userId provided, try to get from auth
  if (!owner_id) {
    debug.data('No user ID provided, fetching from auth...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    debug.data('User authentication result:', { user: user ? { id: user.id, email: user.email } : null, error: userError });
    
    if (userError) {
      debug.error('User authentication error:', userError);
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    if (!user) {
      debug.error('No user found - authentication required');
      throw new Error("User must be authenticated to create a site. Please log in and try again.");
    }
    
    owner_id = user.id;
  }

  const fullSiteData = { 
    ...siteData, 
    org_id: orgId, 
    owner_id: owner_id 
  };
  
  debug.data('Full site data with owner_id:', fullSiteData);
  
  try {
    const { data, error } = await supabase
      .from('sites')
      .insert([fullSiteData])
      .select(); 

    if (error) {
      debug.error('Failed to create site - Full error details:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Database error: ${error.message}`);
    }
    
    debug.data('Successfully created site', data);
    
    // Invalidate cache to trigger refetch
    invalidateSiteCache(orgId);
    
    return data;
  } catch (error) {
    debug.error('Error in createSiteWithCache', error);
    throw error;
  }
};

export const getSites = async (orgId: string | null) => {
  debug.data('Fetching sites for org:', orgId);

  if (!orgId) {
    debug.data('No Organisation ID provided to getSites, returning empty array.');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      debug.error('Failed to fetch sites for org', { orgId, error });
      throw error;
    }

    debug.data('Successfully fetched sites for org', { orgId, count: data?.length });
    return data || [];
  } catch (error) {
    debug.error('Error in getSites for org', { orgId, error });
    throw error;
  }
};

// Export the existing createSite for backward compatibility
export { createSite } from './siteService'; 
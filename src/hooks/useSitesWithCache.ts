import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions, ORG_ROLES } from './usePermissions';
import { useDataCache } from './useDataCache';
import type { SiteRow } from './useSites';

export function useSitesWithCache() {
  const { user, currentOrgId } = useAuth();
  const { userRole, isRoleLoading } = usePermissions();

  const siteFetcher = async (): Promise<SiteRow[]> => {
    if (!currentOrgId || isRoleLoading || !user) {
      return [];
    }

    const { data, error: fetchError } = await supabase
      .from('sites')
      .select('*')
      .eq('org_id', currentOrgId)
      .order('updated_at', { ascending: false })
      .limit(8);

    if (fetchError) throw fetchError;
    return data || [];
  };

  const {
    data: sites,
    loading: loadingSites,
    error,
    invalidateCache,
    invalidateOrgCache
  } = useDataCache<SiteRow[]>(
    { 
      key: 'sites', 
      ttl: 2 * 60 * 1000 // 2 minutes cache for sites
    },
    siteFetcher,
    [user, userRole, isRoleLoading], // Dependencies that should trigger refetch
    currentOrgId
  );

  return { 
    sites: sites || [], 
    loadingSites, 
    error, 
    invalidateCache,
    invalidateOrgCache
  };
} 
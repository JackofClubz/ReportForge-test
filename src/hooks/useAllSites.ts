import { useEffect, useState } from 'react';
import { Database } from '../types/supabase';
import { debug } from '../lib/utils/debug';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { SiteRow } from './useSites'; // Assuming SiteRow is exported from useSites or defined commonly
import { usePermissions, ORG_ROLES } from './usePermissions'; // Added

// If SiteRow is not exported from useSites, define it here or import from common types file
// export type SiteRow = Database['public']['Tables']['sites']['Row'];

export function useAllSites() {
  const { user, currentOrgId } = useAuth(); // Added user
  const { userRole, isRoleLoading } = usePermissions(); // Added
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    // debug.data('useAllSites hook mounted');
    
    const fetchAllSites = async () => {
      if (!isMounted) return;
      // Wait for role and user to be loaded
      if (!currentOrgId || isRoleLoading || !user) {
        setSites([]);
        setLoadingSites(isRoleLoading || !user);
        if (currentOrgId && user && userRole && userRole !== ORG_ROLES.ADMIN && !isRoleLoading) {
            setLoadingSites(false);
        }
        setError(null);
        return;
      }
      
      setLoadingSites(true);
      setError(null);
      try {
        // debug.data('Starting all sites fetch for org:', currentOrgId);
        const { data, error: fetchError } = await supabase
          .from('sites')
          .select('*')
          .eq('org_id', currentOrgId)
          .order('updated_at', { ascending: false }); // No limit

        if (fetchError) throw fetchError;
        if (!isMounted) return;
        
        // debug.data('All sites fetch completed', { count: data?.length });
        setSites(data || []);
      } catch (err) {
        if (!isMounted) return;
        
        const caughtError = err instanceof Error ? err : new Error('Failed to fetch all sites');
        // debug.error('Error fetching all sites', caughtError);
        console.error('Error fetching all sites:', caughtError);
        setError(caughtError);
        setSites([]);
      } finally {
        if (isMounted) {
          setLoadingSites(false);
        }
      }
    };

    fetchAllSites();

    return () => {
      isMounted = false;
      // debug.data('useAllSites hook unmounted');
    };
  }, [currentOrgId, user, userRole, isRoleLoading]); // Added user, userRole, isRoleLoading to dependencies

  return { sites, loadingSites, error };
} 
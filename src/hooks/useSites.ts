import { useEffect, useState, useRef, useCallback } from 'react';
import { Database } from '../types/supabase';
import { debug } from '../lib/utils/debug';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions, ORG_ROLES } from './usePermissions';

export type SiteRow = Database['public']['Tables']['sites']['Row'];

export function useSites() {
  const { user, currentOrgId } = useAuth();
  const { userRole, isRoleLoading } = usePermissions();
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchRef = useRef<string>('');

  // Stable references for dependencies
  const userId = user?.id;

  const fetchSites = useCallback(async () => {
    // Create unique fetch identifier
    const fetchId = `${currentOrgId}-${userId}-${userRole}-${Date.now()}`;
    lastFetchRef.current = fetchId;
    
    console.log('🔄 [useSites] Starting fetch:', { fetchId, currentOrgId, userId, userRole, isRoleLoading });

    // Check if we have required data
    if (!currentOrgId || isRoleLoading || !userId) {
      console.log('🔄 [useSites] Missing required data, setting empty state');
      setSites([]);
      setLoadingSites(isRoleLoading || !userId);
      setError(null);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoadingSites(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('sites')
        .select('*')
        .eq('org_id', currentOrgId)
        .order('updated_at', { ascending: false })
        .limit(8)
        .abortSignal(signal);

      // Check if this is still the latest fetch request
      if (lastFetchRef.current !== fetchId || signal.aborted) {
        console.log('🔄 [useSites] Fetch outdated or aborted:', fetchId);
        return;
      }

      if (fetchError) throw fetchError;
      
      console.log('✅ [useSites] Fetch successful:', { fetchId, siteCount: data?.length || 0 });
      setSites(data || []);
    } catch (err) {
      // Don't update state if request was aborted
      if (signal.aborted) {
        console.log('🔄 [useSites] Fetch aborted:', fetchId);
        return;
      }
      
      // Check if this is still the latest fetch request
      if (lastFetchRef.current !== fetchId) {
        console.log('🔄 [useSites] Error from outdated fetch:', fetchId);
        return;
      }

      const caughtError = err instanceof Error ? err : new Error('Failed to fetch recent sites');
      if (caughtError.message === 'No active session') {
        console.log('🔄 [useSites] No active session, clearing sites');
        setSites([]);
      } else {
        console.error('❌ [useSites] Error fetching sites:', caughtError);
        setError(caughtError);
        setSites([]);
      }
    } finally {
      // Only update loading state if this is still the latest request
      if (lastFetchRef.current === fetchId && !signal.aborted) {
        console.log('✅ [useSites] Fetch complete:', fetchId);
        setLoadingSites(false);
      }
    }
  }, [currentOrgId, userId, userRole, isRoleLoading]);

  useEffect(() => {
    fetchSites();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchSites]);

  return { sites, loadingSites, error };
} 
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions, ORG_ROLES } from './usePermissions';

export interface ReportRow {
  id: string;
  report_name: string;
  site_id: string;
  template_type: string;
  status: string;
  published_on: string | null;
  site_name?: string;
}

export function useReports() {
  const { user, currentOrgId } = useAuth();
  const { userRole, isRoleLoading } = usePermissions();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchRef = useRef<string>('');

  // Stable references for dependencies
  const userId = user?.id;
  const userEmail = user?.email;

  const fetchReports = useCallback(async () => {
    // Create unique fetch identifier
    const fetchId = `${currentOrgId}-${userId}-${userRole}-${Date.now()}`;
    lastFetchRef.current = fetchId;
    
    console.log('🔄 [useReports] Starting fetch:', { fetchId, currentOrgId, userId: userId, userRole, isRoleLoading });

    // Check if we have required data
    if (!currentOrgId || isRoleLoading || !userId) {
      console.log('🔄 [useReports] Missing required data, setting empty state');
      setReports([]);
      setLoadingReports(isRoleLoading || !userId);
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

    setLoadingReports(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('reports')
        .select('*, sites(name)')
        .eq('org_id', currentOrgId)
        .order('updated_at', { ascending: false })
        .limit(8)
        .abortSignal(signal);

      // Check if this is still the latest fetch request
      if (lastFetchRef.current !== fetchId || signal.aborted) {
        console.log('🔄 [useReports] Fetch outdated or aborted:', fetchId);
        return;
      }

      if (fetchError) throw fetchError;
      
      console.log('✅ [useReports] Fetch successful:', { fetchId, reportCount: data?.length || 0 });
      setReports(data || []);
    } catch (err) {
      // Don't update state if request was aborted
      if (signal.aborted) {
        console.log('🔄 [useReports] Fetch aborted:', fetchId);
        return;
      }
      
      // Check if this is still the latest fetch request
      if (lastFetchRef.current !== fetchId) {
        console.log('🔄 [useReports] Error from outdated fetch:', fetchId);
        return;
      }

      console.error('❌ [useReports] Error fetching reports:', err);
      const caughtError = err instanceof Error ? err : new Error('Failed to fetch recent reports');
      setError(caughtError);
      setReports([]);
    } finally {
      // Only update loading state if this is still the latest request
      if (lastFetchRef.current === fetchId && !signal.aborted) {
        console.log('✅ [useReports] Fetch complete:', fetchId);
        setLoadingReports(false);
      }
    }
  }, [currentOrgId, userId, userRole, isRoleLoading]);

  useEffect(() => {
    fetchReports();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchReports]);

  return { reports, loadingReports, error };
} 
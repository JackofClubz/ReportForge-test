import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { ReportRow } from './useReports'; // Assuming ReportRow is exported from useReports or defined commonly
import { usePermissions, ORG_ROLES } from './usePermissions'; // Added

// If ReportRow is not exported from useReports, define it here or import from a common types file
// export interface ReportRow {
//   id: string;
//   report_name: string;
//   site_id: string; // Assuming sites(name) is fetched, this might be enriched client-side or via DB view
//   site_name?: string; // If sites(name) is fetched
//   template_type: string;
//   status: string;
//   published_on: string | null;
//   updated_at: string; // For ordering
// }

export function useAllReports() {
  const { user, currentOrgId } = useAuth(); // Added user
  const { userRole, isRoleLoading } = usePermissions(); // Added
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [error, setError] = useState<Error | null>(null); // Add error state

  useEffect(() => {
    const fetchAllReports = async () => {
      // Wait for role to be loaded and user to be available
      if (!currentOrgId || isRoleLoading || !user) {
        setReports([]);
        // Keep loading true if role or user is not yet determined, unless explicitly not an admin
        setLoadingReports(isRoleLoading || !user);
        if (currentOrgId && user && userRole && userRole !== ORG_ROLES.ADMIN && !isRoleLoading) {
            // If definitely not an admin and role is loaded, stop loading if no org/user
            setLoadingReports(false);
        }
        setError(null);
        return;
      }

      setLoadingReports(true);
      setError(null);

      try {
        let query = supabase
          .from('reports')
          .select('*, sites(name)') // Keep joined select if needed for display
          .eq('org_id', currentOrgId)
          .order('updated_at', { ascending: false });

        // RLS should handle filtering for non-admins.
        // If RLS is not sufficient or for an explicit check:
        // if (userRole !== ORG_ROLES.ADMIN) {
        //   query = query.filter('report_users', 'cs', `{${user.id}}`); // This is pseudo-code for contains user in a hypothetical report_users array column
        //   // Actual filtering for many-to-many via report_users needs RLS or a function call.
        // }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        
        setReports(data || []);
      } catch (err) {
        console.error('Error fetching all reports:', err);
        const caughtError = err instanceof Error ? err : new Error('Failed to fetch all reports');
        setError(caughtError);
        setReports([]);
      } finally {
        setLoadingReports(false);
      }
    };

    fetchAllReports();
  }, [currentOrgId, user, userRole, isRoleLoading]); // Added user, userRole, isRoleLoading to dependencies

  return { reports, loadingReports, error }; // Expose error state
} 
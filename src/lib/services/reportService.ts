import { supabase } from '../supabaseClient';
import { debug } from '../utils/debug';
import { NewReport, NewReportUser, Report, Site, UserProfile } from '../../types/supabase';
import { v4 as uuidv4 } from 'uuid';

// Get all sites for dropdown options, filtered by orgId
export const getSites = async (orgId: string | null): Promise<Site[]> => {
  if (!orgId) {
    debug.data('No orgId provided for getSites');
    return []; // Return empty if no orgId is provided
  }

  debug.data('Fetching sites for org:', orgId);

  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('org_id', orgId) // Filter by org_id
    .order('name');

  if (error) {
    debug.error('Error fetching sites for dropdown:', error);
    throw error;
  }
  
  debug.data('Fetched sites:', data);
  return data || [];
};

// Get user profiles for contributor selection, filtered by organization
export const getUserProfiles = async (orgId: string | null): Promise<UserProfile[]> => {
  if (!orgId) return []; // Return empty if no orgId is provided

  // First get the user IDs from org_users
  const { data: orgUsersData, error: orgUsersError } = await supabase
    .from('org_users')
    .select('user_id')
    .eq('org_id', orgId);

  if (orgUsersError) {
    debug.error('Error fetching org users:', orgUsersError);
    throw orgUsersError;
  }

  if (!orgUsersData || orgUsersData.length === 0) {
    debug.data('No users found for org:', orgId);
    return [];
  }

  const userIds = orgUsersData.map(item => item.user_id);
  debug.data('User IDs for org:', userIds);

  // Then get the user profiles for those IDs
  const { data: profilesData, error: profilesError } = await supabase
    .from('user_profiles')
    .select('*')
    .in('id', userIds)
    .order('full_name');

  if (profilesError) {
    debug.error('Error fetching user profiles:', profilesError);
    throw profilesError;
  }
  
  debug.data('Fetched user profiles:', profilesData);
  return profilesData || [];
};

// Interface for form data from create report form
interface CreateReportData {
  report_name: string;
  site: string; // site_id
  template_type: string;
  due_date: string;
  description?: string | null;
  notes?: string | null;
  contributors: string[];
  // org_id is not part of form data, but passed separately
}

// Create a new report and assign contributors
export const createReport = async (data: CreateReportData, orgId: string | null): Promise<Report> => {
  if (!orgId) {
    throw new Error("Organisation ID is required to create a report.");
  }

  const { data: reportData, error: reportError } = await supabase
    .from('reports')
    .insert([
      {
        report_name: data.report_name,
        site_id: data.site,
        org_id: orgId, // Add org_id here
        primary_qp_id: data.contributors[0], // First contributor is the primary QP
        template_type: data.template_type,
        status: 'draft',
        version: 1,
        is_locked: false,
        metadata: {
          description: data.description,
          notes: data.notes,
          due_date: data.due_date
        }
      }
    ])
    .select()
    .single();

  if (reportError) throw reportError;

  // Add contributors to report_users table
  const reportUsers = data.contributors.map(userId => ({
    report_id: reportData.id,
    user_id: userId,
    role: userId === data.contributors[0] ? 'qp' : 'editor',
    accepted: true // Auto-accept for now
  }));

  const { error: usersError } = await supabase
    .from('report_users')
    .insert(reportUsers);

  if (usersError) {
    // If adding users fails, delete the report to maintain consistency
    await supabase.from('reports').delete().eq('id', reportData.id);
    throw usersError;
  }

  return reportData;
};

// Interface for updating report data
interface UpdateReportData {
  report_name: string;
  site_id: string;
  template_type: string;
  due_date: string;
  description?: string | null;
  notes?: string | null;
  contributors: string[];
}

// Update an existing report and its contributors
export const updateReport = async (reportId: string, data: UpdateReportData): Promise<Report> => {
  debug.data('Updating report', { reportId, data });

  try {
    // Step 1: Update only the basic report fields first (minimal update to avoid RLS issues)
    debug.data('Step 1: Updating basic report fields');
    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .update({
        report_name: data.report_name,
        site_id: data.site_id,
        template_type: data.template_type,
        metadata: {
          description: data.description,
          notes: data.notes,
          due_date: data.due_date
        }
      })
      .eq('id', reportId)
      .select()
      .single();

    if (reportError) {
      debug.error('Failed to update report basic fields', reportError);
      throw reportError;
    }

    debug.data('Step 1 completed: Basic report fields updated');

    // Step 2: Update contributors in report_users table
    debug.data('Step 2: Updating contributors');
    
    // Delete existing contributors
    const { error: deleteError } = await supabase
      .from('report_users')
      .delete()
      .eq('report_id', reportId);

    if (deleteError) {
      debug.error('Failed to delete existing contributors', deleteError);
      throw deleteError;
    }

    // Add new contributors
    const reportUsers = data.contributors.map(userId => ({
      report_id: reportId,
      user_id: userId,
      role: userId === data.contributors[0] ? 'qp' : 'editor',
      accepted: true
    }));

    const { error: usersError } = await supabase
      .from('report_users')
      .insert(reportUsers);

    if (usersError) {
      debug.error('Failed to insert new contributors', usersError);
      throw usersError;
    }

    debug.data('Step 2 completed: Contributors updated');

    debug.data('Successfully updated report and contributors');
    return reportData;
  } catch (error) {
    debug.error('Failed to update report', error);
    throw error;
  }
};

// Simple test function to update only report name (for debugging RLS issues)
export const updateReportNameOnly = async (reportId: string, reportName: string): Promise<Report> => {
  debug.data('Updating report name only', { reportId, reportName });

  const { data: reportData, error: reportError } = await supabase
    .from('reports')
    .update({
      report_name: reportName
    })
    .eq('id', reportId)
    .select()
    .single();

  if (reportError) {
    debug.error('Failed to update report name', reportError);
    throw reportError;
  }

  debug.data('Successfully updated report name');
  return reportData;
};

// Soft delete a report (set deleted_at timestamp)
export const softDeleteReport = async (reportId: string): Promise<void> => {
  debug.data('Soft deleting report', { reportId });

  try {
    const { error } = await supabase
      .from('reports')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', reportId);

    if (error) {
      debug.error('Failed to soft delete report', error);
      throw error;
    }

    debug.data('Successfully soft deleted report');
  } catch (error) {
    debug.error('Error in softDeleteReport', error);
    throw error;
  }
};

// Restore a soft-deleted report (set deleted_at to null)
export const restoreReport = async (reportId: string): Promise<void> => {
  debug.data('Restoring soft deleted report', { reportId });

  try {
    const { error } = await supabase
      .from('reports')
      .update({ deleted_at: null })
      .eq('id', reportId);

    if (error) {
      debug.error('Failed to restore report', error);
      throw error;
    }

    debug.data('Successfully restored report');
  } catch (error) {
    debug.error('Error in restoreReport', error);
    throw error;
  }
}; 
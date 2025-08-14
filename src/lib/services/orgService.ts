import { supabase } from '../supabaseClient';
import { NewOrg, Org } from '../../types/supabase'; // Ensure correct path to types
import { debug } from '../utils/debug';

/**
 * Creates a new organisation in the database.
 * @param orgData - The data for the new organisation. Should include name and created_by (user_id).
 * @returns The newly created organisation data.
 * @throws If there is an error during the Supabase operation.
 */
export const createOrg = async (orgData: NewOrg): Promise<Org> => {
  debug.data('Creating new organisation with data:', orgData);

  const { data, error } = await supabase
    .from('orgs')
    .insert(orgData)
    .select()
    .single(); // Assuming you want to return the created record

  if (error) {
    debug.error('Error creating organisation:', error);
    // Consider more specific error handling or re-throwing a custom error
    throw new Error(error.message || 'Failed to create organisation.');
  }

  if (!data) {
    debug.error('No data returned after creating organisation');
    throw new Error('Failed to create organisation: No data returned.');
  }
  
  debug.data('Successfully created organisation:', data);
  return data as Org;
};

// You can add other organisation-related service functions here later, e.g.:
// export const getOrgById = async (id: string): Promise<Org | null> => { ... };
// export const updateOrg = async (id: string, updates: UpdateOrg): Promise<Org> => { ... };
// export const deleteOrg = async (id: string): Promise<void> => { ... };
// export const listOrgs = async (): Promise<Org[]> => { ... }; 
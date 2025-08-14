import { supabase } from '../supabaseClient';

/**
 * Admin utility to completely remove a user from the system
 * This should only be used by developers/admins in emergency situations
 * 
 * @param email - The email of the user to remove
 * @returns Promise with cleanup results
 */
export async function adminDeleteUser(email: string) {
  try {
    console.log(`🧹 Starting cleanup for user: ${email}`);
    
    // First, get the user from auth
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error listing users:', authError);
      return { success: false, error: authError };
    }

    const userToDelete = authUser.users.find(u => u.email === email);
    
    if (!userToDelete) {
      console.log('ℹ️ User not found in auth system');
      return { success: true, message: 'User not found - already cleaned up' };
    }

    const userId = userToDelete.id;
    console.log(`🔍 Found user ID: ${userId}`);

    // Clean up custom tables first (in dependency order)
    console.log('🧽 Cleaning up report_users...');
    await supabase
      .from('report_users')
      .delete()
      .eq('user_id', userId);

    console.log('🧽 Cleaning up org_users...');
    await supabase
      .from('org_users')
      .delete()
      .eq('user_id', userId);

    console.log('🧽 Cleaning up user_profiles...');
    await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    // Check for sites/reports they own and warn
    const { data: ownedSites } = await supabase
      .from('sites')
      .select('id, name')
      .eq('owner_id', userId);

    const { data: ownedReports } = await supabase
      .from('reports')
      .select('id, report_name')
      .eq('primary_qp_id', userId);

    if (ownedSites && ownedSites.length > 0) {
      console.warn('⚠️ User owns sites:', ownedSites);
      console.warn('⚠️ You may need to transfer ownership manually');
    }

    if (ownedReports && ownedReports.length > 0) {
      console.warn('⚠️ User owns reports:', ownedReports);
      console.warn('⚠️ You may need to transfer ownership manually');
    }

    // Finally, delete from auth
    console.log('🧽 Deleting from auth system...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('❌ Error deleting from auth:', deleteError);
      return { success: false, error: deleteError };
    }

    console.log('✅ User successfully deleted');
    return { 
      success: true, 
      message: 'User successfully deleted',
      warnings: {
        ownedSites: ownedSites?.length || 0,
        ownedReports: ownedReports?.length || 0
      }
    };

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return { success: false, error };
  }
}

/**
 * Check if a user exists in the system
 */
export async function checkUserExists(email: string) {
  try {
    const { data: authUser } = await supabase.auth.admin.listUsers();
    const user = authUser.users.find(u => u.email === email);
    
    if (user) {
      console.log(`✅ User ${email} exists with ID: ${user.id}`);
      
      // Check custom tables
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();

      const { data: orgMemberships } = await supabase
        .from('org_users')
        .select('*')
        .eq('user_id', user.id);

      console.log('📊 User data:', {
        authRecord: !!user,
        profileRecord: !!profile,
        orgMemberships: orgMemberships?.length || 0
      });

      return { exists: true, userId: user.id, profile, orgMemberships };
    } else {
      console.log(`❌ User ${email} not found`);
      return { exists: false };
    }
  } catch (error) {
    console.error('Error checking user:', error);
    return { exists: false, error };
  }
}

/**
 * Admin utility to reset a user's password
 * This should only be used by developers/admins
 * 
 * @param email - The email of the user
 * @param newPassword - The new password to set
 * @returns Promise with reset results
 */
export async function adminResetPassword(email: string, newPassword: string) {
  try {
    console.log(`🔑 Resetting password for user: ${email}`);
    
    // Get the user first
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error listing users:', authError);
      return { success: false, error: authError };
    }

    const user = authUser.users.find(u => u.email === email);
    
    if (!user) {
      console.log('❌ User not found');
      return { success: false, error: 'User not found' };
    }

    // Reset the password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('❌ Error updating password:', updateError);
      return { success: false, error: updateError };
    }

    console.log('✅ Password successfully reset');
    return { 
      success: true, 
      message: `Password reset for ${email}. New password: ${newPassword}`
    };

  } catch (error) {
    console.error('❌ Password reset failed:', error);
    return { success: false, error };
  }
}

/**
 * Send a password reset email to a user
 */
export async function sendPasswordResetEmail(email: string) {
  try {
    console.log(`📧 Sending password reset email to: ${email}`);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });

    if (error) {
      console.error('❌ Error sending reset email:', error);
      return { success: false, error };
    }

    console.log('✅ Password reset email sent');
    return { success: true, message: 'Password reset email sent' };

  } catch (error) {
    console.error('❌ Failed to send reset email:', error);
    return { success: false, error };
  }
}

/**
 * Change a user's role in their organization
 */
export async function changeUserRole(email: string, newRole: 'admin' | 'qp' | 'author' | 'viewer' | 'signer' | 'editor' | 'pending') {
  try {
    console.log(`👑 Changing role for ${email} to: ${newRole}`);
    
    // Get the user first
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error listing users:', authError);
      return { success: false, error: authError };
    }

    const user = authUser.users.find(u => u.email === email);
    
    if (!user) {
      console.log('❌ User not found');
      return { success: false, error: 'User not found' };
    }

    // Update their role in org_users
    const { data, error: updateError } = await supabase
      .from('org_users')
      .update({ role: newRole })
      .eq('user_id', user.id)
      .select();

    if (updateError) {
      console.error('❌ Error updating role:', updateError);
      return { success: false, error: updateError };
    }

    if (!data || data.length === 0) {
      console.log('❌ No org membership found for user');
      return { success: false, error: 'User not found in any organization' };
    }

    console.log('✅ Role successfully updated');
    return { 
      success: true, 
      message: `${email} is now ${newRole}`,
      data: data[0]
    };

  } catch (error) {
    console.error('❌ Role update failed:', error);
    return { success: false, error };
  }
}

/**
 * Promote all pending users with matching email domains to admin
 */
export async function promotePendingUsersToAdmin(orgId?: string) {
  try {
    console.log(`👑 Promoting pending users to admin...`);
    
    // Build query
    let query = supabase
      .from('org_users')
      .select(`
        id,
        user_id,
        org_id,
        role,
        user_profiles!inner(email, full_name),
        orgs!inner(name, domain)
      `)
      .eq('role', 'pending');

    if (orgId) {
      query = query.eq('org_id', orgId);
    }

    const { data: pendingUsers, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Error fetching pending users:', fetchError);
      return { success: false, error: fetchError };
    }

    if (!pendingUsers || pendingUsers.length === 0) {
      console.log('ℹ️ No pending users found');
      return { success: true, message: 'No pending users to promote' };
    }

    console.log(`📋 Found ${pendingUsers.length} pending users:`);
    pendingUsers.forEach(user => {
      const profile = Array.isArray(user.user_profiles) ? user.user_profiles[0] : user.user_profiles;
      const org = Array.isArray(user.orgs) ? user.orgs[0] : user.orgs;
      console.log(`  - ${profile?.email} in ${org?.name}`);
    });

    // Update all to admin
    const userIds = pendingUsers.map(u => u.id);
    const { data: updatedUsers, error: updateError } = await supabase
      .from('org_users')
      .update({ role: 'admin' })
      .in('id', userIds)
      .select(`
        user_profiles!inner(email, full_name),
        orgs!inner(name)
      `);

    if (updateError) {
      console.error('❌ Error promoting users:', updateError);
      return { success: false, error: updateError };
    }

    console.log('✅ Successfully promoted users to admin:');
    updatedUsers?.forEach(user => {
      const profile = Array.isArray(user.user_profiles) ? user.user_profiles[0] : user.user_profiles;
      const org = Array.isArray(user.orgs) ? user.orgs[0] : user.orgs;
      console.log(`  ✅ ${profile?.email} is now admin of ${org?.name}`);
    });

    return { 
      success: true, 
      message: `Promoted ${updatedUsers?.length} users to admin`,
      promotedUsers: updatedUsers
    };

  } catch (error) {
    console.error('❌ Promotion failed:', error);
    return { success: false, error };
  }
}

/**
 * List all pending users across all organizations
 */
export async function listPendingUsers() {
  try {
    console.log('📋 Listing all pending users...');
    
    const { data: pendingUsers, error } = await supabase
      .from('org_users')
      .select(`
        id,
        user_id,
        org_id,
        role,
        created_at,
        user_profiles!inner(email, full_name),
        orgs!inner(name, domain)
      `)
      .eq('role', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching pending users:', error);
      return { success: false, error };
    }

    if (!pendingUsers || pendingUsers.length === 0) {
      console.log('ℹ️ No pending users found');
      return { success: true, pendingUsers: [] };
    }

    console.log(`📋 Found ${pendingUsers.length} pending users:`);
    console.table(pendingUsers.map(user => {
      const profile = Array.isArray(user.user_profiles) ? user.user_profiles[0] : user.user_profiles;
      const org = Array.isArray(user.orgs) ? user.orgs[0] : user.orgs;
      return {
        email: profile?.email,
        name: profile?.full_name,
        organization: org?.name,
        domain: org?.domain,
        created: new Date(user.created_at).toLocaleDateString()
      };
    }));

    return { success: true, pendingUsers };

  } catch (error) {
    console.error('❌ Failed to list pending users:', error);
    return { success: false, error };
  }
}

/**
 * Debug function to check org_users table structure and data
 */
export async function debugOrgUsersTable() {
  try {
    console.log('🔍 Debugging org_users table...');
    
    // Try to fetch some records to see what columns exist
    const { data: sampleData, error: sampleError } = await supabase
      .from('org_users')
      .select('*')
      .limit(3);

    if (sampleError) {
      console.error('❌ Error fetching org_users data:', sampleError);
      return { success: false, error: sampleError };
    }

    console.log('📊 Sample org_users records:');
    console.table(sampleData);

    if (sampleData && sampleData.length > 0) {
      console.log('🔍 Available columns in org_users:');
      console.log(Object.keys(sampleData[0]));
    }

    // Try to get all records
    const { count, error: countError } = await supabase
      .from('org_users')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`📈 Total org_users records: ${count}`);
    }

    return { success: true, sampleData, totalCount: count };

  } catch (error) {
    console.error('❌ Debug failed:', error);
    return { success: false, error };
  }
}

/**
 * List all org_users data with detailed info
 */
export async function listAllOrgUsers() {
  try {
    console.log('📋 Listing all org_users...');
    
    const { data: orgUsers, error } = await supabase
      .from('org_users')
      .select(`
        *,
        user_profiles(email, full_name),
        orgs(name, domain)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching org_users:', error);
      return { success: false, error };
    }

    if (!orgUsers || orgUsers.length === 0) {
      console.log('ℹ️ No org_users found');
      return { success: true, orgUsers: [] };
    }

    console.log(`📋 Found ${orgUsers.length} org_users:`);
    console.table(orgUsers.map(user => ({
      id: user.id,
      email: user.user_profiles?.email || 'N/A',
      name: user.user_profiles?.full_name || 'N/A',
      role: user.role || 'NO ROLE COLUMN',
      organization: user.orgs?.name || 'N/A',
      created: new Date(user.created_at).toLocaleDateString()
    })));

    return { success: true, orgUsers };

  } catch (error) {
    console.error('❌ Failed to list org_users:', error);
    return { success: false, error };
  }
}

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).adminDeleteUser = adminDeleteUser;
  (window as any).checkUserExists = checkUserExists;
  (window as any).adminResetPassword = adminResetPassword;
  (window as any).sendPasswordResetEmail = sendPasswordResetEmail;
  (window as any).changeUserRole = changeUserRole;
  (window as any).promotePendingUsersToAdmin = promotePendingUsersToAdmin;
  (window as any).listPendingUsers = listPendingUsers;
  (window as any).debugOrgUsersTable = debugOrgUsersTable;
  (window as any).listAllOrgUsers = listAllOrgUsers;
} 
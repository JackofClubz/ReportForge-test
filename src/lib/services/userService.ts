import { supabase } from '../supabaseClient';

export interface CollaborationUser {
  id: string;
  name: string;
  email: string;
  color: string;
  avatar: string;
  role: string;
}

/**
 * Fetches users for a specific report for collaboration features
 */
export async function getReportCollaborationUsers(reportId: string): Promise<CollaborationUser[]> {
  try {
    // First get the report's org_id
    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .select('org_id')
      .eq('id', reportId)
      .single();

    if (reportError) throw reportError;

    // Start with org users (this should always work)
    const { data: orgUsers, error: orgError } = await supabase
      .from('org_users')
      .select(`
        user_id,
        role,
        user_profiles!inner(id, full_name, email)
      `)
      .eq('org_id', reportData.org_id)
      .neq('role', 'pending');

    if (orgError) throw orgError;

    const allUsers = new Map<string, CollaborationUser>();

    // Add org users first
    orgUsers?.forEach(orgUser => {
      const profile = Array.isArray(orgUser.user_profiles) ? orgUser.user_profiles[0] : orgUser.user_profiles;
      if (profile) {
        allUsers.set(profile.id, {
          id: profile.id,
          name: profile.full_name,
          email: profile.email || '',
          color: generateUserColor(profile.id),
          avatar: generateAvatarUrl(profile.full_name, profile.email),
          role: orgUser.role
        });
      }
    });

    // Try to get report-specific users (optional - if this fails, we still have org users)
    try {
      const { data: reportUsers, error: reportUserError } = await supabase
        .from('report_users')
        .select(`
          user_id,
          role
        `)
        .eq('report_id', reportId)
        .eq('accepted', true);

      if (!reportUserError && reportUsers) {
        // Get user profiles for report users
        const reportUserIds = reportUsers.map(ru => ru.user_id);
        
        if (reportUserIds.length > 0) {
          const { data: profiles, error: profileError } = await supabase
            .from('user_profiles')
            .select('id, full_name, email')
            .in('id', reportUserIds);
          
          if (!profileError && profiles) {
    // Add/update with report users (they take precedence for role)
            reportUsers.forEach(reportUser => {
              const profile = profiles.find(p => p.id === reportUser.user_id);
      if (profile) {
        allUsers.set(profile.id, {
          id: profile.id,
          name: profile.full_name,
          email: profile.email || '',
          color: generateUserColor(profile.id),
          avatar: generateAvatarUrl(profile.full_name, profile.email),
          role: reportUser.role
        });
      }
    });
          }
        }
      }
    } catch (reportUserError) {
      console.warn('Could not fetch report-specific users, using org users only:', reportUserError);
    }

    return Array.from(allUsers.values());
  } catch (error) {
    console.error('Error fetching report collaboration users:', error);
    return [];
  }
}

/**
 * Resolves users by their IDs for Liveblocks
 */
export async function resolveUsersByIds(userIds: string[]): Promise<CollaborationUser[]> {
  console.log('🔍 [USER-SERVICE] Resolving user IDs:', userIds);
  
  if (!userIds || userIds.length === 0) {
    console.log('📝 [USER-SERVICE] No user IDs provided');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (error) {
      console.error('❌ [USER-SERVICE] Database error:', error);
      throw error;
    }

    console.log('📊 [USER-SERVICE] Database returned:', data?.length || 0, 'profiles');

    // Convert to collaboration user format with generated colors
    const resolvedUsers = (data || []).map((user) => ({
      id: user.id,
      name: user.full_name || 'Unknown User',
      email: user.email || '',
      color: generateUserColor(user.id),
      avatar: generateAvatarUrl(user.full_name || 'Unknown User', user.email || ''),
      role: 'collaborator'
    }));

    // Handle missing users
    const foundIds = new Set(resolvedUsers.map(u => u.id));
    const missingIds = userIds.filter(id => !foundIds.has(id));
    
    if (missingIds.length > 0) {
      console.warn('⚠️ [USER-SERVICE] Missing user profiles for IDs:', missingIds);
      // Add placeholder users for missing profiles
      missingIds.forEach(missingId => {
        resolvedUsers.push({
          id: missingId,
          name: `User ${missingId.slice(0, 8)}...`,
          email: '',
          color: generateUserColor(missingId),
          avatar: '',
          role: 'collaborator'
        });
      });
    }

    console.log('✅ [USER-SERVICE] Resolved users:', resolvedUsers.map(u => `${u.name} (${u.id.slice(0, 8)})`));
    return resolvedUsers;
  } catch (error) {
    console.error('❌ [USER-SERVICE] Error resolving users by IDs:', error);
    // Return fallback users to prevent showing as Anonymous
    return userIds.map(id => ({
      id,
      name: `User ${id.slice(0, 8)}...`,
      email: '',
      color: generateUserColor(id),
      avatar: '',
      role: 'collaborator'
    }));
  }
}

/**
 * Searches users for mention suggestions
 */
export async function searchUsersForMentions(reportId: string, searchText: string): Promise<string[]> {
  console.log('🔍 [USER-SERVICE] Searching users for mentions:', { reportId, searchText });
  try {
    // Get all collaboration users for this report
    const collaborationUsers = await getReportCollaborationUsers(reportId);
    console.log('👥 [USER-SERVICE] Found collaboration users:', collaborationUsers.length);
    
    // Filter users based on search text
    const filteredUsers = collaborationUsers.filter(user => {
      if (!searchText || searchText.trim() === '') {
        return true; // Return all users if no search text
      }
      
      const searchLower = searchText.toLowerCase();
      return user.name.toLowerCase().includes(searchLower) ||
             user.email.toLowerCase().includes(searchLower);
    });

    console.log('✅ [USER-SERVICE] Filtered users for mentions:', filteredUsers.map(u => u.name));
    return filteredUsers.map(user => user.id);
  } catch (error) {
    console.error('Error searching users for mentions:', error);
    
    // Fallback: try to get org users only
    try {
      console.log('Using fallback mention search...');
      const { data: reportData } = await supabase
        .from('reports')
        .select('org_id')
        .eq('id', reportId)
        .single();
      
      if (reportData?.org_id) {
        const { data: orgUsers } = await supabase
          .from('org_users')
          .select(`
            user_id,
            user_profiles!inner(id, full_name, email)
          `)
          .eq('org_id', reportData.org_id)
          .neq('role', 'pending');
        
        if (orgUsers) {
          const filteredUsers = orgUsers.filter(orgUser => {
            const profile = Array.isArray(orgUser.user_profiles) ? orgUser.user_profiles[0] : orgUser.user_profiles;
            if (!profile) return false;
            
            if (!searchText || searchText.trim() === '') {
              return true;
            }
            
            const searchLower = searchText.toLowerCase();
            return profile.full_name.toLowerCase().includes(searchLower) ||
                   (profile.email && profile.email.toLowerCase().includes(searchLower));
          });
          
          return filteredUsers.map(orgUser => {
            const profile = Array.isArray(orgUser.user_profiles) ? orgUser.user_profiles[0] : orgUser.user_profiles;
            return profile.id;
          });
        }
      }
    } catch (fallbackError) {
      console.error('Fallback mention search also failed:', fallbackError);
    }
    
    return [];
  }
}

/**
 * Generates a consistent color for a user based on their ID
 */
function generateUserColor(userId: string): string {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", 
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
    "#F8C471", "#82E0AA", "#AED6F1", "#D7BDE2", "#F9E79F"
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Generates an avatar URL using DiceBear or initials
 */
function generateAvatarUrl(fullName: string, email: string): string {
  // No longer generating avatar URLs since we use Carbon icons
  return "";
} 
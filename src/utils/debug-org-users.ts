import { supabase } from '../lib/supabaseClient';

export const debugOrgUsers = async () => {
  console.group('🔍 [DEBUG] Checking org_users status');
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('No user found:', userError);
      console.groupEnd();
      return { success: false, error: 'No user found' };
    }
    
    console.log('✅ Current user ID:', user.id);
    console.log('✅ Current user email:', user.email);

    // Check if user has a profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
      
    console.log('👤 User profile:', profile, 'Error:', profileError);

    // Check orgs created by this user
    const { data: orgs, error: orgsError } = await supabase
      .from('orgs')
      .select('*')
      .eq('created_by', user.id);
      
    console.log('🏢 Orgs created by user:', orgs, 'Error:', orgsError);

    // Try to check org_users (this might fail with 406)
    const { data: orgUsers, error: orgUsersError } = await supabase
      .from('org_users')
      .select('*')
      .eq('user_id', user.id);
      
    console.log('🔗 Org users records:', orgUsers, 'Error:', orgUsersError);

    console.groupEnd();
    return { 
      success: true, 
      user, 
      profile, 
      orgs, 
      orgUsers, 
      errors: { profileError, orgsError, orgUsersError } 
    };
    
  } catch (error) {
    console.error('Exception during debug:', error);
    console.groupEnd();
    return { success: false, error };
  }
};

export const fixOrgUserRecord = async () => {
  console.group('🔧 [FIX] Creating missing org_users record');
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('No user found:', userError);
      console.groupEnd();
      return { success: false, error: 'No user found' };
    }

    // Find orgs created by this user
    const { data: orgs, error: orgsError } = await supabase
      .from('orgs')
      .select('*')
      .eq('created_by', user.id);

    if (orgsError || !orgs || orgs.length === 0) {
      console.log('No orgs found for user, this might be normal');
      console.groupEnd();
      return { success: false, error: 'No organizations found' };
    }

    console.log('Found orgs:', orgs);
    let fixedCount = 0;
    let errors = [];

    // For each org, try to create org_users record using admin function
    for (const org of orgs) {
      console.log(`Creating org_users record for org: ${org.id} (${org.name})`);
      
      const { data, error } = await supabase.functions.invoke('complete-signup-helper', {
        body: {
          user_id: user.id,
          org_id: org.id,
          role: 'admin'
        }
      });

      if (error) {
        console.error(`❌ Error for org ${org.name}:`, error);
        errors.push(`${org.name}: ${error.message}`);
      } else {
        console.log(`✅ Fixed org_users record for ${org.name}:`, data);
        fixedCount++;
      }
    }

    console.groupEnd();
    
    if (fixedCount > 0) {
      console.log(`🎉 Successfully fixed ${fixedCount} org_users records! Refreshing page...`);
      // Refresh the page to update auth context
      setTimeout(() => window.location.reload(), 1000);
      return { success: true, message: `Fixed ${fixedCount} org_users records` };
    } else {
      return { success: false, error: errors.join(', ') || 'No records were fixed' };
    }
    
  } catch (error) {
    console.error('Exception during fix:', error);
    console.groupEnd();
    return { success: false, error };
  }
}; 
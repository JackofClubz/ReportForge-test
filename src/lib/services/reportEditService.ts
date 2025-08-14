import { supabase } from '../supabaseClient';
import { debug } from '../utils/debug';
import { Report } from '../../types/supabase';

export interface Section {
  id: string;
  title: string;
  level: number;
  parent?: string;
  children?: Section[];
}

// Report section definitions for NI43-101 and JORC reports
export const REPORT_SECTIONS: Section[] = [
  {
    id: 'qp_certification',
    title: 'QP Certification',
    level: 1,
    children: []
  },
  {
    id: 'summary',
    title: 'Summary',
    level: 1,
    children: []
  },
  {
    id: 'introduction',
    title: 'Introduction',
    level: 1,
    children: []
  },
  {
    id: 'reliance_on_other_experts',
    title: 'Reliance on Other Experts',
    level: 1,
    children: []
  },
  {
    id: 'property_description',
    title: 'Property Description and Location',
    level: 1,
    children: []
  },
  {
    id: 'deposit_types',
    title: 'Deposit Types',
    level: 1,
    children: []
  },
  {
    id: 'exploration',
    title: 'Exploration',
    level: 1,
    children: []
  },
  {
    id: 'drilling',
    title: 'Drilling',
    level: 1,
    children: []
  },
  {
    id: 'sample_preparation',
    title: 'Sample Preparation, Analyses and Security',
    level: 1,
    children: [
      {
        id: 'environmental_permitting',
        title: 'Environmental Permitting Requirements',
        level: 2,
        parent: 'sample_preparation'
      }
    ]
  },
  {
    id: 'mineral_processing',
    title: 'Mineral Processing and Metallurgical Testing',
    level: 1,
    children: []
  },
  {
    id: 'mineral_resource_estimates',
    title: 'Mineral Resource Estimates',
    level: 1,
    children: []
  },
  {
    id: 'mineral_reserve_estimates',
    title: 'Mineral Reserve Estimates',
    level: 1,
    children: []
  },
  {
    id: 'mining_methods',
    title: 'Mining Methods',
    level: 1,
    children: []
  },
  {
    id: 'recovery_methods',
    title: 'Recovery Methods',
    level: 1,
    children: []
  },
  {
    id: 'market_studies',
    title: 'Market Studies and Contracts',
    level: 1,
    children: []
  },
  {
    id: 'environmental_studies',
    title: 'Environmental Studies, Permitting and Social or Community Impact',
    level: 1,
    children: []
  },
  {
    id: 'capital_operating_costs',
    title: 'Capital and Operating Costs',
    level: 1,
    children: []
  },
  {
    id: 'other_relevant_data',
    title: 'Other Relevant Data and Information',
    level: 1,
    children: []
  },
  {
    id: 'adjacent_properties',
    title: 'Adjacent Properties',
    level: 1,
    children: []
  },
  {
    id: 'interpretation_conclusions',
    title: 'Interpretation and Conclusions',
    level: 1,
    children: []
  },
  {
    id: 'recommendations',
    title: 'Recommendations',
    level: 1,
    children: []
  },
  {
    id: 'references',
    title: 'References',
    level: 1,
    children: []
  },
  {
    id: 'disclaimer',
    title: 'Disclaimer',
    level: 1,
    children: []
  }
];

// Get report with its content and basic fields
export const getReportWithContent = async (reportId: string): Promise<Report> => {
  debug.data('Fetching report with content', { reportId });

  const { data, error } = await supabase
    .from('reports')
    // Select only columns from the reports table
    .select('*') 
    .eq('id', reportId)
    .single();

  if (error) {
    debug.error('Failed to fetch report', error);
    throw error;
  }

  // The Report type might need adjustment if it expects joined data by default
  // Or ensure the component only uses fields available in the fetched data
  return data;
};

// Get report contributors
export const getReportContributors = async (reportId: string) => {
  debug.data('Fetching report contributors', { reportId });

  // First get the report_users data
  const { data: reportUsersData, error: reportUsersError } = await supabase
    .from('report_users')
    .select('*')
    .eq('report_id', reportId);

  if (reportUsersError) {
    debug.error('Failed to fetch report users', reportUsersError);
    throw reportUsersError;
  }

  if (!reportUsersData || reportUsersData.length === 0) {
    debug.data('No contributors found for report:', reportId);
    return [];
  }

  // Get the user IDs
  const userIds = reportUsersData.map(ru => ru.user_id);
  debug.data('Contributor user IDs:', userIds);

  // Then get the user profiles for those IDs
  const { data: profilesData, error: profilesError } = await supabase
    .from('user_profiles')
    .select('*')
    .in('id', userIds);

  if (profilesError) {
    debug.error('Failed to fetch contributor profiles', profilesError);
    throw profilesError;
  }

  // Combine the data
  const contributors = reportUsersData.map(reportUser => ({
    ...reportUser,
    user_profiles: profilesData?.find(profile => profile.id === reportUser.user_id) || null
  }));

  debug.data('Combined contributor data:', contributors);
  return contributors;
};

// Save section content
export const saveSectionContent = async (
  reportId: string,
  sectionId: string,
  content: any
) => {
  debug.data('Saving section content', { reportId, sectionId });

  try {
    const session = await supabase.auth.getSession();
    
    if (!session.data.session) {
      debug.error('No active session found');
      throw new Error('No active session');
    }

    // Get existing report first
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('report_content')
      .eq('id', reportId)
      .single();

    if (reportError) {
      debug.error('Failed to fetch existing report content', reportError);
      throw reportError;
    }

    // Update report_content with new section data
    const existingContent = report.report_content || {};
    const updatedContent = {
      ...existingContent,
      [sectionId]: content,
    };

    const { error: updateError } = await supabase
      .from('reports')
      .update({ 
        report_content: updatedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (updateError) {
      debug.error('Failed to update report content', updateError);
      throw updateError;
    }

    debug.data('Successfully saved section content');
    return true;
  } catch (error) {
    debug.error('Error in saveSectionContent', error);
    throw error;
  }
};

// Get report comments
export const getReportComments = async (reportId: string) => {
  debug.data('Fetching report comments', { reportId });

  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      author:profiles(id, full_name, role)
    `)
    .eq('report_id', reportId)
    .order('created_at', { ascending: false });

  if (error) {
    debug.error('Failed to fetch report comments', error);
    throw error;
  }

  return data;
};

// Add a comment to a report section
export const addComment = async (
  reportId: string,
  sectionId: string,
  content: string,
  targetJson: any
) => {
  debug.data('Adding comment', { reportId, sectionId });

  try {
    const session = await supabase.auth.getSession();
    
    if (!session.data.session) {
      debug.error('No active session found');
      throw new Error('No active session');
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        report_id: reportId,
        section: sectionId,
        author_id: session.data.session.user.id,
        content,
        target_json: targetJson
      })
      .select('*, author:profiles(id, full_name, role)')
      .single();

    if (error) {
      debug.error('Failed to add comment', error);
      throw error;
    }

    debug.data('Successfully added comment', data);
    return data;
  } catch (error) {
    debug.error('Error in addComment', error);
    throw error;
  }
};

// Delete a comment
export const deleteComment = async (commentId: string) => {
  debug.data('Deleting comment', { commentId });

  try {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      debug.error('Failed to delete comment', error);
      throw error;
    }

    debug.data('Successfully deleted comment');
    return true;
  } catch (error) {
    debug.error('Error in deleteComment', error);
    throw error;
  }
};

// Update the entire report content (e.g., from BlockNote)
export const updateReportContent = async (
  reportId: string,
  content: any // Expects Block[] or similar structure
) => {
  debug.data('Updating entire report content', { reportId });

  try {
    const { error } = await supabase
      .from('reports')
      .update({ 
        report_content: content, // Update the main content field
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (error) {
      debug.error('Failed to update report content', error);
      throw error;
    }

    debug.data('Successfully updated report content');
    return true;
  } catch (error) {
    debug.error('Error in updateReportContent', error);
    throw error;
  }
}; 
import { useAuth } from '../contexts/AuthContext';

// Define your roles here. These should match the roles in your org_users table.
// For example: 'admin', 'editor', 'viewer', 'member', 'owner' etc.
// We'll use a simple hierarchy for now.
const ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
  QP: 'qp',
  SIGNER: 'signer',
  PENDING: 'pending', // Added new role
  // Add other roles as needed, e.g., 'member', 'qp_author'
} as const;

type Role = typeof ROLES[keyof typeof ROLES];

interface Permissions {
  // General CRUD for reports
  canCreateReport: boolean;
  canEditReport: boolean;
  canViewReportSettings: boolean;
  canDeleteReport: boolean; // Example, add if needed

  // General CRUD for sites
  canCreateSite: boolean;
  canEditSite: boolean;
  canViewSiteSettings: boolean;
  canDeleteSite: boolean; // Example, add if needed

  // Organisation level permissions
  canManageOrganisationSettings: boolean;
  canManageUsers: boolean;

  // Add more specific permissions as your application grows
  // e.g., canPublishReport, canInviteUserToReport, etc.

  userRole: Role | null; // Expose the role itself if needed
  isRoleLoading: boolean; // To handle loading state of the role
}

export function usePermissions(): Permissions {
  const { userRole, isLoading: isAuthLoading } = useAuth();

  // Default to most restrictive permissions
  const permissions: Permissions = {
    canCreateReport: false,
    canEditReport: false,
    canViewReportSettings: false,
    canDeleteReport: false,
    canCreateSite: false,
    canEditSite: false,
    canViewSiteSettings: false,
    canDeleteSite: false,
    canManageOrganisationSettings: false,
    canManageUsers: false,
    userRole: userRole as Role | null, // Cast here, ensure roles in AuthContext match
    isRoleLoading: isAuthLoading, // isLoading from AuthContext likely covers role loading
  };

  if (isAuthLoading) {
    return permissions; // Return default (restrictive) permissions while loading
  }

  // Assign permissions based on role
  // Ensure userRole values from AuthContext match the ROLES defined here
  switch (userRole) {
    case ROLES.ADMIN:
      permissions.canCreateReport = true;
      permissions.canEditReport = true;
      permissions.canViewReportSettings = true;
      permissions.canDeleteReport = true;
      permissions.canCreateSite = true;
      permissions.canEditSite = true;
      permissions.canViewSiteSettings = true;
      permissions.canDeleteSite = true;
      permissions.canManageOrganisationSettings = true;
      permissions.canManageUsers = true;
      break;
    case ROLES.EDITOR:
      permissions.canCreateReport = false;
      permissions.canEditReport = true;
      permissions.canViewReportSettings = true;
      permissions.canDeleteReport = false; // Editors might not delete, depends on requirements
      permissions.canCreateSite = false;
      permissions.canEditSite = false;
      permissions.canViewSiteSettings = true;
      permissions.canDeleteSite = false; // Editors might not delete
      break;
    case ROLES.QP:
      permissions.canCreateReport = true;
      permissions.canEditReport = true;
      permissions.canViewReportSettings = true;
      permissions.canDeleteReport = true; // QPs can delete reports they manage
      permissions.canCreateSite = true;
      permissions.canEditSite = true;
      permissions.canViewSiteSettings = true;
      break;
    case ROLES.VIEWER:
    case ROLES.SIGNER:
      // Viewers/Reviewers typically have no general create/edit/delete/settings permissions for portfolio wide actions
      // Specific view/comment permissions are handled by RLS or page-level checks
      // and their presence in report_users for specific items.
      break;
    // Add cases for other roles
    // case 'another_role':
    // No permissions for PENDING role by default, they should be restricted
    case ROLES.PENDING:
      break;
    default:
      // Unknown role or no role, keep restrictive permissions
      break;
  }

  return permissions;
}

// It's good practice to export the roles if they are needed elsewhere for checks,
// or for consistency, though the hook should be the primary way to check permissions.
export { ROLES as ORG_ROLES }; 
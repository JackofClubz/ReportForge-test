import React from 'react';
import {
  Grid,
  Column,
  Button,
  TextInput,
  Tag,
  SkeletonText,
  InlineNotification,
} from '@carbon/react';
import {
  Edit,
  Password,
  Email,
  Enterprise,
  Money,
  TrashCan,
  UserAvatar,
} from '@carbon/icons-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import PageHeader from '../../components/layout/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { usePermissions } from '../../hooks/usePermissions';
import styles from '../../styles/pages/account/AccountSettings.module.scss';

const AccountSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole, currentOrgId } = useAuth();
  const { profile, loading } = useUserProfile();
  const { userRole: permissionRole } = usePermissions();

  const accountActions = [
    {
      id: 'change-password',
      title: 'Change Password',
      description: 'Update your account password for better security',
      icon: <Password size={20} />,
      path: '/account/change-password',
      buttonText: 'Change Password',
    },
    {
      id: 'change-email',
      title: 'Change Email Address',
      description: 'Update the email address associated with your account',
      icon: <Email size={20} />,
      path: '/account/change-email',
      buttonText: 'Change Email',
    },
    {
      id: 'change-organization',
      title: 'Switch Organization',
      description: 'Change your current organization or join a new one',
      icon: <Enterprise size={20} />,
      path: '/account/change-organization',
      buttonText: 'Manage Organizations',
    },
    {
      id: 'plan',
      title: 'Plan & Billing',
      description: 'View your subscription plan and billing information',
      icon: <Money size={20} />,
      path: '/account/plan',
      buttonText: 'View Plan',
    },
  ];

  const dangerousActions = [
    {
      id: 'delete-account',
      title: 'Delete Account',
      description: 'Permanently delete your account and all associated data',
      icon: <TrashCan size={20} />,
      path: '/account/delete',
      buttonText: 'Delete Account',
    },
  ];

  if (loading) {
    return (
      <AppLayout pageTitle="Account Settings">
        <Grid className={styles.container}>
          <Column lg={8} md={6} sm={4}>
            <SkeletonText paragraph lineCount={5} />
          </Column>
        </Grid>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Account Settings">
      <Grid className={styles.container}>
        <Column lg={12} md={8} sm={4}>
          {/* User Profile Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Profile Information</h2>
              <p className={styles.sectionDescription}>
                Your basic account information and current organization details.
              </p>
            </div>

            <div className={styles.profileCard}>
              <div className={styles.profileHeader}>
                <UserAvatar size={64} className={styles.profileAvatar} />
                <div className={styles.profileInfo}>
                  <h3 className={styles.profileName}>
                    {profile?.full_name || 'Unknown User'}
                  </h3>
                  <p className={styles.profileEmail}>{user?.email}</p>
                  {userRole && (
                    <Tag type="blue" size="sm" className={styles.roleTag}>
                      {userRole.charAt(0).toUpperCase() + userRole.slice(1)} Role
                    </Tag>
                  )}
                </div>
              </div>

              <div className={styles.profileDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Full Name:</span>
                  <span className={styles.detailValue}>
                    {profile?.full_name || 'Not set'}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Email:</span>
                  <span className={styles.detailValue}>{user?.email}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>User ID:</span>
                  <span className={styles.detailValue}>{user?.id}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Organization ID:</span>
                  <span className={styles.detailValue}>
                    {currentOrgId || 'No organization'}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Account Created:</span>
                  <span className={styles.detailValue}>
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Account Actions Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Account Management</h2>
              <p className={styles.sectionDescription}>
                Manage your account settings and preferences.
              </p>
            </div>

            <div className={styles.actionsGrid}>
              {accountActions.map((action) => (
                <div key={action.id} className={styles.actionCard}>
                  <div className={styles.actionIcon}>{action.icon}</div>
                  <div className={styles.actionContent}>
                    <h3 className={styles.actionTitle}>{action.title}</h3>
                    <p className={styles.actionDescription}>{action.description}</p>
                  </div>
                  <Button
                    kind="secondary"
                    size="sm"
                    onClick={() => navigate(action.path)}
                    renderIcon={Edit}
                  >
                    {action.buttonText}
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* Dangerous Actions Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Danger Zone</h2>
              <p className={styles.sectionDescription}>
                These actions cannot be undone. Please proceed with caution.
              </p>
            </div>

            <div className={styles.dangerZone}>
              {dangerousActions.map((action) => (
                <div key={action.id} className={styles.dangerCard}>
                  <div className={styles.dangerIcon}>{action.icon}</div>
                  <div className={styles.dangerContent}>
                    <h3 className={styles.dangerTitle}>{action.title}</h3>
                    <p className={styles.dangerDescription}>{action.description}</p>
                  </div>
                  <Button
                    kind="danger"
                    size="sm"
                    onClick={() => navigate(action.path)}
                  >
                    {action.buttonText}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </Column>
      </Grid>
    </AppLayout>
  );
};

export default AccountSettings; 
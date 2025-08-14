import React from 'react';
import { Grid, Column } from '@carbon/react';
import AppLayout from '../../components/layout/AppLayout'; // Assuming you have a general AppLayout
import PageHeader from '../../components/layout/PageHeader'; // Assuming you have a PageHeader
import styles from '../../styles/pages/site/SitePages.module.scss'; // Create or use an existing SCSS module for site pages

const PendingApprovalPage: React.FC = () => {
  return (
    <AppLayout pageTitle="Pending Approval">
      <PageHeader title="Approval Pending" />
      <Grid className={styles.pageGrid}>
        <Column lg={16} md={8} sm={4}>
          <div className={styles.contentArea}>
            <h3 className={styles.sectionTitle}>Thank you for signing up!</h3>
            <p className={styles.paragraph}>
              Your request to join an organisation has been received and is currently pending approval
              from an administrator.
            </p>
            <p className={styles.paragraph}>
              You will be notified once your request has been processed. In the meantime,
              you may log out and check back later.
            </p>
            {/* Optional: Add a logout button or link to contact support */}
          </div>
        </Column>
      </Grid>
    </AppLayout>
  );
};

export default PendingApprovalPage; 
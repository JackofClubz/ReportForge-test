import React from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import PageHeader from '../../components/layout/PageHeader';
import { useSite } from '../../hooks/useSite';
import { Grid, Column, SkeletonText, InlineNotification } from '@carbon/react';
import styles from '../../styles/pages/site/SitePage.module.scss';

const SitePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { site, loading, error } = useSite(id || '');

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Site Details" />
        <Grid fullWidth>
          <Column lg={16} md={8} sm={4}>
            <SkeletonText paragraph lineCount={5} />
          </Column>
        </Grid>
      </AppLayout>
    );
  }

  if (error || !site) {
    return (
      <AppLayout>
        <Grid>
        <Column sm={4} md={8} lg={16}>
          <PageHeader title="Site Details" />
        </Column>
      </Grid>
        <Grid fullWidth>
          <Column lg={16} md={8} sm={4}>
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={error || "Site not found"}
            />
          </Column>
        </Grid>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <PageHeader title={site.name} />
        </Column>
      </Grid>
      <Grid fullWidth>
        <Column lg={16} md={8} sm={4} className={styles.siteHeader}>
          <p className={styles.siteSubtitle}>{site.primary_minerals}</p>
        </Column>

        <Column lg={8} md={4} sm={4}>
          <div className={styles.detailCard}>
            <h3>Site Information</h3>
            <div className={styles.detailRow}>
              <strong>Country:</strong> {site.site_country}
            </div>
            <div className={styles.detailRow}>
              <strong>Coordinates:</strong> {site.latitude}, {site.longitude}
            </div>
            <div className={styles.detailRow}>
              <strong>Start Date:</strong> {new Date(site.start_date).toLocaleDateString()}
            </div>
            {site.description && (
              <div className={styles.detailRow}>
                <strong>Description:</strong> {site.description}
              </div>
            )}
          </div>
        </Column>

        <Column lg={8} md={4} sm={4}>
          <div className={styles.detailCard}>
            <h3>Activity Information</h3>
            <div className={styles.detailRow}>
              <strong>Created:</strong> {new Date(site.created_at || '').toLocaleDateString()}
            </div>
            <div className={styles.detailRow}>
              <strong>Last Updated:</strong> {new Date(site.updated_at || '').toLocaleDateString()}
            </div>
          </div>
        </Column>
      </Grid>
    </AppLayout>
  );
};

export default SitePage;

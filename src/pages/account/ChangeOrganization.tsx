import React from 'react';
import { Grid, Column, Button, InlineNotification } from '@carbon/react';
import { ArrowLeft, Enterprise } from '@carbon/icons-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';

const ChangeOrganization: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AppLayout pageTitle="Switch Organization">
      <Grid style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <Column lg={8} md={6} sm={4}>
          <Button
            kind="ghost"
            renderIcon={ArrowLeft}
            onClick={() => navigate('/account/settings')}
            style={{ marginBottom: '1rem' }}
          >
            Back to Account Settings
          </Button>
          
          <h1 style={{ marginBottom: '1rem' }}>Switch Organization</h1>
          
          <InlineNotification
            kind="info"
            title="Coming Soon"
            subtitle="Organization switching functionality will be available in a future update. Currently, you can only belong to one organization at a time."
            hideCloseButton
          />
          
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
            <Button
              kind="secondary"
              onClick={() => navigate('/account/settings')}
            >
              Back to Settings
            </Button>
            <Button
              kind="primary"
              renderIcon={Enterprise}
              onClick={() => navigate('/organisation')}
            >
              Manage Current Organization
            </Button>
          </div>
        </Column>
      </Grid>
    </AppLayout>
  );
};

export default ChangeOrganization; 
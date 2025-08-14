import React from 'react';
import { Grid, Column, Button, InlineNotification } from '@carbon/react';
import { ArrowLeft, Email } from '@carbon/icons-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';

const ChangeEmail: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AppLayout pageTitle="Change Email">
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
          
          <h1 style={{ marginBottom: '1rem' }}>Change Email Address</h1>
          
          <InlineNotification
            kind="info"
            title="Coming Soon"
            subtitle="Email change functionality will be available in a future update. Contact support if you need to change your email address immediately."
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
              renderIcon={Email}
              onClick={() => navigate('/support')}
            >
              Contact Support
            </Button>
          </div>
        </Column>
      </Grid>
    </AppLayout>
  );
};

export default ChangeEmail; 
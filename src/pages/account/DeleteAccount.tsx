import React from 'react';
import { Grid, Column, Button, InlineNotification } from '@carbon/react';
import { ArrowLeft, TrashCan, WarningFilled } from '@carbon/icons-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';

const DeleteAccount: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AppLayout pageTitle="Delete Account">
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
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <WarningFilled size={24} style={{ color: '#fa4d56' }} />
            <h1 style={{ color: '#fa4d56', margin: 0 }}>Delete Account</h1>
          </div>
          
          <InlineNotification
            kind="error"
            title="Dangerous Action"
            subtitle="Account deletion cannot be undone. All your data, reports, and sites will be permanently removed."
            hideCloseButton
            style={{ marginBottom: '2rem' }}
          />
          
          <div style={{ 
            background: '#fff1f1', 
            border: '1px solid #ff8389', 
            borderRadius: '8px', 
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ color: '#da1e28', marginBottom: '1rem' }}>What will be deleted:</h3>
            <ul style={{ color: '#525252', marginBottom: 0 }}>
              <li>Your user account and profile</li>
              <li>All reports you've created</li>
              <li>All sites you own</li>
              <li>Your organization membership</li>
              <li>All associated data and files</li>
            </ul>
          </div>
          
          <InlineNotification
            kind="warning"
            title="Contact Support First"
            subtitle="We recommend contacting our support team before deleting your account. They may be able to help with your concerns or provide alternatives."
            hideCloseButton
            style={{ marginBottom: '2rem' }}
          />
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Button
              kind="secondary"
              onClick={() => navigate('/account/settings')}
            >
              Back to Settings
            </Button>
            <Button
              kind="secondary"
              onClick={() => navigate('/support')}
            >
              Contact Support
            </Button>
            <Button
              kind="danger"
              renderIcon={TrashCan}
              disabled
              title="Account deletion is not yet implemented. Please contact support."
            >
              Delete Account (Coming Soon)
            </Button>
          </div>
        </Column>
      </Grid>
    </AppLayout>
  );
};

export default DeleteAccount; 
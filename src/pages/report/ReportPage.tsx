import React from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import PageHeader from '../../components/layout/PageHeader';
import { Grid, Column } from '@carbon/react';

const ReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <AppLayout>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <PageHeader title="Report Details" />
        </Column>
      </Grid>
      <Grid fullWidth>
        <Column lg={16} md={8} sm={4}>
          <p>Report ID: {id}</p>
          {/* Report content will go here */}
        </Column>
      </Grid>
    </AppLayout>
  );
};

export default ReportPage;

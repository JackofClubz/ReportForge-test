import React from 'react';
import AppLayout from '../../components/layout/AppLayout';
import PageHeader from '../../components/layout/PageHeader';
import styles from '../../styles/pages/report/ReportsPortfolio.module.scss';
// import { useReports, ReportRow } from '../../hooks/useReports'; // Old hook
import { useAllReports } from '../../hooks/useAllReports'; // New hook
import type { ReportRow } from '../../hooks/useReports'; // Import type if not re-defined in useAllReports
import { Table, TableHead, TableRow, TableHeader, TableBody, TableCell, TableContainer, Tag, SkeletonText, Button, InlineNotification } from '@carbon/react'; // Added InlineNotification
import { Add, View, Edit, Settings } from '@carbon/icons-react';
import { usePermissions } from '../../hooks/usePermissions'; // Added

const ReportsPortfolio: React.FC = () => {
  // Use the new hook and get the error state
  const { reports, loadingReports, error } = useAllReports(); 
  const { 
    canCreateReport, 
    canEditReport, 
    canViewReportSettings, 
    isRoleLoading 
  } = usePermissions(); // Added

  const actions = (
    <>
      {canCreateReport && (
        <Button
          kind="primary"
          size="md"
          className={styles.actionButton}
          renderIcon={Add}
          href="/report/create"
          disabled={isRoleLoading} // Added
        >
          New Report
        </Button>
      )}
    </>
  );

  return (
    <AppLayout>
      <PageHeader title="Reports" actions={(canCreateReport && !isRoleLoading) ? actions : undefined} /> {/* Updated title for clarity */}
      <section className={styles.section}>
        {error && ( /* Display error message if any */
          <InlineNotification
            kind="error"
            title="Error loading reports"
            subtitle={error.message}
            hideCloseButton
            className={styles.notificationError} // Add a class if specific styling is needed
          />
        )}
        <TableContainer className={styles.tableContainer}>
          <Table size="lg" useZebraStyles={false}>
            <TableHead>
              <TableRow>
                <TableHeader>Report Name</TableHeader>
                <TableHeader>Template</TableHeader>
                {/* Consider adding Site Name if available from a join in useAllReports */}
                {/* <TableHeader>Site Name</TableHeader> */}
                <TableHeader>Status</TableHeader>
                <TableHeader>Published On</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingReports ? (
                <TableRow>
                  {/* Update colSpan if Site Name is added */}
                  <TableCell colSpan={5}><SkeletonText paragraph lineCount={3} /></TableCell>
                </TableRow>
              ) : reports.length === 0 && !error ? ( /* Only show no reports if no error */
                <TableRow>
                  <TableCell colSpan={5}>No reports available for your organisation.</TableCell>
                </TableRow>
              ) : (
                reports.map((report: ReportRow) => (
                  <TableRow key={report.id}>
                    <TableCell>{report.report_name || '-'}</TableCell>
                    <TableCell>{report.template_type || '-'}</TableCell>
                    {/* <TableCell>{report.site_name || '-'}</TableCell> If site_name is part of ReportRow */}
                    <TableCell><Tag type={getStatusType(report.status)}>{report.status || '-'}</Tag></TableCell>
                    <TableCell>{report.published_on ? formatDate(report.published_on) : 'Not Published'}</TableCell>
                    <TableCell className={styles.actionCell}>
                      <Button 
                        kind="ghost" 
                        size="sm" 
                        href={`/report/${report.id}`}
                        hasIconOnly
                        renderIcon={View}
                        iconDescription="View report"
                        tooltipPosition="bottom"
                        disabled={isRoleLoading} // Added
                      />
                      {canEditReport && (
                        <Button 
                          kind="ghost" 
                          size="sm" 
                          href={`/report/${report.id}/edit`}
                          hasIconOnly
                          renderIcon={Edit}
                          iconDescription="Edit report"
                          tooltipPosition="bottom"
                          disabled={isRoleLoading} // Added
                        />
                      )}
                      {canViewReportSettings && (
                        <Button 
                          kind="ghost" 
                          size="sm" 
                          href={`/report/${report.id}/settings`}
                          hasIconOnly
                          renderIcon={Settings}
                          iconDescription="Settings"
                          tooltipPosition="bottom"
                          disabled={isRoleLoading} // Added
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </section>
    </AppLayout>
  );
};

function getStatusType(status: string) {
  switch (status?.toLowerCase()) {
    case 'draft':
      return 'magenta';
    case 'published':
      return 'green';
    case 'archived':
      return 'gray';
    case 'in progress':
      return 'purple';
    default:
      return 'gray';
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

export default ReportsPortfolio; 
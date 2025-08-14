import React, { useEffect, useState } from 'react';
import {
  Button,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  Tag,
  SkeletonText,
  Grid,
  Column,
  InlineNotification,
  Modal,
} from '@carbon/react';
import { Add, View, Edit, Settings } from '@carbon/icons-react';
import { useNavigate } from 'react-router-dom';
import styles from '../../styles/pages/dashboard/Dashboard.module.scss';
import AppLayout from '../../components/layout/AppLayout';
import PageHeader from '../../components/layout/PageHeader';
import { useReports, ReportRow } from '../../hooks/useReports';
import { useSites, SiteRow } from '../../hooks/useSites';
import { usePermissions } from '../../hooks/usePermissions';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { reports, loadingReports } = useReports();
  const { sites, loadingSites, error: sitesError } = useSites();
  const { 
    canCreateSite, 
    canCreateReport, 
    canEditReport, 
    canViewReportSettings, 
    canEditSite,
    isRoleLoading
  } = usePermissions();

  // State for coordinates modal
  const [isCoordinatesModalOpen, setIsCoordinatesModalOpen] = useState(false);
  const [modalCoordinates, setModalCoordinates] = useState<string>('');

  const actions = (
    <>
      {canCreateSite && (
        <Button
          kind="secondary"
          size="md"
          className={styles.actionButton}
          renderIcon={Add}
          href="/site/create"
          disabled={isRoleLoading}
        >
          New Site
        </Button>
      )}
      {canCreateReport && (
        <Button
          kind="primary"
          size="md"
          className={styles.actionButton}
          renderIcon={Add}
          href="/report/create"
          disabled={isRoleLoading}
        >
          New Report
        </Button>
      )}
    </>
  );

  const handleOpenCoordinatesModal = (coordinates: SiteRow['coordinates']) => {
    if (coordinates && coordinates.length > 0) {
      const formattedCoords = coordinates
        .map(([lat, long]) => `Latitude: ${lat}, Longitude: ${long}`)
        .join('\n');
      setModalCoordinates(formattedCoords);
      setIsCoordinatesModalOpen(true);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Dashboard" actions={actions} />
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className="bx--type-productive-heading-04">My Recent Reports</h3>
          <p className="bx--type-body-long-01">Quick access to your ongoing work and recently completed reports.</p>
        </div>
        <TableContainer className={styles.table}>
          <Table size="lg" useZebraStyles={false}>
            <TableHead>
              <TableRow>
                <TableHeader>Report Name</TableHeader>
                <TableHeader>Template</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Published On</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingReports ? (
                <TableRow>
                  <TableCell colSpan={5}><SkeletonText paragraph lineCount={3} /></TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>No reports available</TableCell>
                </TableRow>
              ) : (
                reports.map((report: ReportRow) => (
                  <TableRow key={report.id}>
                    <TableCell>{report.report_name || '-'}</TableCell>
                    <TableCell>{report.template_type || '-'}</TableCell>
                    <TableCell>
                      <Tag type={getStatusType(report.status)}>{report.status || '-'}</Tag>
                    </TableCell>
                    <TableCell>{report.published_on ? formatDate(report.published_on) : '-'}</TableCell>
                    <TableCell>
                      <Button 
                        kind="ghost" 
                        size="sm" 
                        href={`/report/${report.id}`}
                        hasIconOnly
                        renderIcon={View}
                        iconDescription="View report"
                        tooltipPosition="bottom"
                        disabled={isRoleLoading}
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
                          disabled={isRoleLoading}
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
                          disabled={isRoleLoading}
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
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className="bx--type-productive-heading-04">My Recent Sites</h3>
          <p className="bx--type-body-long-01">Quick access to your recently created sites.</p>
        </div>
        {sitesError && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={sitesError.message}
            className={styles.notification}
            hideCloseButton
          />
        )}
        <TableContainer className={styles.table}>
          <Table size="lg" useZebraStyles={false}>
            <TableHead>
              <TableRow>
                <TableHeader>Site Name</TableHeader>
                <TableHeader>Country</TableHeader>
                <TableHeader>Coordinates</TableHeader>
                <TableHeader>Primary Minerals</TableHeader>
                
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingSites ? (
                <TableRow>
                  <TableCell colSpan={6}><SkeletonText paragraph lineCount={3} /></TableCell>
                </TableRow>
              ) : sites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>No sites available</TableCell>
                </TableRow>
              ) : (
                sites.map((site: SiteRow) => (
                  <TableRow key={site.id}>
                    <TableCell>{site.name || '-'}</TableCell>
                    <TableCell>{site.site_country || '-'}</TableCell>
                    <TableCell>
                      {site.coordinates && site.coordinates.length > 0 ? (
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() => handleOpenCoordinatesModal(site.coordinates)}
                        >
                          View on Mezos
                        </Button>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{site.primary_minerals || '-'}</TableCell>
                    <TableCell>
                      <Button 
                        kind="ghost" 
                        size="sm" 
                        href={`/site/${site.id}`}
                        hasIconOnly
                        renderIcon={View}
                        iconDescription="View Site"
                        tooltipPosition="bottom"
                        disabled={isRoleLoading}
                      />
                      {canEditSite && (
                        <Button 
                          kind="ghost" 
                          size="sm" 
                          href={`/site/${site.id}/edit`}
                          hasIconOnly
                          renderIcon={Settings}
                          iconDescription="Settings"
                          tooltipPosition="bottom"
                          disabled={isRoleLoading}
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
      <Modal
        open={isCoordinatesModalOpen}
        onRequestClose={() => setIsCoordinatesModalOpen(false)}
        modalHeading="Site Coordinates"
        passiveModal
      >
        <p style={{ whiteSpace: 'pre-line' }}>
          {modalCoordinates}
        </p>
      </Modal>
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

export default Dashboard;

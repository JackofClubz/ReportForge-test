import React, { useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import PageHeader from '../../components/layout/PageHeader';
import styles from '../../styles/pages/site/SitesPortfolio.module.scss';
// import { useSites, SiteRow } from '../../hooks/useSites'; // Old hook
import { useAllSites } from '../../hooks/useAllSites'; // New hook
import type { SiteRow } from '../../hooks/useSites'; // Import type if not re-defined in useAllSites
import { Table, TableHead, TableRow, TableHeader, TableBody, TableCell, TableContainer, SkeletonText, Button, Modal, Grid, Column, InlineNotification } from '@carbon/react'; // Added InlineNotification
import { Add, Edit, Settings, View } from '@carbon/icons-react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions'; // Added

const SitesPortfolio: React.FC = () => {
  // Use the new hook and get the error state
  const { sites, loadingSites, error } = useAllSites(); 
  const navigate = useNavigate();
  const { 
    canCreateSite, 
    canEditSite, 
    isRoleLoading 
  } = usePermissions(); // Added

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCoordinates, setModalCoordinates] = useState<string>('');

  const handleOpenCoordinatesModal = (coordinates: SiteRow['coordinates']) => {
    if (coordinates && coordinates.length > 0) {
      const formattedCoords = coordinates
        .map(([lat, long]) => `Latitude: ${lat}, Longitude: ${long}`)
        .join('\n'); // Using newline for better readability in modal
      setModalCoordinates(formattedCoords);
      setIsModalOpen(true);
    }
  };

  const actions = (
    <>
      {canCreateSite && (
        <Button
          kind="primary"
          size="md"
          className={styles.actionButton}
          renderIcon={Add}
          onClick={() => navigate('/site/create')}
          disabled={isRoleLoading} // Added
        >
          New Site
        </Button>
      )}
    </>
  );

  return (
    <AppLayout>
      <PageHeader title="Sites Portfolio" actions={(canCreateSite && !isRoleLoading) ? actions : undefined} /> {/* Updated title for clarity */}
      <section className={styles.section}>
        {error && ( /* Display error message if any */
          <InlineNotification
            kind="error"
            title="Error loading sites"
            subtitle={error.message}
            hideCloseButton
            className={styles.notificationError} // Add a class if specific styling is needed
          />
        )}
        <TableContainer className={styles.tableContainer}>
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
                  <TableCell colSpan={5}><SkeletonText paragraph lineCount={3} /></TableCell>
                </TableRow>
              ) : sites.length === 0 && !error ? ( /* Only show no sites if no error */
                <TableRow>
                  <TableCell colSpan={5}>No sites available for your organisation.</TableCell>
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
                        disabled={isRoleLoading} // Added
                      />
                      {canEditSite && (
                        <Button 
                          kind="ghost" 
                          size="sm" 
                          href={`/site/${site.id}/edit`} // Links to edit page
                          hasIconOnly
                          renderIcon={Settings} // Icon is Settings, but action is Edit
                          // renderIcon={Edit} // Consider changing to Edit icon for clarity
                          iconDescription="Settings" // Tooltip says Settings
                          // iconDescription="Edit Site" // Consider changing for clarity
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
      <Modal
        open={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
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

export default SitesPortfolio; 
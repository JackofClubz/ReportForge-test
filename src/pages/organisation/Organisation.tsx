import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Column,
  Button,
  TextInput,
  Dropdown,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Modal,
  InlineNotification,
  SkeletonText,
  Form,
  Stack,
  TextArea,
  Tag,
} from '@carbon/react';
import { Save, Add, TrashCan, CheckmarkOutline, CloseOutline } from '@carbon/icons-react';
import AppLayout from '../../components/layout/AppLayout';
import PageHeader from '../../components/layout/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions, ORG_ROLES } from '../../hooks/usePermissions';
import { supabase } from '../../lib/supabaseClient';
import styles from '../../styles/pages/organisation/Organisation.module.scss';
import { format } from 'date-fns';

interface OrganisationData {
  id: string;
  name: string;
  domain: string | null;
  notes: string | null;
  created_by: string;
  created_by_user?: { full_name?: string; email?: string };
  created_at: string;
}

interface OrgUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  user_profiles: { full_name?: string; email?: string } | null;
}

interface OrgUserTableRow {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    joined_on: string;
    role: string;
}

const roleOptionsForSelect = Object.values(ORG_ROLES)
  .filter(role => role !== ORG_ROLES.PENDING)
  .map(role => ({
    id: role,
    text: role.charAt(0).toUpperCase() + role.slice(1)
  }));

const DEFAULT_APPROVED_ROLE = ORG_ROLES.VIEWER;

const OrganisationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentOrgId } = useAuth();
  const { userRole: adminUserRole, isRoleLoading } = usePermissions();

  const [organisation, setOrganisation] = useState<OrganisationData | null>(null);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastOperationTimestamp, setLastOperationTimestamp] = useState<number>(Date.now());

  const [editableOrgName, setEditableOrgName] = useState('');
  const [editableDomain, setEditableDomain] = useState('');
  const [editableNotes, setEditableNotes] = useState('');
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [saveOrgError, setSaveOrgError] = useState<string | null>(null);
  const [saveOrgSuccess, setSaveOrgSuccess] = useState<string | null>(null);

  const [newUserEmail, setNewUserEmail] = useState('');
  const [selectedNewUserRole, setSelectedNewUserRole] = useState<typeof roleOptionsForSelect[0] | null>(
    roleOptionsForSelect.find(r => r.id === ORG_ROLES.VIEWER) || null
  );
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [addUserSuccess, setAddUserSuccess] = useState<string | null>(null);
  
  const [userToModifyRole, setUserToModifyRole] = useState<OrgUserTableRow | null>(null);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  const [userToRemove, setUserToRemove] = useState<OrgUserTableRow | null>(null);
  const [isRemoveUserModalOpen, setIsRemoveUserModalOpen] = useState(false);
  const [isRemovingUser, setIsRemovingUser] = useState(false);

  const canEditDetails = adminUserRole === ORG_ROLES.ADMIN;
  const hasDetailsChanged = useMemo(() => {
    if (!organisation) return false;
    return (
      editableOrgName !== organisation.name ||
      editableDomain !== (organisation.domain || '') ||
      editableNotes !== (organisation.notes || '')
    );
  }, [editableOrgName, editableDomain, editableNotes, organisation]);

  useEffect(() => {
    if (!isRoleLoading && adminUserRole !== ORG_ROLES.ADMIN) {
      navigate('/dashboard');
    }
  }, [adminUserRole, isRoleLoading, navigate]);

  useEffect(() => {
    const fetchOrgData = async () => {
      if (!currentOrgId) {
        setLoadingOrg(false);
        setLoadingUsers(false);
        return;
      }

      setLoadingOrg(true);
      setLoadingUsers(true);
      setError(null);

      try {
        const { data: orgData, error: orgError } = await supabase
          .from('orgs')
          .select('*')
          .eq('id', currentOrgId)
          .single();

        if (orgError) throw orgError;
        if (orgData) {
          const typedOrgData = orgData as OrganisationData;
          setOrganisation(typedOrgData);
          setEditableOrgName(typedOrgData.name);
          setEditableDomain(typedOrgData.domain || '');
          setEditableNotes(typedOrgData.notes || '');
        } else {
          setError('Organisation not found.');
        }

        let creatorInfo: { full_name?: string; email?: string } | undefined = undefined;
        if (orgData?.created_by) {
          const { data: creator, error: creatorError } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('id', orgData.created_by)
            .single();
          if (!creatorError && creator) {
            creatorInfo = creator;
          }
        }
        setOrganisation(prev => prev ? { ...prev, created_by_user: creatorInfo } : null);

        const { data: usersData, error: usersError } = await supabase
          .from('org_users')
          .select('id, user_id, role, created_at')
          .eq('org_id', currentOrgId);

        if (usersError) throw usersError;
        const orgUsersRaw = (usersData as OrgUser[]) || [];

        const userIds = orgUsersRaw.map(u => u.user_id);
        let profilesMap: Record<string, { full_name?: string; email?: string }> = {};
        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('id, full_name, email')
            .in('id', userIds);
          if (!profilesError && profiles) {
            profilesMap = Object.fromEntries(
              profiles.map((p: any) => [p.id, { full_name: p.full_name, email: p.email }])
            );
          }
        }
        setOrgUsers(orgUsersRaw.map(u => ({
          ...u,
          user_profiles: profilesMap[u.user_id] || null
        })));

      } catch (err: any) {
        console.error('Error fetching organisation data:', err);
        setError(err.message || 'Failed to load organisation data.');
      } finally {
        setLoadingOrg(false);
        setLoadingUsers(false);
      }
    };

    if (currentOrgId && !isRoleLoading && adminUserRole === ORG_ROLES.ADMIN) {
      fetchOrgData();
    }
  }, [adminUserRole, currentOrgId, isRoleLoading, lastOperationTimestamp]);

  const existingMembersTableHeaders = [
    { key: 'full_name', header: 'Member Name' },
    { key: 'email', header: 'Email' },
    { key: 'joined_on', header: 'Joined on'},
    { key: 'role', header: 'Role' },
    { key: 'actions', header: 'Actions' },
  ];

  const existingMembersTableRows = useMemo((): OrgUserTableRow[] => {
    return orgUsers.map(orgUser => ({
      id: orgUser.id,
      user_id: orgUser.user_id,
      full_name: orgUser.user_profiles?.full_name || orgUser.user_id,
      email: orgUser.user_profiles?.email || 'N/A',
      joined_on: orgUser.created_at ? format(new Date(orgUser.created_at), 'PP') : 'N/A',
      role: orgUser.role,
    }));
  }, [orgUsers]);

  const handleSaveOrgDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!organisation || !editableOrgName.trim()) {
      setSaveOrgError('Organisation name cannot be empty.');
      return;
    }
    if (!canEditDetails) {
        setSaveOrgError('You do not have permission to edit these details.');
        return;
    }

    setIsSavingOrg(true);
    setSaveOrgError(null);
    setSaveOrgSuccess(null);
    try {
      const updates: Partial<OrganisationData> = {
        name: editableOrgName.trim(),
        domain: editableDomain.trim() || null,
        notes: editableNotes.trim() || null,
      };

      const { error: updateError } = await supabase
        .from('orgs')
        .update(updates)
        .eq('id', organisation.id);

      if (updateError) throw updateError;
      
      setOrganisation(prev => prev ? { ...prev, ...updates } : null);
      setSaveOrgSuccess('Organisation details updated successfully.');
    } catch (err: any) {
      console.error('Error updating organisation:', err);
      setSaveOrgError(err.message || 'Failed to update organisation.');
    } finally {
      setIsSavingOrg(false);
      setTimeout(() => {
        setSaveOrgSuccess(null);
        setSaveOrgError(null);
      }, 5000);
    }
  };

  const handleRoleChange = async (orgUserRecordId: string, newRole: string) => {
    if (!orgUserRecordId || !newRole || !canEditDetails) return;

    const userToUpdate = orgUsers.find(u => u.id === orgUserRecordId);
    if (userToUpdate?.user_id === user?.id && newRole !== ORG_ROLES.ADMIN) {
      setSaveOrgError("You cannot change your own role from Admin.");
       setTimeout(() => setSaveOrgError(null), 5000);
      return;
    }

    setIsChangingRole(true);
    setAddUserError(null);
    setAddUserSuccess(null);
    setSaveOrgError(null);
    setSaveOrgSuccess(null);

    try {
      const { error: roleUpdateError } = await supabase
        .from('org_users')
        .update({ role: newRole })
        .eq('id', orgUserRecordId);

      if (roleUpdateError) throw roleUpdateError;

      setOrgUsers(prevUsers => 
        prevUsers.map(u => u.id === orgUserRecordId ? { ...u, role: newRole } : u)
      );
      setSaveOrgSuccess(`User role updated to ${newRole}.`);
    } catch (err: any) {
      console.error('Error updating user role:', err);
      setSaveOrgError(err.message || 'Failed to update role.');
    } finally {
      setIsChangingRole(false);
      setTimeout(() => {
        setSaveOrgSuccess(null);
        setSaveOrgError(null);
      }, 5000);
    }
  };

  const handleApproveUser = async (orgUserRecordId: string) => {
    if (!canEditDetails) return;
    setIsProcessingApproval(true);
    setSaveOrgError(null);
    setSaveOrgSuccess(null);
    try {
      const { error } = await supabase
        .from('org_users')
        .update({ role: DEFAULT_APPROVED_ROLE })
        .eq('id', orgUserRecordId)
        .eq('role', ORG_ROLES.PENDING);

      if (error) throw error;

      setOrgUsers(prevUsers =>
        prevUsers.map(u => (u.id === orgUserRecordId ? { ...u, role: DEFAULT_APPROVED_ROLE } : u))
      );
      setSaveOrgSuccess('User approved successfully.');
    } catch (err: any) {
      console.error('Error approving user:', err);
      setSaveOrgError(err.message || 'Failed to approve user.');
    } finally {
      setIsProcessingApproval(false);
      setTimeout(() => {
        setSaveOrgSuccess(null);
        setSaveOrgError(null);
      }, 5000);
    }
  };

  const handleDenyUser = async (orgUserRecordId: string, userName?: string) => {
    if (!canEditDetails) return;
    setIsProcessingApproval(true);
    setSaveOrgError(null);
    setSaveOrgSuccess(null);
    console.log(`[handleDenyUser] Attempting to deny user record: ${orgUserRecordId}`);
    try {
      const { error } = await supabase
        .from('org_users')
        .delete()
        .eq('id', orgUserRecordId)
        .eq('role', ORG_ROLES.PENDING);

      if (error) {
        console.error('[handleDenyUser] Supabase error denying user:', error);
        throw error; // Re-throw to be caught by the catch block
      }

      console.log(`[handleDenyUser] Successfully denied user record: ${orgUserRecordId}`);
      setOrgUsers(prevUsers => prevUsers.filter(u => u.id !== orgUserRecordId));
      setSaveOrgSuccess(`User ${userName || 'request'} denied and removed.`);
      setLastOperationTimestamp(Date.now());
    } catch (err: any) {
      console.error('[handleDenyUser] Error in deny process:', err);
      setSaveOrgError(err.message || 'Failed to deny user.');
    } finally {
      setIsProcessingApproval(false);
      setTimeout(() => {
        setSaveOrgSuccess(null);
        setSaveOrgError(null);
      }, 5000);
    }
  };

  const openRemoveUserModal = (tableRowUser: OrgUserTableRow) => {
    if (!canEditDetails) return;
    if (tableRowUser.user_id === user?.id) {
      setSaveOrgError("You cannot remove yourself from the organisation.");
       setTimeout(() => setSaveOrgError(null), 5000);
      return;
    }
    if (tableRowUser.role === ORG_ROLES.PENDING) {
        setSaveOrgError("Use 'Deny' action for pending users.");
        setTimeout(() => setSaveOrgError(null), 5000);
        return;
    }
    setUserToRemove(tableRowUser);
    setIsRemoveUserModalOpen(true);
  };

  const handleRemoveUser = async () => {
    if (!userToRemove || !canEditDetails) return;
    if (userToRemove.user_id === user?.id) {
      setIsRemoveUserModalOpen(false);
      // Optionally, set an error message here if desired
      setSaveOrgError("You cannot remove yourself from the organisation.");
      setTimeout(() => setSaveOrgError(null), 5000);
      return;
    }

    setIsRemovingUser(true);
    setAddUserError(null); 
    setAddUserSuccess(null);
    setSaveOrgError(null);
    setSaveOrgSuccess(null);
    console.log(`[handleRemoveUser] Attempting to remove user record: ${userToRemove.id}`);
    try {
      const { error: deleteError } = await supabase
        .from('org_users')
        .delete()
        .eq('id', userToRemove.id);

      if (deleteError) {
        console.error('[handleRemoveUser] Supabase error removing user:', deleteError);
        throw deleteError; // Re-throw to be caught by the catch block
      }
      
      console.log(`[handleRemoveUser] Successfully removed user record: ${userToRemove.id}`);
      setOrgUsers(prevUsers => prevUsers.filter(u => u.id !== userToRemove!.id)); // Added non-null assertion for userToRemove
      setSaveOrgSuccess(`User ${userToRemove.full_name || userToRemove.email} removed successfully.`);
      setLastOperationTimestamp(Date.now());
      setIsRemoveUserModalOpen(false); // Close modal on success
      setUserToRemove(null); // Clear user to remove on success
    } catch (err: any) {
      console.error('[handleRemoveUser] Error in remove process:', err);
      setSaveOrgError(err.message || 'Failed to remove user.');
    } finally {
      setIsRemovingUser(false);
      // Only close modal and clear user if it wasn't already done on success
      // if (isRemoveUserModalOpen) setIsRemoveUserModalOpen(false);
      // if (userToRemove) setUserToRemove(null); 
      setTimeout(() => {
        setSaveOrgSuccess(null);
        setSaveOrgError(null);
      }, 5000);
    }
  };

  const handleInviteUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canEditDetails || !newUserEmail.trim() || !selectedNewUserRole?.id || !currentOrgId) {
        setAddUserError("Email and role are required to invite a user.");
        return;
    }
    
    if (!/\S+@\S+\.\S+/.test(newUserEmail.trim())) {
        setAddUserError("Please enter a valid email address.");
        return;
    }

    setIsAddingUser(true);
    setAddUserError(null);
    setAddUserSuccess(null);
    setSaveOrgError(null);
    setSaveOrgSuccess(null);

    console.log('[handleInviteUser] Attempting to invite user. Details:');
    console.log('[handleInviteUser] Email:', newUserEmail.trim());
    console.log('[handleInviteUser] Org ID:', currentOrgId);
    console.log('[handleInviteUser] Inviter Name:', user?.user_metadata?.full_name || user?.email);
    console.log('[handleInviteUser] Redirect URL:', `${window.location.origin}/auth/complete-signup`);
    console.log('[handleInviteUser] Selected Role:', selectedNewUserRole.id);
    console.log('[handleInviteUser] Current User Object:', user);

    try {
        const functionInvokeBody = {
            email: newUserEmail.trim(),
            org_id: currentOrgId,
            inviter_name: user?.user_metadata?.full_name || user?.email,
            redirect_url: `${window.location.origin}/auth/complete-signup`,
            selected_role: selectedNewUserRole.id
        };
        console.log('[handleInviteUser] Invoking function with body:', functionInvokeBody);

        const { data: functionData, error: functionError } = await supabase.functions.invoke('invite-user', {
            body: functionInvokeBody
        });

        if (functionError) {
            // This block will now only be hit if the Edge Function returned a 500 (or other non-2xx)
            // indicating a more severe issue with the invitation process itself.
            console.error('Error invoking invite-user function (raw object):', functionError);
            
            let displayErrorMessage = "An unexpected error occurred while trying to send the invitation. Please try again.";

            // Attempt to get a more specific error message if the function provided one in its JSON response
            // @ts-ignore
            if (functionError.data && typeof functionError.data === 'object' && functionError.data.error) {
                // @ts-ignore
                displayErrorMessage = functionError.data.error;
            // @ts-ignore
            } else if (functionError.context && typeof functionError.context.error === 'object' && functionError.context.error.error) {
                // @ts-ignore
                displayErrorMessage = functionError.context.error.error;
            } else if (functionError.message && !functionError.message.toLowerCase().includes('non-2xx')) {
                displayErrorMessage = functionError.message; 
            }
            
            setAddUserError(displayErrorMessage);
            setIsAddingUser(false);
            return;
        }
        
        // If successful (2xx response from Edge Function)
        console.log("Invite function success data:", functionData);
        // The message here comes from the Edge Function: "Invitation successfully processed and sent."
        // @ts-ignore
        setAddUserSuccess(`${functionData.message} to ${newUserEmail.trim()} for role ${selectedNewUserRole.text}.`);
        setNewUserEmail('');

    } catch (err: any) {
        console.error('Error inviting user (client-side catch):', err);
        // This will catch errors from the new Error() thrown above or other unexpected client-side issues.
        setAddUserError(err.message || 'An unexpected client-side error occurred while trying to send the invitation.');
    } finally {
        setIsAddingUser(false);
        setTimeout(() => {
            setAddUserSuccess(null);
            setAddUserError(null);
        }, 7000);
    }
  };
  
  if (isRoleLoading || loadingOrg) {
    return (
      <AppLayout pageTitle="Loading Organisation Data">
        <Grid className={styles.pageLayout}>
          <Column lg={16} md={8} sm={4} className={styles.skeletonTextContainer}>
            <SkeletonText paragraph lineCount={3} />
            <SkeletonText paragraph lineCount={5} />
          </Column>
        </Grid>
      </AppLayout>
    );
  }
  
  if (error && !organisation) {
    return (
      <AppLayout pageTitle="Error">
        <Grid className={styles.pageLayout}>
          <Column lg={16} md={8} sm={4}>
            <InlineNotification
                kind="error"
                title="Error Loading Organisation Data"
                subtitle={error}
                hideCloseButton
                className={styles.inlineNotification}
            />
          </Column>
        </Grid>
      </AppLayout>
    );
  }
  
  if (!organisation) {
     return (
      <AppLayout pageTitle="Organisation Not Found">
        <Grid className={styles.pageLayout}>
          <Column lg={16} md={8} sm={4}>
              <p>No organisation data found. You may not be part of an organisation, or an error occurred.</p>
          </Column>
        </Grid>
      </AppLayout>
    );
  }

  const pageHeaderActions = canEditDetails ? (
    <div className={styles.pageHeaderActions}>
      <Button
        kind="primary"
        renderIcon={Save}
        onClick={() => handleSaveOrgDetails()}
        disabled={isSavingOrg || !hasDetailsChanged}
      >
        {isSavingOrg ? 'Saving...' : 'Save'}
      </Button>
    </div>
  ) : null;

  return (
    <AppLayout>
      <PageHeader 
        title={`Manage ${organisation.name}`}
        actions={pageHeaderActions}
      />
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className="bx--type-productive-heading-04">Organisation Details</h3>
          <p className="bx--type-body-long-01">Manage the details of your organisation.</p>
        </div>
        <div className={styles.sectionContent}>
          {saveOrgError && (
              <InlineNotification
                  kind="error"
                  title="Error Updating Organisation or Member"
                  subtitle={saveOrgError}
                  onCloseButtonClick={() => setSaveOrgError(null)}
                  className={styles.inlineNotification}
              />
          )}
          {saveOrgSuccess && (
              <InlineNotification
                  kind="success"
                  title="Update Successful"
                  subtitle={saveOrgSuccess}
                  onCloseButtonClick={() => setSaveOrgSuccess(null)}
                  className={styles.inlineNotification}
              />
          )}

          <Form onSubmit={canEditDetails ? handleSaveOrgDetails : (e) => e.preventDefault()}>
            <Grid className={styles.detailsGrid}>
              <Column lg={8} md={4} sm={4}>
                <TextInput
                    id="orgName"
                    name="orgName"
                    labelText="Organisation Name"
                    value={editableOrgName}
                    onChange={(e) => canEditDetails && setEditableOrgName(e.target.value)}
                    readOnly={!canEditDetails}
                    className={styles.formItem}
                    disabled={isSavingOrg && canEditDetails}
                />
              </Column>
              <Column lg={8} md={4} sm={4}>
                <TextInput
                    id="orgDomain"
                    name="orgDomain"
                    labelText="Domain"
                    value={editableDomain}
                    onChange={(e) => canEditDetails && setEditableDomain(e.target.value)}
                    readOnly={!canEditDetails}
                    className={styles.formItem}
                    disabled={isSavingOrg && canEditDetails}
                />
              </Column>
              <Column lg={8} md={4} sm={4}>
                 <div className={styles.readOnlyField}>
                    <span className="cds--label">Created by</span>
                    <p>{organisation.created_by_user?.full_name || organisation.created_by_user?.email || organisation.created_by || 'N/A'}</p>
                </div>
              </Column>
              <Column lg={8} md={4} sm={4}>
                <div className={styles.readOnlyField}>
                    <span className="cds--label">Created on</span>
                    <p>{format(new Date(organisation.created_at), 'PP')}</p>
                </div>
              </Column>
               <Column lg={16} md={8} sm={4}>
                <TextArea
                  id="orgNotes"
                  name="orgNotes"
                  labelText="Notes (Optional)"
                  value={editableNotes}
                  onChange={(e) => canEditDetails && setEditableNotes(e.target.value)}
                  readOnly={!canEditDetails}
                  className={`${styles.formItem} ${styles.notesTextArea}`}
                  disabled={isSavingOrg && canEditDetails}
                  placeholder={canEditDetails ? "Enter any notes about the organisation..." : "No notes provided."}
                  rows={4}
                  maxLength={500}
                  enableCounter={canEditDetails}
                />
              </Column>
            </Grid>
          </Form>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className="bx--type-productive-heading-04">Manage Members</h3>
          <p className="bx--type-body-long-01">Manage the members of your organisation.</p>
        </div>
        
        {canEditDetails && (
          <div className={styles.sectionContent}>        
            <h4 className={styles.subSectionTitle}>Existing organisation members</h4>
            {loadingUsers ? (
              <SkeletonText paragraph lineCount={5} />
            ) : orgUsers.length > 0 ? (
              <Grid className={styles.detailsGrid}>
                <Column lg={16} md={8} sm={4}>
                  <DataTable rows={existingMembersTableRows} headers={existingMembersTableHeaders} isSortable>
                    {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                      <TableContainer className={styles.usersTableContainer}>
                        <Table {...getTableProps()}>
                          <TableHead>
                            <TableRow>
                              {headers.map((header) => {
                                const { key, ...restHeaderProps } = getHeaderProps({ header });
                                return (
                                  <TableHeader key={key} {...restHeaderProps}>
                                    {header.header}
                                  </TableHeader>
                                );
                              })}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {rows.map((row) => {
                              const currentRowData = existingMembersTableRows.find(r => r.id === row.id);
                              return (
                                <TableRow {...getRowProps({ row })} key={row.id}>
                                  {row.cells.map((cell) => {
                                    if (cell.info.header === 'role') {
                                      return (
                                        <TableCell key={cell.id}>
                                          {currentRowData?.role === ORG_ROLES.PENDING ? (
                                            <Tag type="gray" size="md">Pending Approval</Tag>
                                          ) : (
                                            <Dropdown
                                              id={`role-${row.id}`}
                                              titleText=""
                                              label="Select role"
                                              items={roleOptionsForSelect}
                                              itemToString={(item) => (item ? item.text : '')}
                                              selectedItem={roleOptionsForSelect.find(r => r.id === cell.value)}
                                              onChange={(e) => e.selectedItem && currentRowData && handleRoleChange(currentRowData.id, e.selectedItem.id)}
                                              disabled={isChangingRole || currentRowData?.user_id === user?.id || isProcessingApproval}
                                              size="sm"
                                              className={styles.roleDropdown}
                                              aria-label={`Change role for ${currentRowData?.full_name}`}
                                            />
                                          )}
                                        </TableCell>
                                      );
                                    }
                                    if (cell.info.header === 'actions') {
                                      return (
                                        <TableCell key={cell.id} className={styles.actionCell}>
                                          {currentRowData?.role === ORG_ROLES.PENDING ? (
                                            <Stack orientation="horizontal" gap={3}>
                                              <Button
                                                kind="ghost"
                                                renderIcon={CheckmarkOutline}
                                                iconDescription="Approve User"
                                                hasIconOnly
                                                onClick={() => currentRowData && handleApproveUser(currentRowData.id)}
                                                disabled={isProcessingApproval}
                                                size="sm"
                                              />
                                              <Button
                                                kind="ghost"
                                                renderIcon={CloseOutline}
                                                iconDescription="Deny User"
                                                hasIconOnly
                                                onClick={() => currentRowData && handleDenyUser(currentRowData.id, currentRowData.full_name)}
                                                disabled={isProcessingApproval}
                                                size="sm"
                                              />
                                            </Stack>
                                          ) : (
                                            <Button
                                              kind="ghost"
                                              renderIcon={TrashCan}
                                              iconDescription="Remove User"
                                              hasIconOnly
                                              onClick={() => currentRowData && openRemoveUserModal(currentRowData)}
                                              disabled={isRemovingUser || currentRowData?.user_id === user?.id || isProcessingApproval}
                                              size="sm"
                                            />
                                          )}
                                        </TableCell>
                                      );
                                    }
                                    return <TableCell key={cell.id}>{cell.value}</TableCell>;
                                  })}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </DataTable>
                </Column>
              </Grid>
            ) : (
              <p className={styles.placeholderText}>No members found in this organisation yet.</p>
            )}

            <div className={styles.addUserForm}>
              <h4 className={styles.subSectionTitle}>Add New Member</h4>
              {addUserError && (
                  <InlineNotification
                      kind="error"
                      title="Error Inviting User"
                      subtitle={addUserError}
                     onCloseButtonClick={() => setAddUserError(null)}
                      className={styles.inlineNotification}
                  />
              )}
              {addUserSuccess && (
                    <InlineNotification
                      kind="success"
                      title="Invitation Sent"
                      subtitle={addUserSuccess}
                      onCloseButtonClick={() => setAddUserSuccess(null)}
                      className={styles.inlineNotification}
                  />
              )}
              <Form onSubmit={handleInviteUser}>
                <Grid className={styles.detailsGrid}>
                  <Column lg={7} md={3} sm={4}>
                    <TextInput
                      id="newUserEmail"
                      name="newUserEmail"
                      labelText="Member Email"
                      placeholder="Enter email to invite"
                      value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  type="email"
                  required
                  disabled={isAddingUser}
                      className={styles.formItem}
                    />
                  </Column>
                  <Column lg={6} md={3} sm={4}>
                    <Dropdown
                      id="newUserRole"
                      titleText="Member Role"
                      label="Choose a role"
                      items={roleOptionsForSelect}
                      itemToString={(item) => (item ? item.text : '')}
                      selectedItem={selectedNewUserRole}
                      onChange={(e) => setSelectedNewUserRole(e.selectedItem || null)}
                      disabled={isAddingUser}
                      className={styles.formItem}
                    />
                  </Column>
                  <Column lg={3} md={2} sm={4}>
                    <Button 
                      type="submit" 
                      renderIcon={Add} 
                      disabled={isAddingUser || !newUserEmail.trim() || !selectedNewUserRole}
                    >
                      {isAddingUser ? 'Sending...' : 'Add'}
                    </Button>
                  </Column>
                </Grid>
              </Form>
            </div>
          </div>
        )}
      </section>
      {canEditDetails && userToRemove && (
        <Modal
          open={isRemoveUserModalOpen}
          onRequestClose={() => setIsRemoveUserModalOpen(false)}
          onRequestSubmit={handleRemoveUser}
          modalHeading={`Remove ${userToRemove.full_name || userToRemove.email}?`}
          primaryButtonText={isRemovingUser ? "Removing..." : "Remove"}
          secondaryButtonText="Cancel"
          danger
          primaryButtonDisabled={isRemovingUser}
        >
          <p>
            Are you sure you want to remove <strong>{userToRemove.full_name || userToRemove.email}</strong> from the organisation?
            This action cannot be undone.
          </p>
        </Modal>
      )}
    </AppLayout>
  );
};

export default OrganisationPage;

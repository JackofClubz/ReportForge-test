// TODO: Implement report settings editing page
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Form,
  Grid,
  Column,
  Dropdown,
  DatePicker,
  DatePickerInput,
  TextInput,
  MultiSelect,
  TextArea,
  Button,
  Tag,
  InlineLoading,
  InlineNotification,
  ProgressIndicator,
  ProgressStep,
  Breadcrumb,
  BreadcrumbItem,
  Loading
} from '@carbon/react';
import { Save } from '@carbon/icons-react';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import PageHeader from '../../components/layout/PageHeader';
import { getSites, getUserProfiles, updateReport } from '../../lib/services/reportService';
import { getReportWithContent, getReportContributors } from '../../lib/services/reportEditService';
import styles from '../../styles/pages/report/CreateReport.module.scss';
import { Site, UserProfile } from '../../types/supabase';

// --- These might be similar to CreateReport --- 
interface TemplateOption { id: string; text: string; }
interface SiteOption { id: string; text: string; }
interface UserOption { id: string; text: string; disabled?: boolean }
const templateOptions: TemplateOption[] = [
  { id: 'NI43-101-Inferred', text: 'NI43-101 – Inferred' },
  { id: 'NI43-101-Indicated', text: 'NI43-101 – Indicated' },
  { id: 'NI43-101-Measured', text: 'NI43-101 – Measured' },
  { id: 'JORC-Inferred', text: 'JORC – Inferred' },
  { id: 'JORC-Indicated', text: 'JORC – Indicated' },
  { id: 'JORC-Measured', text: 'JORC – Measured' },
];
interface FormData {
  template_type: string;
  site: string;
  creation_date: string;
  due_date: string;
  report_name: string;
  contributors: string[];
  description: string;
  notes: string;
}
interface FormErrors { [key: string]: string; }
// --- End Similarity ---

const EditReportSettings: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { user, currentOrgId } = useAuth(); // Keep user if needed for permissions/defaults
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [sites, setSites] = useState<Site[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reportUsers, setReportUsers] = useState<{ user_id: string; role: string }[]>([]);

  // Initialize form state
  const [formData, setFormData] = useState<FormData>({
    template_type: '',
    site: '',
    creation_date: '',
    due_date: '',
    report_name: '',
    contributors: [],
    description: '',
    notes: '',
  });

  // Selected items state for dropdowns
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null);
  const [selectedSite, setSelectedSite] = useState<SiteOption | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!reportId || !currentOrgId) {
        setError('Report ID or Organization ID is missing.');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const [reportData, sitesData, usersData, contributorsData] = await Promise.all([
          getReportWithContent(reportId),
          getSites(currentOrgId),
          getUserProfiles(currentOrgId),
          getReportContributors(reportId),
        ]);

        setSites(sitesData);
        setUsers(usersData);
        setReportUsers(contributorsData || []);

        console.log('Report data received:', reportData);
        console.log('Report site field:', reportData.site_id);
        console.log('Available sites:', sitesData.map(s => ({ id: s.id, name: s.name })));

        // Populate form with existing report data
        const metadata = reportData.metadata as any || {};
        const reportDataAny = reportData as any; // Type assertion to access site_id
        const contributorIds = contributorsData?.map((c: any) => c.user_id) || [];
        
        // Ensure QP is always first in the contributors list
        const qpUserId = contributorsData?.find((c: any) => c.role === 'qp')?.user_id;
        let orderedContributors = [...contributorIds];
        if (qpUserId && contributorIds.includes(qpUserId)) {
          orderedContributors = [qpUserId, ...contributorIds.filter(id => id !== qpUserId)];
        }
        
        setFormData({
          template_type: reportData.template_type || '',
          site: reportDataAny.site_id || '', // Use site_id from actual data structure
          creation_date: reportData.created_on ? new Date(reportData.created_on).toISOString().split('T')[0] : '',
          due_date: metadata.due_date || '',
          report_name: reportData.report_name || '',
          contributors: orderedContributors,
          description: metadata.description || '',
          notes: metadata.notes || '',
        });

        console.log('Form data after setting:', {
          template_type: reportData.template_type || '',
          site: reportDataAny.site_id || '', // Updated to show site_id
          report_name: reportData.report_name || '',
        });

      } catch (error) {
        console.error('Failed to fetch report data:', error);
        setError('Failed to load report data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [reportId, currentOrgId]);

  // Update selected items when form data changes
  useEffect(() => {
    console.log('Setting selected items:', { 
      template_type: formData.template_type, 
      site: formData.site, 
      contributors: formData.contributors,
      sitesLength: sites.length,
      usersLength: users.length 
    });
    
    if (formData.template_type) {
      const template = templateOptions.find(t => t.id === formData.template_type);
      console.log('Found template:', template);
      setSelectedTemplate(template || null);
    }
    
    if (formData.site && sites.length > 0) {
      const site = sites.find(s => s.id === formData.site);
      console.log('Found site:', site, 'for site ID:', formData.site);
      setSelectedSite(site ? { id: site.id, text: site.name } as SiteOption : null);
    }
  }, [formData.template_type, formData.site, formData.contributors, sites, users]);

  const validateField = (name: string, value: any): string => {
    switch (name) {
      case 'template_type':
        return !value ? 'Template is required' : '';
      case 'site':
        return !value ? 'Site is required' : '';
      case 'due_date':
        if (!value) return 'Due date is required';
        const dueDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dueDate < today ? 'Due date must be in the future' : '';
      case 'report_name':
        return !value.trim() ? 'Report name is required' : '';
      case 'contributors':
        return !value.length ? 'At least one contributor is required' : '';
      default:
        return '';
    }
  };

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, formData[name as keyof FormData]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const isFormValid = () => {
    const requiredFields = ['template_type', 'site', 'due_date', 'report_name', 'contributors'];
    const fieldErrors = requiredFields.map(field => validateField(field, formData[field as keyof FormData]));
    const hasErrors = fieldErrors.some(error => error !== '');
    
    return !hasErrors && requiredFields.every(field => 
      typeof formData[field as keyof FormData] === 'string' 
        ? (formData[field as keyof FormData] as string).trim() !== ''
        : (formData[field as keyof FormData] as any[]).length > 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      const allFields = ['template_type', 'site', 'due_date', 'report_name', 'contributors'];
      const newTouched = { ...touched };
      const newErrors = { ...errors };
      
      allFields.forEach(field => {
        newTouched[field] = true;
        newErrors[field] = validateField(field, formData[field as keyof FormData]);
      });
      
      setTouched(newTouched);
      setErrors(newErrors);
      return;
    }
    
    if (!reportId) {
      setError("Report ID is missing. Cannot update report.");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const updateData = {
        report_name: formData.report_name,
        site_id: formData.site, // Map site to site_id
        template_type: formData.template_type,
        due_date: formData.due_date,
        description: formData.description,
        notes: formData.notes,
        contributors: formData.contributors // QP should already be first from form initialization
      };
      
      console.log('Updating report with data:', updateData);
      
      await updateReport(reportId, updateData);
      
      navigate(`/report/${reportId}/edit`);
    } catch (err) {
      console.error('Error updating report:', err);
      setError(err instanceof Error ? err.message : 'Failed to update report');
    } finally {
      setSubmitting(false);
    }
  };

  const siteOptions: SiteOption[] = sites.map(site => ({
    id: site.id,
    text: site.name,
  }));

  // Find the QP from reportUsers
  const qpUser = useMemo(() => {
    return reportUsers.find(ru => ru.role === 'qp');
  }, [reportUsers]);

  const userOptions = useMemo(() => {
    // Filter out the QP from selectable options since they should always be selected
    return users
      .filter(u => u.id !== qpUser?.user_id) // Remove QP from selectable options
      .map(u => ({
        id: u.id,
        text: `${u.full_name || 'Unknown'}`,
        disabled: false
      }))
      .sort((a, b) => a.text.localeCompare(b.text));
  }, [users, qpUser]);

  const handleContributorsChange = useCallback((e: { selectedItems: UserOption[] }) => {
    console.log('MultiSelect onChange triggered:', {
      selectedItems: e.selectedItems.map(item => ({ id: item.id, text: item.text, disabled: item.disabled })),
      qpUserId: qpUser?.user_id
    });
    
    // Get the selected non-QP contributors
    let selectedIds = e.selectedItems.map(item => item.id);
    
    // Always ensure QP is first in the contributors list
    if (qpUser?.user_id) {
      selectedIds = [qpUser.user_id, ...selectedIds];
    }
    
    console.log('Final selectedIds with QP first:', selectedIds);
    handleChange('contributors', selectedIds);
  }, [handleChange, qpUser?.user_id]);

  const selectedContributors = useMemo(() => {
    console.log('Computing selectedContributors:', {
      contributorIds: formData.contributors,
      userOptionsLength: userOptions.length,
      userOptions: userOptions.map(u => ({ id: u.id, text: u.text })),
      qpUserId: qpUser?.user_id
    });
    
    const result = formData.contributors
      .map((id: string) => {
        // First check if it's the QP
        if (id === qpUser?.user_id) {
          const qpUserProfile = users.find(u => u.id === id);
          if (qpUserProfile) {
            return {
              id: qpUserProfile.id,
              text: `${qpUserProfile.full_name || 'Unknown'}`,
              disabled: true // Mark QP as disabled for display purposes
            };
          }
        }
        
        // Then check in userOptions for other contributors
        const option = userOptions.find((opt: UserOption) => opt.id === id);
        console.log(`Looking for contributor ${id}:`, option ? 'found in userOptions' : (id === qpUser?.user_id ? 'found as QP' : 'not found'));
        return option || null;
      })
      .filter((item: any) => item !== null);
      
    console.log('Final selectedContributors:', result);
    return result;
  }, [formData.contributors, userOptions, qpUser, users]);

  if (loading) {
    return (
      <AppLayout hideSidebar>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <Loading description="Loading report settings..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout hideSidebar>
      <Breadcrumb>
        <BreadcrumbItem href="/dashboard">Dashboard</BreadcrumbItem>
        <BreadcrumbItem href="/reports">Reports</BreadcrumbItem>
        <BreadcrumbItem href={`/report/${reportId}/view`}>View Report</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Edit Settings</BreadcrumbItem>
      </Breadcrumb>
      
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>
          Edit Report Settings
        </h1>
        <div className={styles.progressArea}>
          <ProgressIndicator currentIndex={0} spaceEqually>
            <ProgressStep label="Edit Settings" current />
            <ProgressStep label="Fill Report" secondaryLabel="In Progress" />
            <ProgressStep label="Preview Report" secondaryLabel="Not Started" />
          </ProgressIndicator>
        </div>
      </div>

      <div className={styles.formContainer}>
        <Form onSubmit={handleSubmit}>
          {error && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={error}
              hideCloseButton
              className={styles.notification}
            />
          )}

          <h2 className={styles.sectionTitle}>Report Context</h2>
          <p className={styles.sectionDescription}>
            Update the template, site, and due date for this report.
          </p>

          <div className={styles.formSection}>
            <div className={styles.formRow}>
              <Dropdown
                id="template_type"
                titleText="Template"
                label="Choose an option"
                items={templateOptions}
                itemToString={(item: TemplateOption | null) => item ? item.text : ''}
                selectedItem={selectedTemplate}
                onChange={(e: { selectedItem: TemplateOption | null }) => {
                  setSelectedTemplate(e.selectedItem);
                  handleChange('template_type', e.selectedItem?.id || '');
                }}
                invalid={touched.template_type && !!errors.template_type}
                invalidText={errors.template_type}
              />

              <Dropdown
                id="site"
                titleText="Site"
                label="Choose an option"
                items={siteOptions}
                itemToString={(item: SiteOption | null) => item ? item.text : ''}
                selectedItem={selectedSite}
                onChange={(e: { selectedItem: SiteOption | null }) => {
                  setSelectedSite(e.selectedItem);
                  handleChange('site', e.selectedItem?.id || '');
                }}
                invalid={touched.site && !!errors.site}
                invalidText={errors.site}
                disabled={siteOptions.length === 0}
              />
            </div>

            <div className={styles.formRow}>
              <DatePicker
                datePickerType="single"
                dateFormat="Y-m-d"
                onChange={() => {}}
              >
                <DatePickerInput
                  id="creation_date"
                  labelText="Creation Date"
                  placeholder="yyyy-mm-dd"
                  defaultValue={formData.creation_date}
                  disabled
                />
              </DatePicker>

              <DatePicker 
                datePickerType="single"
                dateFormat="d/m/Y"
                minDate={new Date().toISOString().split('T')[0]}
                onChange={dates => {
                  const date = Array.isArray(dates) ? dates[0] : dates;
                  if (date) {
                    const isoDate = date.toISOString().split('T')[0];
                    handleChange('due_date', isoDate);
                  }
                }}
              >
                <DatePickerInput
                  id="due_date"
                  labelText="Due Date"
                  placeholder="dd/mm/yyyy"
                  defaultValue={formData.due_date}
                  invalid={touched.due_date && !!errors.due_date}
                  invalidText={errors.due_date}
                />
              </DatePicker>
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.formRow}>
              <TextInput
                id="report_name"
                labelText="Report Name"
                value={formData.report_name}
                onChange={(e) => handleChange('report_name', e.target.value)}
                onBlur={() => handleBlur('report_name')}
                invalid={touched.report_name && !!errors.report_name}
                invalidText={errors.report_name}
                placeholder="Add a name to the report"
              />

              <div> 
                <MultiSelect
                  id="contributors"
                  titleText="Contributors"
                  label="Select additional contributors"
                  helperText="The QP is automatically included and cannot be removed"
                  items={userOptions}
                  itemToString={(item: UserOption | null) => item ? item.text : ''}
                  selectedItems={selectedContributors.filter(c => c && c.id !== qpUser?.user_id)}
                  onChange={handleContributorsChange}
                  invalid={touched.contributors && !!errors.contributors}
                  invalidText={errors.contributors}
                  disabled={userOptions.length === 0}
                  selectionFeedback="top-after-reopen"
                />
                
                <div className={styles.contributorsList}>
                  {selectedContributors.map(contributor => {
                    if (!contributor) return null;
                    
                    const reportUser = reportUsers.find(ru => ru.user_id === contributor.id);
                    const role = reportUser ? reportUser.role : 'editor';
                    
                    return (
                      <Tag 
                        key={contributor.id} 
                        type={contributor.id === user?.id ? 'blue' : 'gray'}
                        className={styles.contributorTag}
                      >
                        {contributor.text} ({role.toUpperCase()})
                      </Tag>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={styles.formRow}>
              <TextArea
                id="description"
                labelText="Description (Optional)"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Add a short description about the report..."
                maxCount={500}
              />

              <TextArea
                id="notes"
                labelText="Notes (Optional)"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Add any additional notes that might be required..."
                maxCount={500}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <Button
              kind="secondary"
              onClick={() => navigate(`/report/${reportId}/edit`)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid() || submitting}
              renderIcon={Save}
            >
              {submitting ? (
                <InlineLoading description="Saving..." status="active" />
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </Form>
      </div>
    </AppLayout>
  );
};

export default EditReportSettings; 
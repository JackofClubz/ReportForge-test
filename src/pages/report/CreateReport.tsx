import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form,
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
  BreadcrumbItem
} from '@carbon/react';
import { Save } from '@carbon/icons-react';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import { getSites, getUserProfiles, createReport } from '../../lib/services/reportService';
import { getReportContributors } from '../../lib/services/reportEditService';
import styles from '../../styles/pages/report/CreateReport.module.scss';
import { Site, UserProfile } from '../../types/supabase';

interface TemplateOption {
  id: string;
  text: string;
}

interface SiteOption {
  id: string;
  text: string;
}

interface UserOption {
  id: string;
  text: string;
}

// Template options for the report
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

interface FormErrors {
  [key: string]: string;
}

const CreateReport: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentOrgId } = useAuth();
  const { reportId } = useParams<{ reportId?: string }>();
  const [sites, setSites] = useState<Site[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [reportUsers, setReportUsers] = useState<{ user_id: string; role: string }[]>([]);
  const [reportUsersLoading, setReportUsersLoading] = useState(false);
  const [reportUsersError, setReportUsersError] = useState<string | null>(null);
  const [showNoSitesWarning, setShowNoSitesWarning] = useState(false);

  // Set default creation date to today
  const today = new Date();
  const formattedToday = today.toISOString().split('T')[0];

  // Initialize form state
  const [formData, setFormData] = useState<FormData>({
    template_type: '',
    site: '',
    creation_date: formattedToday,
    due_date: '',
    report_name: '',
    contributors: [],
    description: '',
    notes: '',
  });

  // Selected items state for dropdowns
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null);
  const [selectedSite, setSelectedSite] = useState<SiteOption | null>(null);

  // Load sites and users on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!currentOrgId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [sitesData, usersData] = await Promise.all([
          getSites(currentOrgId),
          getUserProfiles(currentOrgId),
        ]);
        setSites(sitesData);
        setUsers(usersData);
        
        // Check if no sites are available and show warning
        setShowNoSitesWarning(sitesData.length === 0);
        
        // Add current user to contributors by default - they must be the QP
        if (user?.id) {
          const currentUserProfile = usersData.find(u => u.id === user.id);
          if (currentUserProfile) {
            setFormData(prev => ({
              ...prev,
              contributors: [currentUserProfile.id]
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch form data:', error);
        setError('Failed to load form data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user?.id, currentOrgId]);

  // Update selected items when form data changes
  useEffect(() => {
    if (formData.template_type) {
      const template = templateOptions.find(t => t.id === formData.template_type);
      setSelectedTemplate(template || null);
    }
    
    if (formData.site) {
      const site = sites.find(s => s.id === formData.site);
      setSelectedSite(site ? { id: site.id, text: site.name } as SiteOption : null);
    }
  }, [formData.template_type, formData.site, sites]);

  // Fetch report users if editing an existing report
  useEffect(() => {
    if (!reportId) return;
    setReportUsersLoading(true);
    setReportUsersError(null);
    getReportContributors(reportId)
      .then((data) => {
        setReportUsers(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setReportUsersError('Failed to fetch report users');
        setReportUsers([]);
      })
      .finally(() => setReportUsersLoading(false));
  }, [reportId]);

  // Validate field value
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
        today.setHours(0, 0, 0, 0); // Reset time part for accurate date comparison
        return dueDate < today ? 'Due date must be in the future' : '';
      case 'report_name':
        return !value.trim() ? 'Report name is required' : '';
      case 'contributors':
        return !value.length ? 'At least one contributor is required' : '';
      default:
        return '';
    }
  };

  // Handle input change
  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  // Handle field blur for validation
  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, formData[name as keyof FormData]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  // Check if form is valid
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      // Touch all fields to show validation errors
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
    
    if (!currentOrgId) {
      setError("Organisation context not found. Cannot create report.");
      setSubmitting(false);
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      if (!user) throw new Error('User must be authenticated to create a report');

      // Ensure current user is always included and is the first contributor (QP)
      let contributors = [...formData.contributors];
      if (!contributors.includes(user.id)) {
        contributors = [user.id, ...contributors];
      } else {
        // Move current user to first position to make them the QP
        contributors = [user.id, ...contributors.filter(id => id !== user.id)];
      }
      
      const reportPayload = {
        template_type: formData.template_type,
        site: formData.site,
        report_name: formData.report_name,
        due_date: formData.due_date,
        description: formData.description || null,
        notes: formData.notes || null,
        contributors: contributors,
      };
      
      const report = await createReport(reportPayload, currentOrgId);
      
      navigate(`/report/${report.id}/edit`);
    } catch (err) {
      console.error('Error creating report:', err);
      setError(err instanceof Error ? err.message : 'Failed to create report');
    } finally {
      setSubmitting(false);
    }
  };

  // Get site name from ID
  const getSiteName = (siteId: string): string => {
    const site = sites.find(site => site.id === siteId);
    return site ? site.name : '';
  };

  // Get user profile from ID
  const getUserProfile = (userId: string): UserProfile | undefined => {
    return users.find(user => user.id === userId);
  };

  // Prepare site options for dropdown
  const siteOptions: SiteOption[] = sites.map(site => ({
    id: site.id,
    text: site.name,
  }));

  // Prepare user options for multiselect, disabling the current user (they're always included)
  const userOptions = useMemo(() => {
    return users.map(u => ({
      id: u.id,
      text: `${u.full_name || 'Unknown'}`,
      disabled: u.id === user?.id // Disable current user so they can't deselect themselves
    })).sort((a, b) => {
      if (a.disabled && !b.disabled) return -1; // Put disabled (current user) first
      if (!a.disabled && b.disabled) return 1;
      return a.text.localeCompare(b.text);
    });
  }, [users, user?.id]);

  // Get selected contributor options for display below and for the selectedItems prop
  const selectedContributors = useMemo(() => {
    return formData.contributors
      .map(id => {
        const option = userOptions.find(opt => opt.id === id);
        return option ? { id: option.id, text: option.text, disabled: option.disabled } : null;
      })
      .filter(item => item !== null);
  }, [formData.contributors, userOptions]);

  return (
    <AppLayout hideSidebar>
      <Breadcrumb>
        <BreadcrumbItem href="/dashboard">Dashboard</BreadcrumbItem>
        <BreadcrumbItem href="/reports">Reports</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Create Report</BreadcrumbItem>
      </Breadcrumb>
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>
          Create Report
        </h1>
        <div className={styles.progressArea}>
          <ProgressIndicator currentIndex={0} spaceEqually>
            <ProgressStep label="Create Report" current />
            <ProgressStep label="Fill Report" secondaryLabel="Not Started" />
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

          {showNoSitesWarning && (
            <div className={styles.noSitesContainer}>
              <InlineNotification
                kind="warning"
                title="No Sites Available"
                subtitle="You have no sites registered to your account. You need to create at least one site before you can create a report."
                hideCloseButton
                className={styles.notification}
              />
              <div className={styles.noSitesActions}>
                <Button
                  kind="primary"
                  size="sm"
                  onClick={() => navigate('/site/create')}
                >
                  Create Site
                </Button>
              </div>
            </div>
          )}

          <h2 className={styles.sectionTitle}>Report Details</h2>
          <p className={styles.sectionDescription}>
            Please choose a pre-existing template and site and make sure you include a Due date for the completion of the report.
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
                disabled={loading || siteOptions.length === 0}
              />
            </div>

            <div className={styles.formRow}>
              <DatePicker
                datePickerType="single"
                dateFormat="Y-m-d"
                onChange={() => {}} // Disabled, so no onChange handler needed
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
                  label="Select contributors"
                  items={userOptions}
                  itemToString={(item: UserOption | null) => item ? item.text : ''}
                  selectedItems={selectedContributors}
                  onChange={(e: { selectedItems: UserOption[] }) => {
                    const selectedIds = e.selectedItems.map(item => item.id);
                    handleChange('contributors', selectedIds);
                  }}
                  invalid={touched.contributors && !!errors.contributors}
                  invalidText={errors.contributors}
                  disabled={loading || userOptions.length === 0}
                />
                
                <div className={styles.contributorsList}>
                  {selectedContributors.map(contributor => {
                    let role: string;
                    
                    if (reportId) {
                      // Editing existing report - use actual roles from report_users
                      const reportUser = reportUsers.find(ru => ru.user_id === contributor.id);
                      role = reportUser ? reportUser.role : 'editor';
                    } else {
                      // Creating new report - assign roles based on logic
                      if (contributor.id === user?.id) {
                        role = 'qp'; // Current user is the QP
                      } else {
                        role = 'editor'; // Selected contributors are editors
                      }
                    }
                    
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
                placeholder="Add a short description of about the report..."
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
              onClick={() => navigate('/dashboard')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid() || submitting || showNoSitesWarning}
              renderIcon={Save}
            >
              {submitting ? (
                <InlineLoading description="Saving..." status="active" />
              ) : (
                'Save & Continue'
              )}
            </Button>
          </div>
        </Form>
      </div>
    </AppLayout>
  );
};

export default CreateReport; 
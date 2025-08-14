import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TextInput,
  Button,
  Form,
  Grid,
  Column,
  InlineNotification,
  TextArea,
  Stack
} from '@carbon/react';
import { Save } from '@carbon/icons-react';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import PageHeader from '../../components/layout/PageHeader';
import { supabase } from '../../lib/supabaseClient';
import { extractEmailDomain } from '../../lib/utils/org';
import styles from '../../styles/pages/organisation/AddOrgPage.module.scss';

interface AddOrgFormData {
  orgName: string;
  domain: string;
  orgAddress: string; // Optional
  userName: string; // For user_profiles.full_name
}

interface FormErrors {
  orgName?: string;
  domain?: string;
  orgAddress?: string;
  userName?: string;
  form?: string; // For general form errors
}

const AddOrgPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState<AddOrgFormData>({
    orgName: '',
    domain: '',
    orgAddress: '',
    userName: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const pageTitle = 'Create New Organisation';
  const submitButtonText = 'Create Organisation';

  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({
        ...prev,
        domain: extractEmailDomain(user.email!),
        // Attempt to pre-fill userName from existing profile if available, or from email
        userName: user.user_metadata?.full_name || user.email?.split('@')[0] || ''
      }));
    }
  }, [user]);

  const validateField = (name: keyof AddOrgFormData, value: string): string => {
    switch (name) {
      case 'orgName':
        if (!value.trim()) return 'Organisation name is required.';
        if (value.length > 100) return 'Organisation name must be 100 characters or less.';
        return '';
      case 'domain':
        // Domain is auto-filled, but basic validation can be kept if it becomes editable
        if (value.trim() && !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
          return 'Invalid domain format (e.g., example.com).';
        }
        return '';
      case 'userName':
        if (!value.trim()) return 'Your name is required.';
        if (value.length > 100) return 'Your name must be 100 characters or less.';
        return '';
      case 'orgAddress':
         if (value.length > 255) return 'Address must be 255 characters or less.';
        return ''; // Optional field
      default:
        return '';
    }
  };

  const handleChange = (name: keyof AddOrgFormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (name: keyof AddOrgFormData) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, formData[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const isFormValid = () => {
    const currentErrors: FormErrors = {};
    let allValid = true;
    (Object.keys(formData) as Array<keyof AddOrgFormData>).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) {
        currentErrors[key] = error;
        allValid = false;
      }
    });
    // Ensure all required fields are touched for initial validation display if needed
    const allTouchedAndRequiredValid = ['orgName', 'userName'].every(key => {
      return formData[key as keyof AddOrgFormData].trim() && !currentErrors[key as keyof AddOrgFormData];
    });

    setErrors(currentErrors);
    return allValid && allTouchedAndRequiredValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched to show errors on first submit attempt
    const allTouched: { [key: string]: boolean } = {};
    (Object.keys(formData) as Array<keyof AddOrgFormData>).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    if (!isFormValid()) {
      setErrors(prev => ({ ...prev, form: 'Please correct the errors above.' }));
      return;
    }

    if (!user) {
      setErrors(prev => ({ ...prev, form: 'You must be logged in to create an organisation.' }));
      return;
    }

    setLoading(true);
    setErrors(prev => ({ ...prev, form: undefined }));

    try {
      // 1. Update user profile (full_name)
      const { error: profileUpdateError } = await supabase
        .from('user_profiles')
        .update({ full_name: formData.userName.trim() })
        .eq('id', user.id);

      if (profileUpdateError) {
        console.error('Error updating user profile:', profileUpdateError);
        throw new Error('Failed to update your profile information. Please try again.');
      }
      console.log('User profile updated successfully.');

      // 2. Create the organisation
      const { data: newOrg, error: orgInsertError } = await supabase
        .from('orgs')
        .insert({
          name: formData.orgName.trim(),
          domain: formData.domain.trim(),
          created_by: user.id,
          // orgAddress is not directly in orgs table per current schema. Store in metadata if needed or add column.
          // For now, it's collected but not saved to orgs table unless schema changes.
        })
        .select()
        .single();

      if (orgInsertError) {
        console.error('Error inserting organisation:', orgInsertError);
        throw new Error(orgInsertError.message || 'Failed to create the organisation.');
      }

      if (!newOrg) {
        throw new Error('Organisation creation did not return expected data.');
      }
      console.log('Organisation created successfully:', newOrg);

      // 3. Add user to the organisation as admin using Edge Function (bypasses RLS)
      const { data: orgUserData, error: orgUserInsertError } = await supabase.functions.invoke('complete-signup-helper', {
        body: {
          user_id: user.id,
          org_id: newOrg.id,
          role: 'admin'
        }
      });

      if (orgUserInsertError) {
        console.error('Error adding user to organisation via Edge Function:', orgUserInsertError);
        throw new Error(orgUserInsertError.message || 'Failed to assign your admin role in the new organisation.');
      }
      
      if (!orgUserData || orgUserData.error) {
        console.error('Edge Function returned error:', orgUserData?.error);
        throw new Error(orgUserData?.error || 'Failed to create admin membership.');
      }
      
      console.log('✅ User added to organisation as Admin:', orgUserData);

      // Force a page reload to refresh the auth context with new role and org ID
      // This ensures the user immediately has access to all admin features
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error('Failed to create organisation or associated records:', err);
      setErrors(prev => ({ ...prev, form: err.message || 'An unexpected error occurred.' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout pageTitle={pageTitle}>
      <Grid>
        <Column lg={8} md={6} sm={4}>
          <PageHeader title={pageTitle} />
          <p className={styles.description}>
            Create a new organisation to manage your sites and reports.
            Your email domain (<strong>{formData.domain || 'N/A'}</strong>) will be associated with this organisation.
          </p>

          {errors.form && (
            <div className={styles.formErrorNotification}>
              <InlineNotification
                kind="error"
                title="Error Creating Organisation"
                subtitle={errors.form}
                hideCloseButton
              />
            </div>
          )}

          <Form onSubmit={handleSubmit} className={styles.formContainer}>
            <Stack gap={7}>
              <TextInput
                id="orgName"
                name="orgName"
                labelText="Organisation Name"
                placeholder="Enter the organisation's name"
                value={formData.orgName}
                onChange={e => handleChange('orgName', e.target.value)}
                onBlur={() => handleBlur('orgName')}
                invalid={touched.orgName && !!errors.orgName}
                invalidText={errors.orgName}
                disabled={loading}
                required
              />

              <TextInput
                id="userName"
                name="userName"
                labelText="Your Full Name"
                placeholder="Enter your full name"
                value={formData.userName}
                onChange={e => handleChange('userName', e.target.value)}
                onBlur={() => handleBlur('userName')}
                invalid={touched.userName && !!errors.userName}
                invalidText={errors.userName}
                helperText="This name will be used in your user profile."
                disabled={loading}
                required
              />
              
              <TextInput
                id="domain"
                name="domain"
                labelText="Organisation Email Domain"
                value={formData.domain}
                // onChange={e => handleChange('domain', e.target.value)} // Usually not user-editable
                // onBlur={() => handleBlur('domain')}
                invalid={touched.domain && !!errors.domain}
                invalidText={errors.domain}
                helperText="This is automatically determined from your sign-up email."
                readOnly // Domain is typically not directly editable by user here
                disabled={loading}
              />

              <TextArea
                id="orgAddress"
                name="orgAddress"
                labelText="Organisation Address (Optional)"
                placeholder="Enter the organisation's physical address"
                value={formData.orgAddress}
                onChange={e => handleChange('orgAddress', e.target.value)}
                onBlur={() => handleBlur('orgAddress')}
                invalid={touched.orgAddress && !!errors.orgAddress}
                invalidText={errors.orgAddress}
                rows={3}
                disabled={loading}
              />

              <div>
                <p className="cds--label">Your Role in New Organisation</p>
                <p className={styles.roleDisplay}>Admin (Creator)</p>
                <p className={styles.roleDescription}>
                  As the organisation creator, you'll have full administrative access to manage users, sites, and reports.
                </p>
              </div>

              <div className={styles.formActions}>
                <Button
                  kind="secondary"
                  onClick={() => navigate(-1)} // Go back
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  renderIcon={Save}
                  disabled={loading || !formData.orgName.trim() || !formData.userName.trim()}
                >
                  {loading ? 'Creating...' : submitButtonText}
                </Button>
              </div>
            </Stack>
          </Form>
        </Column>
      </Grid>
    </AppLayout>
  );
};

export default AddOrgPage; 
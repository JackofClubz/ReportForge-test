import React, { useState } from 'react';
import {
  Grid,
  Column,
  Button,
  TextInput,
  InlineNotification,
  Form,
  Stack,
  PasswordInput,
} from '@carbon/react';
import { ArrowLeft, Password, Checkmark } from '@carbon/icons-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/pages/account/ChangePassword.module.scss';

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  form?: string;
}

const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const validatePassword = (password: string): string => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters long';
    if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
    if (!/(?=.*[@$!%*?&])/.test(password)) return 'Password must contain at least one special character (@$!%*?&)';
    return '';
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    const passwordError = validatePassword(formData.newPassword);
    if (passwordError) {
      newErrors.newPassword = passwordError;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      await updatePassword(formData.newPassword);
      setSuccess(true);
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      // Auto-redirect after successful change
      setTimeout(() => {
        navigate('/account/settings');
      }, 3000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      setErrors({
        form: error.message || 'Failed to change password. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/(?=.*[a-z])/.test(password)) score++;
    if (/(?=.*[A-Z])/.test(password)) score++;
    if (/(?=.*\d)/.test(password)) score++;
    if (/(?=.*[@$!%*?&])/.test(password)) score++;

    if (score < 2) return { strength: 'Weak', color: 'red' };
    if (score < 4) return { strength: 'Medium', color: 'yellow' };
    return { strength: 'Strong', color: 'green' };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  if (success) {
    return (
      <AppLayout pageTitle="Change Password">
        <Grid className={styles.container}>
          <Column lg={8} md={6} sm={4}>
            <div className={styles.successContainer}>
              <div className={styles.successIcon}>
                <Checkmark size={48} />
              </div>
              <h2 className={styles.successTitle}>Password Changed Successfully!</h2>
              <p className={styles.successMessage}>
                Your password has been updated. You will be redirected to account settings in a moment.
              </p>
              <Button
                kind="primary"
                onClick={() => navigate('/account/settings')}
              >
                Return to Account Settings
              </Button>
            </div>
          </Column>
        </Grid>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Change Password">
      <Grid className={styles.container}>
        <Column lg={8} md={6} sm={4}>
          <div className={styles.header}>
            <Button
              kind="ghost"
              renderIcon={ArrowLeft}
              onClick={() => navigate('/account/settings')}
              className={styles.backButton}
            >
              Back to Account Settings
            </Button>
            <h1 className={styles.title}>Change Password</h1>
            <p className={styles.description}>
              Create a strong password to keep your account secure. Your password should be unique and not used elsewhere.
            </p>
          </div>

          {errors.form && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={errors.form}
              className={styles.notification}
            />
          )}

          <Form onSubmit={handleSubmit} className={styles.form}>
            <Stack gap={6}>
              <PasswordInput
                id="currentPassword"
                labelText="Current Password"
                placeholder="Enter your current password"
                value={formData.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                invalid={!!errors.currentPassword}
                invalidText={errors.currentPassword}
                disabled={loading}
                required
              />

              <PasswordInput
                id="newPassword"
                labelText="New Password"
                placeholder="Enter your new password"
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                invalid={!!errors.newPassword}
                invalidText={errors.newPassword}
                disabled={loading}
                required
              />

              {formData.newPassword && (
                <div className={styles.passwordStrength}>
                  <span className={styles.strengthLabel}>Password Strength: </span>
                  <span className={`${styles.strengthValue} ${styles[passwordStrength.color]}`}>
                    {passwordStrength.strength}
                  </span>
                </div>
              )}

              <PasswordInput
                id="confirmPassword"
                labelText="Confirm New Password"
                placeholder="Confirm your new password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                invalid={!!errors.confirmPassword}
                invalidText={errors.confirmPassword}
                disabled={loading}
                required
              />

              <div className={styles.passwordRequirements}>
                <h4>Password Requirements:</h4>
                <ul>
                  <li className={formData.newPassword.length >= 8 ? styles.met : ''}>
                    At least 8 characters long
                  </li>
                  <li className={/(?=.*[a-z])/.test(formData.newPassword) ? styles.met : ''}>
                    One lowercase letter
                  </li>
                  <li className={/(?=.*[A-Z])/.test(formData.newPassword) ? styles.met : ''}>
                    One uppercase letter
                  </li>
                  <li className={/(?=.*\d)/.test(formData.newPassword) ? styles.met : ''}>
                    One number
                  </li>
                  <li className={/(?=.*[@$!%*?&])/.test(formData.newPassword) ? styles.met : ''}>
                    One special character (@$!%*?&)
                  </li>
                </ul>
              </div>

              <div className={styles.formActions}>
                <Button
                  kind="secondary"
                  onClick={() => navigate('/account/settings')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  kind="primary"
                  renderIcon={Password}
                  disabled={loading || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
                >
                  {loading ? 'Changing Password...' : 'Change Password'}
                </Button>
              </div>
            </Stack>
          </Form>
        </Column>
      </Grid>
    </AppLayout>
  );
};

export default ChangePassword; 
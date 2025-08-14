import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Form,
  TextInput,
  Button,
  Stack,
  Grid,
  Column,
  InlineNotification,
} from '@carbon/react';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/pages/auth/Auth.module.scss';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updatePassword, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if we have the required tokens in the URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const type = searchParams.get('type');

    console.log('🔍 [RESET] Checking tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });

    if (type === 'recovery' && accessToken && refreshToken) {
      setIsValidToken(true);
      console.log('✅ [RESET] Valid recovery tokens found');
    } else {
      setIsValidToken(false);
      setError('Invalid or expired reset link. Please request a new password reset.');
      console.log('❌ [RESET] Invalid or missing tokens');
    }
  }, [searchParams]);

  const validatePasswords = () => {
    if (!password.trim()) {
      return 'Password is required';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validatePasswords();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await updatePassword(password);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Password updated successfully. Please log in with your new password.' 
          } 
        });
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    }
  };

  // Show loading state while checking token validity
  if (isValidToken === null) {
    return (
      <div className={styles.authContainer}>
        <Grid>
          <Column sm={4} md={6} lg={8} xlg={6} max={6}>
            <div className={styles.formWrapper}>
              <h1 className="bx--type-productive-heading-04">Verifying reset link...</h1>
              <p className="bx--type-body-long-01">Please wait while we verify your password reset link.</p>
            </div>
          </Column>
        </Grid>
      </div>
    );
  }

  // Show error if token is invalid
  if (isValidToken === false) {
    return (
      <div className={styles.authContainer}>
        <Grid>
          <Column sm={4} md={6} lg={8} xlg={6} max={6}>
            <div className={styles.formWrapper}>
              <h1 className="bx--type-productive-heading-04">Invalid Reset Link</h1>
              
              <InlineNotification
                kind="error"
                title="Link Expired"
                subtitle={error || 'This password reset link is invalid or has expired.'}
                hideCloseButton
                className={styles.notification}
              />

              <p className="bx--type-body-long-01">
                Password reset links expire for security reasons. Please request a new password reset.
              </p>

              <Button
                kind="primary"
                className={styles.submitButton}
                onClick={() => navigate('/login')}
              >
                Back to Login
              </Button>
            </div>
          </Column>
        </Grid>
      </div>
    );
  }

  // Show success message
  if (success) {
    return (
      <div className={styles.authContainer}>
        <Grid>
          <Column sm={4} md={6} lg={8} xlg={6} max={6}>
            <div className={styles.formWrapper}>
              <h1 className="bx--type-productive-heading-04">Password Updated!</h1>
              
              <InlineNotification
                kind="success"
                title="Success"
                subtitle="Your password has been successfully updated."
                hideCloseButton
                className={styles.notification}
              />

              <p className="bx--type-body-long-01">
                You will be redirected to the login page shortly. You can now log in with your new password.
              </p>

              <Button
                kind="primary"
                className={styles.submitButton}
                onClick={() => navigate('/login')}
              >
                Go to Login
              </Button>
            </div>
          </Column>
        </Grid>
      </div>
    );
  }

  // Show password reset form
  return (
    <div className={styles.authContainer}>
      <Grid>
        <Column sm={4} md={6} lg={8} xlg={6} max={6}>
          <div className={styles.formWrapper}>
            <h1 className="bx--type-productive-heading-04">Reset Your Password</h1>
            <p className="bx--type-body-long-01">Enter your new password below</p>

            {error && (
              <InlineNotification
                kind="error"
                title="Error"
                subtitle={error}
                hideCloseButton
                className={styles.notification}
              />
            )}

            <Form onSubmit={handlePasswordReset}>
              <Stack gap={7}>
                <TextInput
                  id="password"
                  labelText="New Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  helperText="Password must be at least 8 characters long"
                  required
                />
                <TextInput
                  id="confirmPassword"
                  labelText="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <Button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isLoading || !password || !confirmPassword}
                >
                  {isLoading ? 'Updating Password...' : 'Update Password'}
                </Button>
              </Stack>
            </Form>

            <p className={styles.switchAuth}>
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--cds-link-primary)', 
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                Back to Login
              </button>
            </p>
          </div>
        </Column>
      </Grid>
    </div>
  );
};

export default ResetPassword; 
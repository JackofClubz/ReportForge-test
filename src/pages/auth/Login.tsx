import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Form,
  TextInput,
  Button,
  Stack,
  Grid,
  Column,
  InlineNotification,
  Modal,
} from '@carbon/react';
import { useAuth } from '../../contexts/AuthContext';
import { createManualResetLink, showDevResetInstructions, logSupabaseEmailStatus } from '../../utils/devEmailHelper';
import styles from '../../styles/pages/auth/Auth.module.scss';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const { signIn, resetPassword, isLoading, error } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check for success message from password reset
  const successMessage = location.state?.message;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(email, password);
      // Redirect to the page they tried to visit or dashboard
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from);
    } catch (err) {
      // Error is handled by AuthContext
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetEmailSent(false);
    
    if (!resetEmail.trim()) {
      setResetError('Please enter your email address');
      return;
    }

    // Log email configuration status
    logSupabaseEmailStatus();

    try {
      await resetPassword(resetEmail);
      setResetEmailSent(true);
      
      // In development, also provide manual reset link
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
          const manualResetLink = createManualResetLink(resetEmail);
          showDevResetInstructions(resetEmail, manualResetLink);
        }, 2000); // Show after success message
      }
      
    } catch (err) {
      console.error('Password reset failed:', err);
      setResetError(err instanceof Error ? err.message : 'Failed to send reset email');
      
      // In development, show manual reset option on error
      if (process.env.NODE_ENV === 'development') {
        const manualResetLink = createManualResetLink(resetEmail);
        showDevResetInstructions(resetEmail, manualResetLink);
      }
    }
  };

  const handleCloseForgotPasswordModal = () => {
    setShowForgotPasswordModal(false);
    setResetEmail('');
    setResetEmailSent(false);
    setResetError(null);
  };

  const handleOpenForgotPasswordModal = () => {
    setShowForgotPasswordModal(true);
    setResetEmail(email); // Pre-fill with login email if available
  };

  return (
    <div className={styles.authContainer}>
      <Grid>
        <Column sm={4} md={6} lg={8} xlg={6} max={6}>
          <div className={styles.formWrapper}>
            <h1 className="bx--type-productive-heading-04">Welcome to ReportForge</h1>
            <p className="bx--type-body-long-01">Sign in to continue</p>

            {successMessage && (
              <InlineNotification
                kind="success"
                title="Success"
                subtitle={successMessage}
                hideCloseButton
                className={styles.notification}
              />
            )}

            {error && (
              <InlineNotification
                kind="error"
                title="Error"
                subtitle={error}
                hideCloseButton
                className={styles.notification}
              />
            )}

            <Form onSubmit={handleLogin}>
              <Stack gap={7}>
                <TextInput
                  id="email"
                  labelText="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <TextInput
                  id="password"
                  labelText="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </Stack>
            </Form>

            <div className={styles.authLinks}>
              <button
                type="button"
                className={styles.forgotPasswordLink}
                onClick={handleOpenForgotPasswordModal}
              >
                Forgot your password?
              </button>
            </div>

            <p className={styles.switchAuth}>
              Don't have an account?{' '}
              <Link to="/signup">Create one</Link>
            </p>
          </div>
        </Column>
      </Grid>

      {/* Forgot Password Modal */}
      <Modal
        open={showForgotPasswordModal}
        onRequestClose={handleCloseForgotPasswordModal}
        modalHeading="Reset your password"
        modalLabel="Password Reset"
        primaryButtonText={resetEmailSent ? "Done" : "Send reset email"}
        secondaryButtonText="Cancel"
        onRequestSubmit={resetEmailSent ? handleCloseForgotPasswordModal : handleForgotPassword}
        onSecondarySubmit={handleCloseForgotPasswordModal}
        primaryButtonDisabled={isLoading || (!resetEmail.trim() && !resetEmailSent)}
      >
        {resetEmailSent ? (
          <div>
            <p>
              We've sent a password reset link to <strong>{resetEmail}</strong>.
            </p>
            <p>
              Please check your email and click the link to reset your password.
              If you don't see the email, check your spam folder.
            </p>
          </div>
        ) : (
          <Form onSubmit={handleForgotPassword}>
            <p style={{ marginBottom: '1rem' }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            {resetError && (
              <InlineNotification
                kind="error"
                title="Error"
                subtitle={resetError}
                hideCloseButton
                style={{ marginBottom: '1rem' }}
              />
            )}
            
            <TextInput
              id="resetEmail"
              labelText="Email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="Enter your email address"
              required
            />
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default Login; 
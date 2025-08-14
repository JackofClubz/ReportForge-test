import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import {
  Form,
  TextInput,
  Button,
  Stack,
  Grid,
  Column,
  InlineNotification,
  RadioButtonGroup,
  RadioButton,
} from '@carbon/react';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/pages/auth/Auth.module.scss';
import { extractEmailDomain } from '../../lib/utils/org';
import { supabase } from '../../lib/supabaseClient';

const Signup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [orgChoice, setOrgChoice] = useState<'join' | 'create' | ''>('');
  const [showOrgStep, setShowOrgStep] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);

  const { signUp, isLoading, error: authError } = useAuth();
  const navigate = useNavigate();

  const handleInitialSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgError(null);
    if (!email.includes('@')) {
      setOrgError("Please enter a valid email address.");
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setOrgError("First name and last name are required.");
      return;
    }
    setShowOrgStep(true);
  };

  const handleOrgChoiceSubmit = async (signedUpUser: User) => {
    if (!signedUpUser) {
      setOrgError("User information was not available to process organisation choice. Please try again.");
      return;
    }

    if (orgChoice === 'join') {
      const domain = extractEmailDomain(signedUpUser.email || email);
      try {
        const { data: org, error: orgFetchError } = await supabase
          .from('orgs')
          .select('id, name')
          .eq('domain', domain)
          .single();

        if (orgFetchError && orgFetchError.code !== 'PGRST116') {
          throw orgFetchError;
        }

        if (org) {
          console.log('Organisation found:', org, 'for user:', signedUpUser.id);
          const { error: insertError } = await supabase
            .from('org_users')
            .insert({
              user_id: signedUpUser.id,
              org_id: org.id,
              role: 'pending',
            });

          if (insertError) {
            console.error('Error adding user to organisation with pending status:', insertError);
            setOrgError(`Could not submit request to join ${org.name}. ${insertError.message}`);
            return;
          }
          console.log(`User ${signedUpUser.id} added to org ${org.id} with pending status.`);
          navigate('/dashboard', { state: { pendingApprovalOrgName: org.name } });
        } else {
          console.log(`No organisation found for domain "${domain}". User will be redirected to create organisation page.`);
          navigate('/organisation/add');
        }
      } catch (err: any) {
        console.error('Error during organisation check process (client-side):', err);
        setOrgError(err.message || 'An unexpected error occurred while checking for an organisation.');
      }
    } else if (orgChoice === 'create') {
      navigate('/organisation/add');
    }
  };

  const handleFinalSignup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setOrgError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setOrgError("First name and last name are required.");
      setShowOrgStep(false);
      return;
    }

    try {
      const newlySignedUpUser = await signUp(email, password, firstName, lastName);
      
      await handleOrgChoiceSubmit(newlySignedUpUser);

    } catch (err: any) {
      console.error("Signup process error (handleFinalSignup):", err);
      if (!authError) {
        setOrgError(err.message || "An error occurred during the signup process. Please check the details and try again.");
      }
    }
  };

  return (
    <div className={styles.authContainer}>
      <Grid>
        <Column sm={4} md={6} lg={8} xlg={6} max={6}>
          <div className={styles.formWrapper}>
            <h1 className="bx--type-productive-heading-04">Create your account</h1>
            <p className="bx--type-body-long-01">Join ReportForge to start creating reports</p>

            {authError && !showOrgStep && (
              <InlineNotification
                kind="error"
                title="Authentication Error"
                subtitle={authError}
                hideCloseButton
                className={styles.notification}
              />
            )}
            {orgError && (
              <InlineNotification
                kind="error"
                title="Organisation Error"
                subtitle={orgError}
                hideCloseButton
                className={styles.notification}
              />
            )}

            {!showOrgStep ? (
              <Form onSubmit={handleInitialSignup}>
                <Stack gap={7}>
                  <TextInput
                    id="firstName"
                    labelText="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                  <TextInput
                    id="lastName"
                    labelText="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
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
                    {isLoading ? 'Processing...' : 'Continue'}
                  </Button>
                </Stack>
              </Form>
            ) : (
              <Form onSubmit={(e) => { e.preventDefault(); handleFinalSignup(); }}>
                <Stack gap={7}>
                  <p>Your email: <strong>{email}</strong></p>
                  <RadioButtonGroup
                    legendText="Would you like to join an existing organisation or create a new one?"
                    name="org-choice"
                    valueSelected={orgChoice}
                    onChange={(value) => setOrgChoice(value as 'join' | 'create')}
                    orientation="vertical"
                  >
                    <RadioButton labelText="Join an existing organisation (based on your email domain)" value="join" id="join-org" />
                    <RadioButton labelText="Create a new organisation" value="create" id="create-org" />
                  </RadioButtonGroup>
                  <Button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isLoading || !orgChoice}
                  >
                    {isLoading ? 'Processing...' : 'Complete Sign Up'}
                  </Button>
                </Stack>
              </Form>
            )}

            <p className={styles.switchAuth}>
              Already have an account?{' '}
              <Link to="/login">Sign in</Link>
            </p>
          </div>
        </Column>
      </Grid>
    </div>
  );
};

export default Signup; 
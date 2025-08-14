console.log('[CompleteSignup] File loaded');

import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

const CompleteSignup: React.FC = () => {
  console.log('[CompleteSignup] Component function called - IMMEDIATE');
  
  try {
    console.log('[CompleteSignup] Component rendering');
    
    // Extract URL parameters
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const urlOrgId = searchParams.get('org_id');
    const urlEmail = searchParams.get('email');
    
    // Check for error parameters in URL hash
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const urlError = hashParams.get('error');
    const urlErrorCode = hashParams.get('error_code');
    const urlErrorDescription = hashParams.get('error_description');
    
    // Get auth context
    const { user } = useAuth();
    console.log('[CompleteSignup] Auth user:', user);
    
    // State variables
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [orgDetails, setOrgDetails] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isJoining, setIsJoining] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState<string | null>(null);
    
    // Determine org_id from URL or user metadata
    const orgId = urlOrgId || user?.user_metadata?.org_id;
    const email = urlEmail || user?.email;
    const initialRole = user?.user_metadata?.initial_role || 'viewer';
    
    console.log('[CompleteSignup] URL params:', { urlOrgId, urlEmail });
    console.log('[CompleteSignup] URL errors:', { urlError, urlErrorCode, urlErrorDescription });
    console.log('[CompleteSignup] Resolved params:', { orgId, email });
    console.log('[CompleteSignup] User metadata:', user?.user_metadata);
    console.log('[CompleteSignup] Initial role:', initialRole);
    console.log('[CompleteSignup] State:', { currentUser, orgDetails, isLoading, error });
    
    // Effect to check auth state and fetch org details
    useEffect(() => {
      console.log('[CompleteSignup] useEffect running');
      
      // Check for URL errors first
      if (urlError || urlErrorCode) {
        console.log('[CompleteSignup] URL error detected:', { urlError, urlErrorCode, urlErrorDescription });
        
        if (urlErrorCode === 'otp_expired') {
          setError('This invitation link has expired. Please request a new invitation from your organization administrator.');
        } else if (urlError === 'access_denied') {
          setError(urlErrorDescription || 'Access denied. Please check your invitation link.');
        } else {
          setError(urlErrorDescription || 'An error occurred with your invitation link.');
        }
        setIsLoading(false);
        return;
      }
      
      // If no user is authenticated yet, wait for auth
      if (!user) {
        console.log('[CompleteSignup] Waiting for authentication...');
        // Don't set error yet, auth might still be loading
        return;
      }
      
      console.log('[CompleteSignup] useEffect - orgId:', orgId);
      console.log('[CompleteSignup] useEffect - email:', email);
      console.log('[CompleteSignup] useEffect - user:', user);
      
      const checkAuthAndFetchOrg = async () => {
        try {
          console.log('[CompleteSignup] checkAuthAndFetchOrg - Starting');
          
          // Check authentication
          if (user) {
            console.log('[CompleteSignup] checkAuthAndFetchOrg - Using user from AuthContext:', user);
            setCurrentUser(user);
          } else {
            console.log('[CompleteSignup] checkAuthAndFetchOrg - No user in AuthContext');
            setError('Not authenticated. Please log in first.');
            setIsLoading(false);
            return;
          }
          
          // Check if user is already a member of this organization
          if (orgId && user) {
            const { data: existingMembership, error: membershipError } = await supabase
              .from('org_users')
              .select('id, role')
              .eq('org_id', orgId)
              .eq('user_id', user.id)
              .single();
            
            if (membershipError) {
              console.error('[CompleteSignup] Error checking existing membership:', membershipError);
            }

            if (existingMembership && !membershipError) {
              console.log('[CompleteSignup] User is already a member of this organization');
              // Redirect to dashboard since they're already a member
              navigate('/dashboard');
              return;
            }
          }
          
          // Fetch organization details if orgId is available
          if (orgId) {
            console.log('[CompleteSignup] checkAuthAndFetchOrg - Fetching org details for:', orgId);
            
            try {
              const { data: orgData, error: orgError } = await supabase
                .from('orgs')
                .select('id, name')
                .eq('id', orgId)
                .single();
              
              console.log('[CompleteSignup] checkAuthAndFetchOrg - Org query result:', { orgData, orgError });
              
              if (orgError) {
                console.error('[CompleteSignup] checkAuthAndFetchOrg - Error fetching org:', orgError);
                setError('Organization not found or invalid invitation link.');
              } else if (orgData) {
                console.log('[CompleteSignup] checkAuthAndFetchOrg - Setting org details:', orgData);
                setOrgDetails(orgData);
              }
            } catch (orgFetchError) {
              console.error('[CompleteSignup] checkAuthAndFetchOrg - Unexpected error fetching org:', orgFetchError);
              setError('Error fetching organization details.');
            }
          } else {
            console.log('[CompleteSignup] checkAuthAndFetchOrg - No orgId available');
            setError('No organization ID found. This invitation link may be invalid.');
          }
          
          setIsLoading(false);
          console.log('[CompleteSignup] checkAuthAndFetchOrg - Completed');
          
        } catch (err) {
          console.error('[CompleteSignup] checkAuthAndFetchOrg - Unexpected error:', err);
          setError('An unexpected error occurred. Please try again.');
          setIsLoading(false);
        }
      };
      
      checkAuthAndFetchOrg();
    }, [orgId, email, urlError, urlErrorCode, user?.id, navigate]);
    
    const handleJoinOrganization = async () => {
      if (!orgId || !currentUser || isJoining) return;
      
      // Validate password if user needs to set one
      if (password || confirmPassword) {
        if (!password || !confirmPassword) {
          setPasswordError('Please enter password in both fields');
          return;
        }
        if (password !== confirmPassword) {
          setPasswordError('Passwords do not match');
          return;
        }
        if (password.length < 6) {
          setPasswordError('Password must be at least 6 characters');
          return;
        }
      }
      
      setIsJoining(true);
      setError(null);
      setPasswordError(null);
      
      try {
        // If password is provided, update it first
        if (password) {
          console.log('[CompleteSignup] Updating user password');
          const { error: passwordUpdateError } = await supabase.auth.updateUser({
            password: password
          });
          
          if (passwordUpdateError) {
            console.error('[CompleteSignup] Error setting password:', passwordUpdateError);
            // Use passwordUpdateError specifically for the setError message
            setError(`Failed to set password: ${passwordUpdateError.message}`);
            setIsJoining(false);
            return;
          }
          console.log('[CompleteSignup] Password set successfully');
        }
        
        console.log('[CompleteSignup] Calling complete-signup-helper Edge Function with:', { user_id: currentUser.id, org_id: orgId, role: initialRole });

        // Call the Edge Function to add user to organization
        const { data: functionData, error: functionError } = await supabase.functions.invoke('complete-signup-helper', {
          body: {
            user_id: currentUser.id,
            org_id: orgId,
            role: initialRole
          }
        });

        if (functionError) {
          console.error('[CompleteSignup] Error invoking complete-signup-helper function:', functionError);
          let errMsg = functionError.message;
          try {
              const parsed = JSON.parse(functionError.message);
              if (parsed && parsed.error) errMsg = parsed.error;
          } catch (e) { /* ignore parsing error, use original message */ }
          setError(`Failed to join organization: ${errMsg}`);
          setIsJoining(false);
          return;
        }
        
        console.log('[CompleteSignup] Successfully called complete-signup-helper, data:', functionData);
        
        // Navigate to dashboard
        navigate('/dashboard');
        
      } catch (err: any) {
        console.error('[CompleteSignup] Unexpected error joining organization:', err);
        setError('An unexpected error occurred while joining the organization.');
        setIsJoining(false);
      }
    };
    
    // Determine if we're ready to show the join button
    const canJoin = !isLoading && !error && orgDetails && currentUser;
    
    // Check if we're still waiting for auth
    const waitingForAuth = !user && !urlError && !urlErrorCode;
    
    return (
      <div style={{ 
        padding: '50px', 
        backgroundColor: isLoading || waitingForAuth ? 'lightyellow' : error ? 'lightpink' : 'lightgreen', 
        border: '5px solid black',
        maxWidth: '800px',
        margin: '20px auto'
      }}>
        <h1 style={{ color: 'black' }}>Complete Your Signup</h1>
        
        {waitingForAuth && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Checking authentication status...</p>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
              If you haven't signed up yet, please complete the signup process first.
            </p>
          </div>
        )}
        
        {isLoading && !waitingForAuth && <p>Loading invitation details...</p>}
        
        {error && (
          <div style={{ padding: '20px', backgroundColor: '#ffeeee', border: '2px solid red', borderRadius: '5px', marginBottom: '20px' }}>
            <h2 style={{ color: 'red' }}>Error</h2>
            <p style={{ color: 'darkred' }}>{error}</p>
          </div>
        )}
        
        {canJoin && orgDetails && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <h2>You've been invited to join:</h2>
            <h1 style={{ color: 'darkgreen', margin: '20px 0' }}>{orgDetails.name}</h1>
            
            <p style={{ marginBottom: '10px' }}>
              <strong>Your email:</strong> {currentUser.email}
            </p>
            <p style={{ marginBottom: '30px' }}>
              <strong>Your role:</strong> {initialRole.charAt(0).toUpperCase() + initialRole.slice(1)}
            </p>
            
            <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
              <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>Set Your Password</h3>
              
              {passwordError && (
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: '#ffe6e6', 
                  border: '1px solid #ff0000', 
                  borderRadius: '5px', 
                  marginBottom: '20px',
                  color: '#cc0000'
                }}>
                  {passwordError}
                </div>
              )}
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '16px',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '16px',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
            
            <button
              onClick={handleJoinOrganization}
              disabled={isJoining || !password || !confirmPassword}
              style={{
                backgroundColor: isJoining || !password || !confirmPassword ? '#cccccc' : '#4CAF50',
                color: 'white',
                padding: '15px 30px',
                fontSize: '18px',
                border: 'none',
                borderRadius: '5px',
                cursor: isJoining || !password || !confirmPassword ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                marginTop: '10px'
              }}
            >
              {isJoining ? 'Setting up account...' : 'Set Password & Join Organization'}
            </button>
          </div>
        )}
        
        {/* Debug info - remove in production */}
        <details style={{ marginTop: '50px', fontSize: '12px', color: '#666' }}>
          <summary>Debug Information</summary>
          <pre>{JSON.stringify({
            urlParams: { urlOrgId, urlEmail },
            urlErrors: { urlError, urlErrorCode, urlErrorDescription },
            resolvedParams: { orgId, email, initialRole },
            userMetadata: user?.user_metadata,
            state: { currentUser: currentUser?.email, orgDetails: orgDetails?.name, isLoading, error }
          }, null, 2)}</pre>
        </details>
      </div>
    );
  } catch (error) {
    console.error('[CompleteSignup] Error in component:', error);
    return (
      <div style={{ padding: '50px', backgroundColor: 'lightpink', border: '5px solid red', maxWidth: '800px', margin: '20px auto' }}>
        <h1 style={{ color: 'red' }}>Error</h1>
        <p style={{ color: 'darkred' }}>An error occurred. Please try again later.</p>
      </div>
    );
  }
};

export default CompleteSignup; 
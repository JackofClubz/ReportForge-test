import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<User>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  clearAuthState: () => void;
  error: string | null;
  userRole: string | null;
  currentOrgId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Add localStorage persistence
const STORAGE_KEYS = {
  USER_ROLE: 'reportforge_user_role',
  ORG_ID: 'reportforge_org_id',
  USER_DATA: 'reportforge_user_data'
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage if available
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isInitializedRef = useRef(false);
  const [userRole, setUserRole] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.USER_ROLE);
    } catch {
      return null;
    }
  });
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.ORG_ID);
    } catch {
      return null;
    }
  });
  const navigate = useNavigate();

  // Persist to localStorage when values change
  useEffect(() => {
    try {
      if (userRole) {
        localStorage.setItem(STORAGE_KEYS.USER_ROLE, userRole);
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
      }
    } catch (error) {
      console.warn('Failed to persist user role:', error);
    }
  }, [userRole]);

  useEffect(() => {
    try {
      if (currentOrgId) {
        localStorage.setItem(STORAGE_KEYS.ORG_ID, currentOrgId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ORG_ID);
      }
    } catch (error) {
      console.warn('Failed to persist org ID:', error);
    }
  }, [currentOrgId]);

  const fetchUserRoleAndOrg = async (userId: string | undefined) => {
    if (!userId) {
      setUserRole(null);
      setCurrentOrgId(null);
      return;
    }
    try {
      const { data, error: roleError } = await supabase
        .from('org_users')
        .select('role, org_id')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error fetching user role and org_id:', roleError);
        setUserRole(null);
        setCurrentOrgId(null);
        return;
      }
      
      setUserRole(data?.role || null);
      setCurrentOrgId(data?.org_id || null);
    } catch (e) {
      console.error('Exception fetching user role and org_id:', e);
      setUserRole(null);
      setCurrentOrgId(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    let authCleanup: (() => void) | null = null;

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(currentSession);
          const currentUser = currentSession?.user ?? null;
          setUser(currentUser);
          
          if (currentUser) {
            await fetchUserRoleAndOrg(currentUser.id);
          } else {
            // Clear stale localStorage data if no user session exists
            console.log('🧹 [AUTH] No user session found, clearing stale localStorage data');
            setUserRole(null);
            setCurrentOrgId(null);
            try {
              localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
              localStorage.removeItem(STORAGE_KEYS.ORG_ID);
              localStorage.removeItem(STORAGE_KEYS.USER_DATA);
            } catch (error) {
              console.warn('Failed to clear localStorage:', error);
            }
          }
          
          setIsInitialized(true);
          isInitializedRef.current = true;
          setIsLoading(false);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
          console.log('🔄 [AUTH] Auth state change event:', { event: _event, userEmail: newSession?.user?.email });
          if (mounted) {
            // Skip redundant processing if already initialized and this is just a duplicate event
            if (isInitializedRef.current && _event === 'SIGNED_IN' && newSession?.user?.id === user?.id) {
              console.log('🔄 [AUTH] Skipping duplicate SIGNED_IN event for same user');
              return;
            }
            
            setSession(newSession);
            const eventUser = newSession?.user ?? null;
            setUser(eventUser);
            if (eventUser) {
              console.log('👤 [AUTH] User found in session, fetching role and org') ;
              await fetchUserRoleAndOrg(eventUser.id);
            } else {
              console.log('🚫 [AUTH] No user in session, clearing role and org');
              setUserRole(null);
              setCurrentOrgId(null);
              // Clear localStorage when user signs out or session is invalid
              try {
                localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
                localStorage.removeItem(STORAGE_KEYS.ORG_ID);
                localStorage.removeItem(STORAGE_KEYS.USER_DATA);
              } catch (error) {
                console.warn('Failed to clear localStorage on auth state change:', error);
              }
            }
            if (_event === 'INITIAL_SESSION' || _event === 'SIGNED_IN' || _event === 'SIGNED_OUT') {
                setIsLoading(false);
            }
          }
        });

        authCleanup = () => {
          subscription?.unsubscribe();
        };
      } catch (err) {
        console.error('Error initializing auth:', err);
        if (mounted) {
          setError('Failed to initialize authentication');
          setIsLoading(false);
          setIsInitialized(true);
          isInitializedRef.current = true;
        }
      }
    };

    // Add a safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (mounted && !isInitializedRef.current) {
        console.warn('Auth initialization timeout - forcing initialization');
        setIsInitialized(true);
        isInitializedRef.current = true;
        setIsLoading(false);
      }
    }, 5000);

    initializeAuth();

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      authCleanup?.();
    };
  }, []); // Removed isInitialized from dependency array to prevent infinite loop

  useEffect(() => {
    console.log('🔐 Auth state:', { 
      user: user?.email, 
      isLoading, 
      isInitialized,
      userRole,
      currentOrgId 
    });
  }, [user, isLoading, isInitialized, userRole, currentOrgId]);

  const signUp = async (email: string, password: string, firstName: string, lastName: string): Promise<User> => {
    if (!isInitialized) {
      throw new Error('Authentication is not initialized yet. Please wait a moment and try again.');
    }

    try {
      setIsLoading(true);
      setError(null);
      const fullName = `${firstName} ${lastName}`.trim();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: fullName,
            // You can add other metadata here if needed
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.user) {
        setUser(data.user);
        if (data.session) {
          setSession(data.session);
        }
        return data.user;
      } else {
        throw new Error("Sign up process completed, but no user data was returned.");
      }
    } catch (error) {
      const typedError = error as Error;
      setError(typedError.message || 'An error occurred during sign up.');
      throw typedError;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isInitialized) {
      throw new Error('Authentication is not initialized yet');
    }

    try {
      setIsLoading(true);
      setError(null);
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (signInData.user) {
        await fetchUserRoleAndOrg(signInData.user.id);
        navigate('/dashboard');
      } else {
         throw new Error("Sign in did not return user data.");
      }
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred during sign in');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    if (!isInitialized) {
      throw new Error('Authentication is not initialized yet');
    }
    try {
      setIsLoading(true);
      setError(null);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      
      // Clear state and localStorage
      setUserRole(null);
      setCurrentOrgId(null);
      
      // Clear all stored data
      try {
        localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
        localStorage.removeItem(STORAGE_KEYS.ORG_ID);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      } catch (error) {
        console.warn('Failed to clear localStorage:', error);
      }
      
      navigate('/login');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred during sign out');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    if (!isInitialized) {
      throw new Error('Authentication is not initialized yet');
    }
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 [AUTH] Attempting to send password reset email to:', email);
      console.log('🔗 [AUTH] Redirect URL:', `${window.location.origin}/auth/reset-password`);
      
      const { error: resetError, data } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      console.log('📧 [AUTH] Reset password response:', { error: resetError, data });
      
      if (resetError) {
        console.error('❌ [AUTH] Reset password error:', resetError);
        throw resetError;
      }
      
      console.log('✅ [AUTH] Password reset email request successful');
      
    } catch (error) {
      console.error('❌ [AUTH] Reset password failed:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while sending reset email');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (newPassword: string) => {
    if (!isInitialized) {
      throw new Error('Authentication is not initialized yet');
    }
    try {
      setIsLoading(true);
      setError(null);
      
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) throw updateError;
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred while updating password');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuthState = () => {
    console.log('🧹 [AUTH] Manual auth state clear requested');
    setUser(null);
    setSession(null);
    setUserRole(null);
    setCurrentOrgId(null);
    setError(null);
    
    try {
      localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
      localStorage.removeItem(STORAGE_KEYS.ORG_ID);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      console.log('✅ [AUTH] LocalStorage cleared successfully');
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  };

  const value = {
    user,
    session,
    isLoading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    clearAuthState,
    error,
    userRole,
    currentOrgId,
  };

  if (!isInitialized && isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#333',
        gap: '10px'
      }}>
        <div>Loading authentication...</div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          If this takes more than 5 seconds, check your network connection
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 
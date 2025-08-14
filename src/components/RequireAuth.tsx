import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions, ORG_ROLES } from '../hooks/usePermissions';
import { Loading } from '@carbon/react';
import styles from '../styles/components/RequireAuth.module.scss';

interface RequireAuthProps {
  children: React.ReactNode;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { user, isLoading, currentOrgId } = useAuth();
  const { userRole, isRoleLoading } = usePermissions();
  const location = useLocation();

  console.log('🔒 RequireAuth state:', { 
    user: user?.email, 
    isLoading, 
    isRoleLoading,
    userRole,
    currentOrgId,
    pathname: location.pathname 
  });

  if (isLoading || isRoleLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loading
          description="Loading session..."
          withOverlay={false}
          small={false}
        />
      </div>
    );
  }

  if (user && currentOrgId && userRole === ORG_ROLES.PENDING) {
    if (location.pathname !== '/pending-approval') {
      return <Navigate to="/pending-approval" replace />;
    }
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default RequireAuth; 
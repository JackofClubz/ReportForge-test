import React, { ReactNode } from 'react';
import { Header, HeaderGlobalBar, HeaderName } from '@carbon/react';
import { Logout } from '@carbon/icons-react';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../../assets/Geognosis_Logo_Geognosis ReportForge Logo 2.svg';
import SideNavigation from '../layout/SideNavigation';
import PageHeader from './PageHeader';
import styles from '../../styles/components/layout/AppLayout.module.scss';
import headerStyles from '../../styles/components/layout/Header.module.scss';

interface AppLayoutProps {
  children: ReactNode;
  hideSidebar?: boolean;
  pageTitle?: string;
  pageHeaderActions?: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  hideSidebar = false,
  pageTitle,
  pageHeaderActions,
}) => {
  const { signOut, isLoading } = useAuth();

  const handleLogout = async () => {
    try {
      console.log('🚪 [LOGOUT] User clicked logout button');
      await signOut();
      console.log('✅ [LOGOUT] Successfully signed out');
    } catch (error) {
      console.error('❌ [LOGOUT] Error signing out:', error);
      // If AuthContext signOut fails, try direct logout as fallback
      try {
        console.log('🔄 [LOGOUT] Attempting fallback logout...');
        const { supabase } = await import('../../lib/supabaseClient');
        await supabase.auth.signOut();
        window.location.href = '/login'; // Force redirect
      } catch (fallbackError) {
        console.error('❌ [LOGOUT] Fallback logout also failed:', fallbackError);
        // Last resort - clear storage and redirect
        localStorage.clear();
        window.location.href = '/login';
      }
    }
  };

  return (
    <div className={styles.appContainer}>
      {/* Header */}
      <Header aria-label="Geognosis ReportForge" className={headerStyles.header}>
        <HeaderName 
          prefix="" 
          className={headerStyles.logoContainer}
          href="/dashboard"
        >
          <img src={Logo} className={headerStyles.logo} alt="Geognosis ReportForge" />
        </HeaderName>
        <HeaderGlobalBar>
          <button 
            className={headerStyles.logoutButton} 
            onClick={handleLogout}
            disabled={isLoading}
          >
            {isLoading ? 'Signing out...' : 'Logout'}
            <Logout size={16} />
          </button>
        </HeaderGlobalBar>
      </Header>

      {/* SideNav - Conditionally render */}
      { !hideSidebar && <SideNavigation /> }

      {/* Main Content - Adjust class based on hideSidebar */}
      <main className={`${styles.mainContent} ${hideSidebar ? styles.mainContentFullWidth : ''}`}>
        {/* Conditionally render PageHeader */}
        {pageTitle && <PageHeader title={pageTitle} actions={pageHeaderActions} />}
        {/* Removed Grid and Column wrapping children */}
        {children}
      </main>
    </div>
  );
};

export default AppLayout; 
import React from 'react';
import { SideNav } from '@carbon/react';
import { 
  Thumbnail_2,
  Report,
  Gem,
  Help,
  Enterprise
} from '@carbon/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import UserAccountDropdown from './UserAccountDropdown';
import styles from '../../styles/components/layout/SideNavigation.module.scss';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

const mainNavItems: NavItem[] = [
  { icon: <Thumbnail_2 size={16} />, label: 'Dashboard', path: '/dashboard' },
  { icon: <Report size={16} />, label: 'Reports', path: '/reports' },
  { icon: <Gem size={16} />, label: "Sites", path: '/sites' }
];

const supportNavItems: NavItem[] = [
  { icon: <Enterprise size={16} />, label: 'Organisation', path: '/organisation' },
  { icon: <Help size={16} />, label: 'Contact support', path: '/support' }
];

const SideNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <SideNav 
      isFixedNav 
      expanded 
      aria-label="Side navigation"
      className={styles.sideNav}
      inert={undefined}
    >
    <div className={styles.navContent}>
      <div className={styles.userProfile}>
        <UserAccountDropdown />
      </div>

        <div className={styles.navGroup}>
        {mainNavItems.map((item) => (
            <div 
            key={item.path}
              className={classNames(styles.navItem, {
                [styles.active]: location.pathname === item.path
              })}
              role="button"
              tabIndex={0}
              onClick={() => handleNavClick(item.path)}
              onKeyDown={(e) => e.key === 'Enter' && handleNavClick(item.path)}
          >
              {item.icon}
              <span>{item.label}</span>
            </div>
        ))}
        </div>

      <div className={styles.navDivider} />

        <div className={styles.navGroup}>
          {supportNavItems.map((item) => (
            <div 
            key={item.path}
              className={styles.navItem}
              role="button"
              tabIndex={0}
              onClick={() => handleNavClick(item.path)}
              onKeyDown={(e) => e.key === 'Enter' && handleNavClick(item.path)}
          >
              {item.icon}
              <span>{item.label}</span>
            </div>
        ))}
        </div>
    </div>
    </SideNav>
  );
};

export default SideNavigation; 
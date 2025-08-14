import React, { useState, useRef, useEffect } from 'react';
import {
  OverflowMenu,
  OverflowMenuItem,
  SkeletonPlaceholder,
} from '@carbon/react';
import {
  UserAvatar,
  Settings,
  Password,
  Email,
  Enterprise,
  Money,
  TrashCan,
  Logout,
  ChevronDown
} from '@carbon/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import styles from '../../styles/components/layout/UserAccountDropdown.module.scss';

interface UserAccountDropdownProps {
  className?: string;
}

const UserAccountDropdown: React.FC<UserAccountDropdownProps> = ({ className }) => {
  const navigate = useNavigate();
  const { signOut, isLoading: authLoading, user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const menuItems = [
    {
      id: 'account-settings',
      label: 'Account Settings',
      icon: <Settings size={16} />,
      action: () => handleMenuClick('/account/settings'),
    },
    {
      id: 'change-password',
      label: 'Change Password',
      icon: <Password size={16} />,
      action: () => handleMenuClick('/account/change-password'),
    },
    {
      id: 'change-email',
      label: 'Change Email',
      icon: <Email size={16} />,
      action: () => handleMenuClick('/account/change-email'),
    },
    {
      id: 'change-organization',
      label: 'Switch Organization',
      icon: <Enterprise size={16} />,
      action: () => handleMenuClick('/account/change-organization'),
    },
    {
      id: 'plan',
      label: 'Plan & Billing',
      icon: <Money size={16} />,
      action: () => handleMenuClick('/account/plan'),
    },
    { type: 'divider' },
    {
      id: 'delete-account',
      label: 'Delete Account',
      icon: <TrashCan size={16} />,
      action: () => handleMenuClick('/account/delete'),
      danger: true,
    },
    {
      id: 'logout',
      label: 'Sign Out',
      icon: <Logout size={16} />,
      action: handleLogout,
    },
  ];

  return (
    <div className={`${styles.userDropdown} ${className || ''}`} ref={dropdownRef}>
      <button
        className={`${styles.userButton} ${isOpen ? styles.active : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <div className={styles.userInfo}>
          <UserAvatar size={32} className={styles.avatar} />
          <div className={styles.userDetails}>
            {profileLoading ? (
              <SkeletonPlaceholder className={styles.nameSkeleton} />
            ) : (
              <span className={styles.userName}>
                {profile?.full_name || 'Unknown User'}
              </span>
            )}
            <span className={styles.userEmail}>
              {user?.email || 'No email'}
            </span>
          </div>
        </div>
        <ChevronDown 
          size={16} 
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} 
        />
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu} role="menu">
          <div className={styles.menuHeader}>
            <div className={styles.menuUserInfo}>
              <UserAvatar size={40} className={styles.menuAvatar} />
              <div className={styles.menuUserDetails}>
                <span className={styles.menuUserName}>
                  {profile?.full_name || 'Unknown User'}
                </span>
                <span className={styles.menuUserEmail}>
                  {user?.email || 'No email'}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.menuItems}>
            {menuItems.map((item, index) => {
              if (item.type === 'divider') {
                return <div key={`divider-${index}`} className={styles.divider} />;
              }

              return (
                <button
                  key={item.id}
                  className={`${styles.menuItem} ${item.danger ? styles.danger : ''}`}
                  onClick={item.action}
                  role="menuitem"
                  disabled={authLoading}
                >
                  <span className={styles.menuIcon}>{item.icon}</span>
                  <span className={styles.menuLabel}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAccountDropdown; 
import React, { useState, useEffect } from 'react';
import { Tag, Loading } from '@carbon/react';
import { 
  UserMultiple,
  UserAvatar,
  CircleFilled,
  WarningFilled
} from '@carbon/icons-react';
import styles from '../../styles/components/report/CollaborationPresence.module.scss';
import { CollaborationUser } from '../../lib/services/userService';

interface CollaborationPresenceProps {
  reportId: string;
  currentUserId: string;
  isOnline: boolean;
}

const CollaborationPresence: React.FC<CollaborationPresenceProps> = ({ 
  reportId, 
  currentUserId, 
  isOnline 
}) => {
  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handlePresenceUpdate = (event: CustomEvent) => {
      if (event.detail.reportId === reportId) {
        const users = event.detail.users
          .map((state: any) => state.user)
          .filter((user: CollaborationUser) => user && user.id && user.id !== currentUserId);
        
        setActiveUsers(users);
        setIsLoading(false);
      }
    };

    const handleConnectionUpdate = (event: CustomEvent) => {
      if (event.detail.reportId === reportId) {
        // Connection status is handled by parent component
        setIsLoading(false);
      }
    };

    window.addEventListener('collaboration:presence', handlePresenceUpdate as EventListener);
    window.addEventListener('collaboration:connection', handleConnectionUpdate as EventListener);

    // Set initial loading to false after a short delay
    const timer = setTimeout(() => setIsLoading(false), 2000);

    return () => {
      window.removeEventListener('collaboration:presence', handlePresenceUpdate as EventListener);
      window.removeEventListener('collaboration:connection', handleConnectionUpdate as EventListener);
      clearTimeout(timer);
    };
  }, [reportId, currentUserId]);

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className={styles.presenceContainer}>
        <div className={styles.connectionStatus}>
          <Loading small />
          <span>Connecting...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.presenceContainer}>
      <div className={styles.connectionStatus}>
        {isOnline ? (
          <Tag type="green" size="sm" renderIcon={CircleFilled}>
            Online
          </Tag>
        ) : (
          <Tag type="red" size="sm" renderIcon={WarningFilled}>
            Offline
          </Tag>
        )}
      </div>

      {activeUsers.length > 0 && (
        <div className={styles.activeUsers}>
          <div className={styles.usersLabel}>
            <UserMultiple size={16} />
            <span>{activeUsers.length} collaborator{activeUsers.length !== 1 ? 's' : ''}</span>
          </div>
          
          <div className={styles.usersList}>
            {activeUsers.slice(0, 5).map((user) => (
              <div 
                key={user.id} 
                className={styles.userAvatar}
                title={`${user.name} (${user.email})`}
                style={{ borderColor: user.color }}
              >
                <div 
                  className={styles.avatarIcon}
                  style={{ backgroundColor: user.color }}
                >
                  <UserAvatar size={20} />
                </div>
                <div 
                  className={styles.userIndicator}
                  style={{ backgroundColor: user.color }}
                />
              </div>
            ))}
            
            {activeUsers.length > 5 && (
              <div className={styles.moreUsers}>
                +{activeUsers.length - 5}
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeUsers.length === 0 && isOnline && (
        <div className={styles.noCollaborators}>
          <UserAvatar size={16} />
          <span>Working alone</span>
        </div>
      )}
    </div>
  );
};

export default CollaborationPresence; 
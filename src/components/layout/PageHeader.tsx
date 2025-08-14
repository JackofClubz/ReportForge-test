import React, { ReactNode } from 'react';
import styles from '../../styles/components/layout/PageHeader.module.scss';

interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, actions }) => {
  return (
    <div className={styles.pageHeaderContainer}>
      <h2 className={`bx--type-expressive-heading-04 ${styles.pageTitle}`}>{title}</h2>
      {actions && <div className={styles.actionsContainer}>{actions}</div>}
    </div>
  );
};

export default PageHeader; 
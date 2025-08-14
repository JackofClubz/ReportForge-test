import React from 'react';
import styles from '../../styles/components/ui/Spacer.module.scss';

interface SpacerProps {
  className?: string;
}

const Spacer: React.FC<SpacerProps> = ({ className }) => {
  return (
    <div className={`${styles.spacer} ${className || ''}`} />
  );
};

export default Spacer;
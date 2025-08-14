import React from 'react';
import classNames from 'classnames';
import styles from '../../styles/pages/report/ReportEditor.module.scss';

interface Section {
  id: string;
  title: string;
  level: number;
  parent?: string;
  children?: Section[];
}

interface TableOfContentsProps {
  sections: Section[];
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
}

const TableOfContents: React.FC<TableOfContentsProps> = ({
  sections,
  activeSection,
  onSectionClick,
}) => {
  // Filter out level 3 sections when showing in TOC
  const topLevelSections = sections.filter(section => !section.parent);

  return (
    <div className={styles.tocPanel}>
      <div className={styles.tocHeader}>
        <h2>Table of Contents</h2>
      </div>
      <ul className={styles.tocList}>
        {topLevelSections.map((section, index) => {
          // Determine if this is a numbered section (skipping QP Certification and Disclaimer)
          const showNumber = section.id !== 'qp_certification' && section.id !== 'disclaimer';
          const sectionNumber = showNumber ? index + 1 : null;
          
          // Create class based on section level
          const itemClass = classNames(styles.tocItem, {
            [styles.active]: activeSection === section.id,
            [styles.level1]: section.level === 1,
            [styles.level2]: section.level === 2,
          });

          return (
            <li
              key={section.id}
              className={itemClass}
              onClick={() => onSectionClick(section.id)}
            >
              {showNumber && (
                <span className={styles.sectionNumber}>{sectionNumber}</span>
              )}
              <span>{section.title}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default TableOfContents; 
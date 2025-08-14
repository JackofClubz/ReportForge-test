import React, { useState, useEffect } from 'react';
import { Button } from '@carbon/react';
import { Close, Delete } from '@carbon/icons-react';
import styles from '../../styles/components/report/CommentsPanel.module.scss';

interface CommentsPanelProps {
  comments: any[];
  onClose: () => void;
  onDelete: (id: string) => void;
}

const CommentsPanel: React.FC<CommentsPanelProps> = ({
  comments,
  onClose,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [filteredComments, setFilteredComments] = useState<any[]>(comments);
  
  // Update filtered comments when comments change
  useEffect(() => {
    setFilteredComments(comments);
  }, [comments]);
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className={styles.commentsPanel}>
      <div className={styles.header}>
        <h3>Comments</h3>
        <Button
          kind="ghost"
          renderIcon={Close}
          iconDescription="Close panel"
          hasIconOnly
          onClick={onClose}
        />
      </div>
      
      <div className={styles.commentsList}>
        {filteredComments.length > 0 ? (
          filteredComments.map(comment => (
            <div key={comment.id} className={styles.commentItem}>
              <div className={styles.commentHeader}>
                <div className={styles.authorInfo}>
                  <span className={styles.authorName}>{comment.author?.full_name || 'Unknown'}</span>
                  <span className={styles.commentDate}>{formatDate(comment.created_at)}</span>
                </div>
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Delete}
                  iconDescription="Delete comment"
                  hasIconOnly
                  onClick={() => onDelete(comment.id)}
                />
              </div>
              <div className={styles.commentContent}>
                {comment.content}
              </div>
              <div className={styles.commentSection}>
                Section: {comment.section}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.noComments}>
            No comments yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentsPanel; 
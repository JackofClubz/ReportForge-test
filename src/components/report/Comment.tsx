import React, { useState } from 'react';
import { Button, TextArea } from '@carbon/react';
import { TrashCan, Reply } from '@carbon/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { deleteComment } from '../../lib/services/reportEditService';
import styles from '../../styles/pages/report/ReportEditor.module.scss';

interface CommentProps {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    full_name: string;
    role: string;
  };
  onDelete: (id: string) => void;
  onReply?: (comment: { parentId: string; content: string }) => void;
}

const Comment: React.FC<CommentProps> = ({
  id,
  content,
  createdAt,
  author,
  onDelete,
  onReply,
}) => {
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwnComment = user?.id === author.id;
  const formattedTime = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      setIsDeleting(true);
      try {
        await deleteComment(id);
        onDelete(id);
      } catch (error) {
        console.error('Failed to delete comment:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleReplySubmit = () => {
    if (replyContent.trim() && onReply) {
      onReply({
        parentId: id,
        content: replyContent,
      });
      setReplyContent('');
      setIsReplying(false);
    }
  };

  return (
    <div className={styles.commentItem} id={`comment-${id}`}>
      <div className={styles.commentMeta}>
        <span className={styles.commentAuthor}>
          {author.full_name} ({author.role})
        </span>
        <span className={styles.commentTime}>{formattedTime}</span>
      </div>
      <div className={styles.commentText}>{content}</div>
      <div className={styles.commentActions}>
        {onReply && (
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Reply}
            onClick={() => setIsReplying(!isReplying)}
          >
            Reply
          </Button>
        )}
        {isOwnComment && (
          <Button
            kind="danger--ghost"
            size="sm"
            renderIcon={TrashCan}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        )}
      </div>
      {isReplying && (
        <div className={styles.replySection}>
          <TextArea
            id={`reply-${id}`}
            labelText="Your reply"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows={2}
          />
          <div className={styles.replyActions}>
            <Button kind="secondary" size="sm" onClick={() => setIsReplying(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReplySubmit}
              disabled={!replyContent.trim()}
            >
              Submit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Comment; 
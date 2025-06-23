import React, { useState } from 'react';
import styles from './canvasBoard.module.css';

const StickyNoteReplies = ({ replies, onAddReply, onClose }) => {
  const [newReply, setNewReply] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newReply.trim()) {
      const reply = {
        id: `reply_${Date.now()}`,
        content: newReply.trim(),
        user: 'Current User', // TODO: Get from auth context
        timestamp: new Date().toISOString(),
        avatar: '👤' // TODO: Get user avatar
      };
      onAddReply(reply);
      setNewReply('');
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={styles.repliesContainer}>
      <div className={styles.repliesHeader}>
        <h4 className={styles.repliesTitle}>Replies ({replies.length})</h4>
        <button
          className={styles.closeButton}
          onClick={onClose}
          title="Close replies"
        >
          ✕
        </button>
      </div>

      <div className={styles.repliesList}>
        {replies.length === 0 ? (
          <div className={styles.noReplies}>
            No replies yet. Start the conversation!
          </div>
        ) : (
          replies.map(reply => (
            <div key={reply.id} className={styles.replyItem}>
              <div className={styles.replyHeader}>
                <span className={styles.replyAvatar}>{reply.avatar}</span>
                <span className={styles.replyUser}>{reply.user}</span>
                <span className={styles.replyTimestamp}>
                  {formatTimestamp(reply.timestamp)}
                </span>
              </div>
              <div className={styles.replyContent}>
                {reply.content}
              </div>
            </div>
          ))
        )}
      </div>

      <form className={styles.replyForm} onSubmit={handleSubmit}>
        <div className={styles.replyInputContainer}>
          <span className={styles.replyAvatar}>👤</span>
          <input
            type="text"
            className={styles.replyInput}
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            placeholder="Add a reply..."
            maxLength={500}
          />
        </div>
        <div className={styles.replyActions}>
          <button
            type="submit"
            className={styles.replySubmitButton}
            disabled={!newReply.trim()}
          >
            Reply
          </button>
        </div>
      </form>
    </div>
  );
};

export default StickyNoteReplies; 
import React from 'react';
import styles from './canvasBoard.module.css';

const PresenceLayer = ({ sessionId }) => {
  // TODO: Implement real-time user presence with WebSocket
  // For now, this is a placeholder that shows the session ID
  
  return (
    <div className={styles.presenceLayer}>
      {/* Placeholder for multi-user cursors */}
      {/* This will be populated with real user cursors when WebSocket is implemented */}
      
      {/* Session indicator */}
      <div className={styles.sessionIndicator}>
        <span className={styles.sessionLabel}>Session:</span>
        <span className={styles.sessionId}>{sessionId}</span>
      </div>
      
      {/* Placeholder for user list */}
      <div className={styles.userList}>
        <div className={styles.userItem}>
          <span className={styles.userAvatar}>👤</span>
          <span className={styles.userName}>Current User</span>
          <span className={styles.userStatusOnline}>● Online</span>
        </div>
        {/* More users will be added here when WebSocket is implemented */}
      </div>
    </div>
  );
};

export default PresenceLayer; 
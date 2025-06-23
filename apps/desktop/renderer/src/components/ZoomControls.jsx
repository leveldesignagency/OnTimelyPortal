import React from 'react';
import styles from './canvasBoard.module.css';

const ZoomControls = ({ zoom, onZoomIn, onZoomOut, onFitToScreen }) => {
  const zoomPercentage = Math.round(zoom * 100);

  return (
    <div className={styles.zoomControls}>
      <button 
        className={styles.zoomButton}
        onClick={onZoomIn}
        disabled={zoom >= 3}
        title="Zoom In"
      >
        ➕
      </button>
      <span className={styles.zoomLevel}>{zoomPercentage}%</span>
      <button 
        className={styles.zoomButton}
        onClick={onZoomOut}
        disabled={zoom <= 0.1}
        title="Zoom Out"
      >
        ➖
      </button>
      <button 
        className={styles.zoomButton}
        onClick={onFitToScreen}
        title="Fit to Screen"
      >
        🔍
      </button>
    </div>
  );
};

export default ZoomControls; 
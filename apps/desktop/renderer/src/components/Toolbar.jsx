import React, { useState } from 'react';
import styles from './canvasBoard.module.css';

const Toolbar = ({
  currentTool,
  drawingColor,
  onToolChange,
  onColorChange,
  onSave,
  onLoad,
  lastSaved
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);

  const tools = [
    { id: 'select', icon: '👆', label: 'Select', description: 'Select and move elements' },
    { id: 'pencil', icon: '✏️', label: 'Pencil', description: 'Draw with pencil' },
    { id: 'highlighter', icon: '🖍️', label: 'Highlighter', description: 'Highlight text or areas' },
    { id: 'eraser', icon: '🧽', label: 'Eraser', description: 'Erase drawings' }
  ];

  const colors = [
    '#000000', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6'
  ];

  const formatLastSaved = () => {
    if (!lastSaved) return 'Never saved';
    const date = new Date(lastSaved);
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
    <div className={styles.toolbar}>
      {/* Tool selection */}
      <div className={styles.toolSection}>
        <h4 className={styles.toolSectionTitle}>Tools</h4>
        <div className={styles.toolButtons}>
          {tools.map(tool => (
            <button
              key={tool.id}
              className={`${styles.toolButton} ${currentTool === tool.id ? styles.active : ''}`}
              onClick={() => onToolChange(tool.id)}
              title={`${tool.label}: ${tool.description}`}
            >
              <span className={styles.toolIcon}>{tool.icon}</span>
              <span className={styles.toolLabel}>{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div className={styles.toolSection}>
        <h4 className={styles.toolSectionTitle}>Color</h4>
        <div className={styles.colorSection}>
          <button
            className={styles.colorButton}
            style={{ backgroundColor: drawingColor }}
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Choose drawing color"
          />
          {showColorPicker && (
            <div className={styles.colorPicker}>
              {colors.map(color => (
                <button
                  key={color}
                  className={styles.colorOption}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    onColorChange(color);
                    setShowColorPicker(false);
                  }}
                  title={`Color: ${color}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Session management */}
      <div className={styles.toolSection}>
        <h4 className={styles.toolSectionTitle}>Session</h4>
        <div className={styles.sessionButtons}>
          <button
            className={styles.sessionButton}
            onClick={onSave}
            title="Save current session"
          >
            💾 Save
          </button>
          <button
            className={styles.sessionButton}
            onClick={() => setShowSaveMenu(!showSaveMenu)}
            title="Load previous session"
          >
            📂 Load
          </button>
        </div>
        <div className={styles.lastSaved}>
          Last saved: {formatLastSaved()}
        </div>
      </div>

      {/* Quick actions */}
      <div className={styles.toolSection}>
        <h4 className={styles.toolSectionTitle}>Quick Actions</h4>
        <div className={styles.quickActions}>
          <button
            className={styles.quickActionButton}
            onClick={() => {
              // TODO: Implement clear canvas
              console.log('Clear canvas');
            }}
            title="Clear all drawings"
          >
            🗑️ Clear
          </button>
          <button
            className={styles.quickActionButton}
            onClick={() => {
              // TODO: Implement export
              console.log('Export canvas');
            }}
            title="Export as image"
          >
            📤 Export
          </button>
        </div>
      </div>

      {/* Help */}
      <div className={styles.toolSection}>
        <h4 className={styles.toolSectionTitle}>Help</h4>
        <div className={styles.helpSection}>
          <button
            className={styles.helpButton}
            onClick={() => {
              // TODO: Show tutorial
              console.log('Show tutorial');
            }}
            title="Show tutorial"
          >
            ❓ Tutorial
          </button>
          <div className={styles.shortcuts}>
            <div className={styles.shortcutItem}>
              <kbd>Double-click</kbd> Add sticky note
            </div>
            <div className={styles.shortcutItem}>
              <kbd>Scroll</kbd> Zoom in/out
            </div>
            <div className={styles.shortcutItem}>
              <kbd>Drag</kbd> Pan canvas
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar; 
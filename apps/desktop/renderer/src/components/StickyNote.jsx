import React, { useState, useRef, useCallback } from 'react';
import TagDropdown from './TagDropdown';
import StickyNoteReplies from './StickyNoteReplies';
import styles from './canvasBoard.module.css';

const StickyNote = ({ note, isSelected, onSelect, onUpdate, onDelete, zoom }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const noteRef = useRef(null);
  const resizeRef = useRef(null);

  // Color options for sticky notes
  const colorOptions = [
    { name: 'Yellow', value: '#fef3c7' },
    { name: 'Mint', value: '#d1fae5' },
    { name: 'Coral', value: '#fed7d7' },
    { name: 'Lavender', value: '#e9d5ff' },
    { name: 'Blue', value: '#dbeafe' },
    { name: 'Pink', value: '#fce7f3' },
    { name: 'Orange', value: '#fed7aa' },
    { name: 'Green', value: '#dcfce7' }
  ];

  // Tag options
  const tagOptions = [
    { name: 'Idea', value: 'idea', icon: '💡', color: '#3b82f6' },
    { name: 'Question', value: 'question', icon: '❓', color: '#ef4444' },
    { name: 'Urgent', value: 'urgent', icon: '🚨', color: '#f59e0b' },
    { name: 'Done', value: 'done', icon: '✅', color: '#10b981' },
    { name: 'Note', value: 'note', icon: '📝', color: '#6b7280' },
    { name: 'Bug', value: 'bug', icon: '🐛', color: '#dc2626' }
  ];

  // Mouse event handlers for dragging
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest(`.${styles.resizeHandle}`)) {
      setIsResizing(true);
      return;
    }
    
    if (e.target.closest(`.${styles.noteControls}`)) {
      return;
    }
    
    onSelect();
    setIsEditing(false);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startNoteX = note.x;
    const startNoteY = note.y;
    
    const handleMouseMove = (e) => {
      const deltaX = (e.clientX - startX) / zoom;
      const deltaY = (e.clientY - startY) / zoom;
      
      onUpdate(note.id, {
        x: startNoteX + deltaX,
        y: startNoteY + deltaY
      });
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [note, onSelect, onUpdate, zoom]);

  // Resize handlers
  const handleResizeStart = useCallback((e) => {
    e.stopPropagation();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = note.width;
    const startHeight = note.height;
    
    const handleMouseMove = (e) => {
      const deltaX = (e.clientX - startX) / zoom;
      const deltaY = (e.clientY - startY) / zoom;
      
      const newWidth = Math.max(150, startWidth + deltaX);
      const newHeight = Math.max(100, startHeight + deltaY);
      
      onUpdate(note.id, {
        width: newWidth,
        height: newHeight
      });
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [note, onUpdate, zoom]);

  // Content update handlers
  const handleContentChange = useCallback((e) => {
    onUpdate(note.id, { content: e.target.value });
  }, [note.id, onUpdate]);

  const handleColorChange = useCallback((color) => {
    onUpdate(note.id, { color });
    setShowColorPicker(false);
  }, [note.id, onUpdate]);

  const handleTagAdd = useCallback((tag) => {
    if (!note.tags.find(t => t.value === tag.value)) {
      onUpdate(note.id, { tags: [...note.tags, tag] });
    }
  }, [note, onUpdate]);

  const handleTagRemove = useCallback((tagValue) => {
    onUpdate(note.id, { tags: note.tags.filter(t => t.value !== tagValue) });
  }, [note, onUpdate]);

  const handleReplyAdd = useCallback((reply) => {
    const newReplies = [...note.replies, reply];
    onUpdate(note.id, { replies: newReplies });
  }, [note, onUpdate]);

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div
      ref={noteRef}
      className={`${styles.stickyNote} ${isSelected ? styles.selected : ''}`}
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
        backgroundColor: note.color,
        transform: `scale(${zoom})`,
        transformOrigin: 'top left'
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Note controls */}
      <div className={styles.noteControls}>
        <button
          className={styles.controlButton}
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="Change color"
        >
          🎨
        </button>
        <button
          className={styles.controlButton}
          onClick={() => setShowReplies(!showReplies)}
          title="Show replies"
        >
          💬 {note.replies.length > 0 && <span className={styles.replyCount}>{note.replies.length}</span>}
        </button>
        <button
          className={styles.controlButton}
          onClick={() => onDelete(note.id)}
          title="Delete note"
        >
          🗑️
        </button>
      </div>

      {/* Color picker */}
      {showColorPicker && (
        <div className={styles.colorPicker}>
          {colorOptions.map(color => (
            <button
              key={color.value}
              className={styles.colorOption}
              style={{ backgroundColor: color.value }}
              onClick={() => handleColorChange(color.value)}
              title={color.name}
            />
          ))}
        </div>
      )}

      {/* Note content */}
      <div className={styles.noteContent}>
        {isEditing ? (
          <textarea
            className={styles.noteTextarea}
            value={note.content}
            onChange={handleContentChange}
            onBlur={() => setIsEditing(false)}
            autoFocus
            placeholder="Type your note here..."
          />
        ) : (
          <div className={styles.noteText}>
            {note.content}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className={styles.noteTags}>
        {note.tags.map(tag => (
          <span
            key={tag.value}
            className={styles.tag}
            style={{ backgroundColor: tag.color }}
            onClick={() => handleTagRemove(tag.value)}
            title={`Remove ${tag.name} tag`}
          >
            {tag.icon} {tag.name}
          </span>
        ))}
        <TagDropdown
          options={tagOptions}
          onSelect={handleTagAdd}
          existingTags={note.tags}
        />
      </div>

      {/* Timestamp */}
      <div className={styles.noteTimestamp}>
        {formatDate(note.updatedAt)}
      </div>

      {/* Resize handle */}
      <div
        ref={resizeRef}
        className={styles.resizeHandle}
        onMouseDown={handleResizeStart}
      />

      {/* Replies section */}
      {showReplies && (
        <StickyNoteReplies
          replies={note.replies}
          onAddReply={handleReplyAdd}
          onClose={() => setShowReplies(false)}
        />
      )}
    </div>
  );
};

export default StickyNote; 
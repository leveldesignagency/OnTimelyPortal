import React, { useState, useRef, useEffect, useCallback } from 'react';
import StickyNote from './StickyNote';
import DrawingLayer from './DrawingLayer';
import Toolbar from './Toolbar';
import ZoomControls from './ZoomControls';
import PresenceLayer from './PresenceLayer';
import styles from './canvasBoard.module.css';

const CanvasBoard = () => {
  // Canvas state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  
  // Tool state
  const [currentTool, setCurrentTool] = useState('select'); // select, pencil, highlighter, eraser
  const [drawingColor, setDrawingColor] = useState('#000000');
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  
  // Sticky notes state
  const [stickyNotes, setStickyNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  
  // Drawing state
  const [drawings, setDrawings] = useState([]);
  const [currentDrawing, setCurrentDrawing] = useState(null);
  
  // Session state
  const [sessionId] = useState(`session_${Date.now()}`);
  const [lastSaved, setLastSaved] = useState(null);
  
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Autosave every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveSession();
    }, 30000);
    return () => clearInterval(interval);
  }, [stickyNotes, drawings, pan, zoom]);

  // Mouse event handlers for panning
  const handleMouseDown = useCallback((e) => {
    if (currentTool === 'select' && !e.target.closest(`.${styles.stickyNote}`)) {
      setIsDragging(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  }, [currentTool]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging && currentTool === 'select') {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, lastPanPoint, currentTool]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Zoom handlers
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(3, zoom * delta));
    setZoom(newZoom);
  }, [zoom]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(3, prev * 1.2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.1, prev / 1.2));
  };

  const handleFitToScreen = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Sticky note handlers
  const handleAddStickyNote = useCallback((e) => {
    if (currentTool === 'select' && !e.target.closest(`.${styles.stickyNote}`)) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      
      const newNote = {
        id: `note_${Date.now()}`,
        x,
        y,
        width: 200,
        height: 150,
        content: 'New note...',
        color: '#fef3c7', // Default yellow
        tags: [],
        replies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setStickyNotes(prev => [...prev, newNote]);
    }
  }, [currentTool, pan, zoom]);

  const handleUpdateStickyNote = useCallback((id, updates) => {
    setStickyNotes(prev => prev.map(note => 
      note.id === id ? { ...note, ...updates, updatedAt: new Date().toISOString() } : note
    ));
  }, []);

  const handleDeleteStickyNote = useCallback((id) => {
    setStickyNotes(prev => prev.filter(note => note.id !== id));
    setSelectedNoteId(null);
  }, []);

  // Drawing handlers
  const handleDrawingStart = useCallback((point) => {
    if (isDrawingMode) {
      const newDrawing = {
        id: `drawing_${Date.now()}`,
        tool: currentTool,
        color: drawingColor,
        points: [point],
        createdAt: new Date().toISOString()
      };
      setCurrentDrawing(newDrawing);
    }
  }, [isDrawingMode, currentTool, drawingColor]);

  const handleDrawingMove = useCallback((point) => {
    if (currentDrawing && isDrawingMode) {
      setCurrentDrawing(prev => ({
        ...prev,
        points: [...prev.points, point]
      }));
    }
  }, [currentDrawing, isDrawingMode]);

  const handleDrawingEnd = useCallback(() => {
    if (currentDrawing) {
      setDrawings(prev => [...prev, currentDrawing]);
      setCurrentDrawing(null);
    }
  }, [currentDrawing]);

  // Session management
  const saveSession = useCallback(() => {
    const sessionData = {
      sessionId,
      stickyNotes,
      drawings,
      pan,
      zoom,
      lastSaved: new Date().toISOString()
    };
    
    localStorage.setItem(`canvas_session_${sessionId}`, JSON.stringify(sessionData));
    setLastSaved(new Date().toISOString());
    
    // TODO: Send to backend via WebSocket
    console.log('Session saved:', sessionData);
  }, [sessionId, stickyNotes, drawings, pan, zoom]);

  const loadSession = useCallback((sessionIdToLoad) => {
    const saved = localStorage.getItem(`canvas_session_${sessionIdToLoad}`);
    if (saved) {
      const sessionData = JSON.parse(saved);
      setStickyNotes(sessionData.stickyNotes || []);
      setDrawings(sessionData.drawings || []);
      setPan(sessionData.pan || { x: 0, y: 0 });
      setZoom(sessionData.zoom || 1);
      setLastSaved(sessionData.lastSaved);
    }
  }, []);

  // Tool change handlers
  const handleToolChange = useCallback((tool) => {
    setCurrentTool(tool);
    setIsDrawingMode(['pencil', 'highlighter', 'eraser'].includes(tool));
    setSelectedNoteId(null);
  }, []);

  const handleColorChange = useCallback((color) => {
    setDrawingColor(color);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={styles.canvasContainer}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onDoubleClick={handleAddStickyNote}
    >
      {/* Canvas background */}
      <div 
        className={styles.canvasBackground}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {/* Drawing layer */}
        <DrawingLayer
          drawings={drawings}
          currentDrawing={currentDrawing}
          onDrawingStart={handleDrawingStart}
          onDrawingMove={handleDrawingMove}
          onDrawingEnd={handleDrawingEnd}
          isDrawingMode={isDrawingMode}
          currentTool={currentTool}
          drawingColor={drawingColor}
        />

        {/* Sticky notes */}
        {stickyNotes.map(note => (
          <StickyNote
            key={note.id}
            note={note}
            isSelected={selectedNoteId === note.id}
            onSelect={() => setSelectedNoteId(note.id)}
            onUpdate={handleUpdateStickyNote}
            onDelete={handleDeleteStickyNote}
            zoom={zoom}
          />
        ))}
      </div>

      {/* Presence layer for multi-user cursors */}
      <PresenceLayer sessionId={sessionId} />

      {/* Floating toolbar */}
      <Toolbar
        currentTool={currentTool}
        drawingColor={drawingColor}
        onToolChange={handleToolChange}
        onColorChange={handleColorChange}
        onSave={saveSession}
        onLoad={() => loadSession(sessionId)}
        lastSaved={lastSaved}
      />

      {/* Zoom controls */}
      <ZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitToScreen={handleFitToScreen}
      />
    </div>
  );
};

export default CanvasBoard; 
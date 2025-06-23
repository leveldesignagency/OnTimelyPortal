import React, { useRef, useEffect, useCallback } from 'react';
import styles from './canvasBoard.module.css';

const DrawingLayer = ({
  drawings,
  currentDrawing,
  onDrawingStart,
  onDrawingMove,
  onDrawingEnd,
  isDrawingMode,
  currentTool,
  drawingColor
}) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to match container
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Redraw all drawings when they change
  useEffect(() => {
    if (!contextRef.current) return;

    const context = contextRef.current;
    const canvas = canvasRef.current;
    
    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all completed drawings
    drawings.forEach(drawing => {
      drawPath(context, drawing.points, drawing.tool, drawing.color);
    });

    // Draw current drawing
    if (currentDrawing) {
      drawPath(context, currentDrawing.points, currentDrawing.tool, currentDrawing.color);
    }
  }, [drawings, currentDrawing]);

  // Drawing functions
  const drawPath = useCallback((context, points, tool, color) => {
    if (points.length < 2) return;

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      context.lineTo(points[i].x, points[i].y);
    }

    // Set drawing style based on tool
    switch (tool) {
      case 'pencil':
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.globalAlpha = 1;
        break;
      case 'highlighter':
        context.strokeStyle = color;
        context.lineWidth = 8;
        context.globalAlpha = 0.3;
        break;
      case 'eraser':
        context.strokeStyle = '#ffffff';
        context.lineWidth = 20;
        context.globalAlpha = 1;
        break;
      default:
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.globalAlpha = 1;
    }

    context.stroke();
    context.globalAlpha = 1;
  }, []);

  // Mouse event handlers
  const getMousePos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (!isDrawingMode) return;
    
    isDrawingRef.current = true;
    const point = getMousePos(e);
    onDrawingStart(point);
  }, [isDrawingMode, getMousePos, onDrawingStart]);

  const handleMouseMove = useCallback((e) => {
    if (!isDrawingMode || !isDrawingRef.current) return;
    
    const point = getMousePos(e);
    onDrawingMove(point);
  }, [isDrawingMode, getMousePos, onDrawingMove]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawingMode) return;
    
    isDrawingRef.current = false;
    onDrawingEnd();
  }, [isDrawingMode, onDrawingEnd]);

  // Touch event handlers for mobile
  const handleTouchStart = useCallback((e) => {
    if (!isDrawingMode) return;
    
    e.preventDefault();
    isDrawingRef.current = true;
    const touch = e.touches[0];
    const point = getMousePos(touch);
    onDrawingStart(point);
  }, [isDrawingMode, getMousePos, onDrawingStart]);

  const handleTouchMove = useCallback((e) => {
    if (!isDrawingMode || !isDrawingRef.current) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const point = getMousePos(touch);
    onDrawingMove(point);
  }, [isDrawingMode, getMousePos, onDrawingMove]);

  const handleTouchEnd = useCallback(() => {
    if (!isDrawingMode) return;
    
    isDrawingRef.current = false;
    onDrawingEnd();
  }, [isDrawingMode, onDrawingEnd]);

  return (
    <canvas
      ref={canvasRef}
      className={`${styles.drawingCanvas} ${isDrawingMode ? styles.drawingMode : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        cursor: isDrawingMode ? 'crosshair' : 'default',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: isDrawingMode ? 'auto' : 'none',
        zIndex: 10
      }}
    />
  );
};

export default DrawingLayer; 
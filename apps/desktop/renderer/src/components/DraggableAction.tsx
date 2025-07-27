import React from 'react';

interface DraggableActionProps {
  children: React.ReactNode;
  action: {
    name: string;
    icon: string;
    type: 'navigate' | 'function';
    to?: string;
    execute?: () => void;
  };
  className?: string;
  style?: React.CSSProperties;
}

export const DraggableAction: React.FC<DraggableActionProps> = ({ 
  children, 
  action, 
  className, 
  style 
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(action));
    e.dataTransfer.effectAllowed = 'copy';
    
    // Create drag preview
    const preview = document.createElement('div');
    preview.style.position = 'absolute';
    preview.style.top = '-1000px';
    preview.style.left = '-1000px';
    preview.style.background = 'rgba(255, 255, 255, 0.15)';
    preview.style.color = 'rgba(0, 0, 0, 0.9)';
    preview.style.padding = '16px 20px';
    preview.style.borderRadius = '12px';
    preview.style.fontSize = '14px';
    preview.style.fontWeight = '600';
    preview.style.pointerEvents = 'none';
    preview.style.zIndex = '9999';
    preview.style.backdropFilter = 'blur(20px)';
    preview.style.border = '1px solid rgba(255, 255, 255, 0.3)';
    preview.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.12)';
    preview.style.minWidth = '200px';
    preview.style.textAlign = 'center';
    preview.style.letterSpacing = '0.5px';
    preview.textContent = action.name;
    
    document.body.appendChild(preview);
    e.dataTransfer.setDragImage(preview, 0, 0);
    
    // Clean up preview after drag starts
    setTimeout(() => {
      if (document.body.contains(preview)) {
        document.body.removeChild(preview);
      }
    }, 0);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={className}
      style={{
        cursor: 'grab',
        userSelect: 'none',
        ...style
      }}
    >
      {children}
    </div>
  );
}; 
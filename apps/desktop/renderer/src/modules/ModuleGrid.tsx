import React, { useState } from 'react';
import { AVAILABLE_MODULES, getModule } from './ModuleStore';
import { ModuleType } from './types';

interface ModuleGridProps {
  onModuleAdd: (module: ModuleType) => void;
  activeModules: ModuleType[];
}

export const ModuleGrid: React.FC<ModuleGridProps> = ({ onModuleAdd, activeModules }) => {
  const [draggedModule, setDraggedModule] = useState<ModuleType | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, module: ModuleType) => {
    setDraggedModule(module);
    e.dataTransfer.setData('moduleId', module.id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add visual feedback
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 20, 20);
    
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.backgroundColor = '';
  };

  const handleDragEnd = () => {
    setDraggedModule(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = '';
    const moduleId = e.dataTransfer.getData('moduleId');
    const module = getModule(moduleId);
    if (module) {
      onModuleAdd(module);
    }
    setDraggedModule(null);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Available Modules</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AVAILABLE_MODULES.map((module) => {
          const isActive = activeModules.some(m => m.id === module.id);
          return (
            <div
              key={module.id}
              draggable={!isActive}
              onDragStart={(e) => handleDragStart(e, module)}
              onDragEnd={handleDragEnd}
              className={`
                p-4 rounded-lg border-2 transition-all duration-200 select-none
                ${isActive 
                  ? 'opacity-50 cursor-not-allowed border-gray-200' 
                  : 'cursor-grab hover:shadow-lg border-blue-500 active:cursor-grabbing'}
                ${draggedModule?.id === module.id ? 'opacity-75' : ''}
              `}
              style={{
                backgroundColor: 'white',
                transform: draggedModule?.id === module.id ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{module.icon}</span>
                <h3 className="font-semibold">{module.name}</h3>
              </div>
              <p className="text-gray-600 text-sm mb-2">{module.description}</p>
              <div className="space-y-1">
                {module.features.slice(0, 3).map((feature, index) => (
                  <div key={index} className="text-xs text-gray-500 flex items-center gap-1">
                    <span>•</span>
                    <span>{feature}</span>
                  </div>
                ))}
                {module.features.length > 3 && (
                  <div className="text-xs text-blue-500">
                    +{module.features.length - 3} more features
                  </div>
                )}
              </div>
              {module.configRequired && (
                <div className="mt-2 text-xs text-orange-500">
                  ⚙️ Requires configuration
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          mt-8 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center
          transition-colors duration-200
          ${draggedModule ? 'bg-blue-50 border-blue-300' : ''}
        `}
      >
        <p className="text-gray-500">
          {draggedModule 
            ? 'Drop module here to add it to your event' 
            : 'Drag and drop modules here to add them to your event'}
        </p>
      </div>
    </div>
  );
}; 
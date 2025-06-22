import React, { useState, useEffect } from 'react';
import { ModuleGrid } from '../modules/ModuleGrid';
import { ActiveModules } from '../modules/ActiveModules';
import { ModuleType } from '../modules/types';

export const ModulesPage: React.FC = () => {
  const [activeModules, setActiveModules] = useState<ModuleType[]>([]);

  // Load active modules from localStorage on mount
  useEffect(() => {
    const savedModules = localStorage.getItem('activeModules');
    if (savedModules) {
      setActiveModules(JSON.parse(savedModules));
    }
  }, []);

  // Save active modules to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('activeModules', JSON.stringify(activeModules));
  }, [activeModules]);

  const handleAddModule = (module: ModuleType) => {
    if (!activeModules.some(m => m.id === module.id)) {
      setActiveModules([...activeModules, module]);
    }
  };

  const handleRemoveModule = (moduleId: string) => {
    setActiveModules(activeModules.filter(m => m.id !== moduleId));
  };

  const handleConfigureModule = (moduleId: string, config: any) => {
    setActiveModules(
      activeModules.map(module =>
        module.id === moduleId
          ? { ...module, apiKey: config.apiKey, config }
          : module
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Event Modules</h1>
          <p className="mt-2 text-gray-600">
            Drag and drop modules to add functionality to your event. Configure each module with your API keys and preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm">
            <ModuleGrid
              onModuleAdd={handleAddModule}
              activeModules={activeModules}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm">
            <ActiveModules
              modules={activeModules}
              onRemoveModule={handleRemoveModule}
              onConfigureModule={handleConfigureModule}
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 
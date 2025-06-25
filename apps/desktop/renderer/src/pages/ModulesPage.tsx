import React, { useState, useEffect } from 'react';
import { ModuleGrid } from '../modules/ModuleGrid';
import { ActiveModules } from '../modules/ActiveModules';
import { ModuleType } from '../modules/types';
import { getCurrentUser } from '../lib/auth';
import { getEventModules, saveEventModules } from '../lib/supabase';

export const ModulesPage: React.FC = () => {
  const [activeModules, setActiveModules] = useState<ModuleType[]>([]);
  
  // Get current user for company context
  const currentUser = getCurrentUser();

  // Load active modules from Supabase on mount
  useEffect(() => {
    const loadModules = async () => {
      if (!currentUser) return;
      
      try {
        const modules = await getEventModules(currentUser.company_id);
        if (modules && modules.modules) {
          setActiveModules(modules.modules);
        }
      } catch (error) {
        console.error('Failed to load modules from Supabase:', error);
        // Fallback to localStorage
        try {
          const savedModules = localStorage.getItem('activeModules');
          if (savedModules) {
            setActiveModules(JSON.parse(savedModules));
          }
        } catch (fallbackError) {
          console.error('Fallback to localStorage also failed:', fallbackError);
        }
      }
    };

    loadModules();
  }, [currentUser]);

  // Save active modules to Supabase whenever they change
  useEffect(() => {
    const saveModules = async () => {
      if (!currentUser || activeModules.length === 0) return;
      
      try {
        await saveEventModules(currentUser.company_id, activeModules, currentUser.id);
        console.log('Modules saved to Supabase');
      } catch (error) {
        console.error('Failed to save modules to Supabase:', error);
        // Fallback to localStorage
        try {
          localStorage.setItem('activeModules', JSON.stringify(activeModules));
          console.log('Modules saved to localStorage as fallback');
        } catch (fallbackError) {
          console.error('Fallback save to localStorage also failed:', fallbackError);
        }
      }
    };

    saveModules();
  }, [activeModules, currentUser]);

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
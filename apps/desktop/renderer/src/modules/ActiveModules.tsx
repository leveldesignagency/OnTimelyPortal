import React, { useState } from 'react';
import { ModuleType } from './types';
import { getModuleApiConfig } from './ModuleStore';

interface ActiveModulesProps {
  modules: ModuleType[];
  onRemoveModule: (moduleId: string) => void;
  onConfigureModule: (moduleId: string, config: any) => void;
}

export const ActiveModules: React.FC<ActiveModulesProps> = ({
  modules,
  onRemoveModule,
  onConfigureModule,
}) => {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');

  const handleExpand = (moduleId: string) => {
    setExpandedModule(expandedModule === moduleId ? null : moduleId);
  };

  const handleConfigure = async (module: ModuleType) => {
    setConfiguring(module.id);
    const config = await getModuleApiConfig(module.id, apiKey);
    if (config) {
      onConfigureModule(module.id, config);
    }
    setConfiguring(null);
    setApiKey('');
  };

  if (modules.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No active modules. Drag and drop modules to add them to your event.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold mb-4">Active Modules</h2>
      {modules.map((module) => (
        <div
          key={module.id}
          className="bg-white rounded-lg border border-gray-200 overflow-hidden"
        >
          <div
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
            onClick={() => handleExpand(module.id)}
          >
            <div className="flex items-center gap-3">
              {/* <span className="text-2xl">{module.icon}</span> */}
              <div>
                <h3 className="font-semibold">{module.name}</h3>
                <p className="text-sm text-gray-600">{module.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {module.configRequired && !module.apiKey && (
                <button
                  className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedModule(module.id);
                  }}
                >
                  Needs Setup
                </button>
              )}
              <button
                className="p-2 text-gray-500 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveModule(module.id);
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {expandedModule === module.id && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="space-y-3">
                <h4 className="font-medium">Features:</h4>
                <ul className="space-y-1">
                  {module.features.map((feature, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                      <span>•</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {module.configRequired && !module.apiKey && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Configuration Required:</h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter API Key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg"
                      />
                      <button
                        onClick={() => handleConfigure(module)}
                        disabled={!apiKey || configuring === module.id}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
                      >
                        {configuring === module.id ? 'Configuring...' : 'Configure'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}; 
//src/components/editor/StyleStudio.tsx

'use client';

import React, { useState } from 'react';
import { X, Palette, Maximize, Minimize } from 'lucide-react';
import { LearningObjectivesTemplate } from './templates/LearningObjectives';

// In the future, this array can be expanded with more imported templates.
const availableTemplates = [
  LearningObjectivesTemplate,
];

interface StyleStudioProps {
  onClose: () => void;
  onInsert: (html: string) => void;
}

export const StyleStudio: React.FC<StyleStudioProps> = ({ onClose, onInsert }) => {
  // --- This component now manages its own expanded state internally ---
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0 shadow-lg animate-in slide-in-from-left duration-300 transition-all ${
      isExpanded ? 'w-[80%]' : 'w-96'
    }`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-purple-50 rounded-xl">
              <Palette className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Style Studio</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200">
              {isExpanded ? <Minimize className="w-5 h-5 text-gray-600" /> : <Maximize className="w-5 h-5 text-gray-600" />}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Template Library */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <h4 className="px-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">Templates</h4>
          <div className={`grid gap-4 ${isExpanded ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {availableTemplates.map((template) => (
              <div
                key={template.name}
                className="group rounded-xl p-4 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                    <template.icon />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{template.name}</p>
                    <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => onInsert(template.html)}
                  className="w-full mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Insert
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
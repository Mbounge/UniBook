//src/components/editor/SelectionInfo.tsx

'use client';

import React from 'react';
import { Type, FileText } from 'lucide-react';

interface SelectionInfoProps {
  selectedText: string;
  isMultiPageSelection: boolean;
  selectedPages: number[];
}

export const SelectionInfo: React.FC<SelectionInfoProps> = ({
  selectedText,
  isMultiPageSelection,
  selectedPages,
}) => {
  if (!selectedText) return null;

  const wordCount = selectedText.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = selectedText.length;

  return (
    <div className="fixed bottom-20 right-6 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Type className="w-4 h-4" />
          <span className="font-medium">{wordCount}</span>
          <span className="text-gray-400">words</span>
        </div>
        
        <div className="w-px h-4 bg-gray-300" />
        
        <div className="flex items-center gap-1.5 text-gray-600">
          <span className="font-medium">{charCount}</span>
          <span className="text-gray-400">chars</span>
        </div>

        {isMultiPageSelection && (
          <>
            <div className="w-px h-4 bg-gray-300" />
            <div className="flex items-center gap-1.5 text-purple-600">
              <FileText className="w-4 h-4" />
              <span className="font-medium">{selectedPages.length}</span>
              <span className="text-purple-400">pages</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
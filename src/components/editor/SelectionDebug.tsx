'use client';

import React from 'react';

interface SelectionDebugProps {
  selectedText: string;
  isMultiPageSelection: boolean;
  selectedPages: number[];
}

export const SelectionDebug: React.FC<SelectionDebugProps> = ({
  selectedText,
  isMultiPageSelection,
  selectedPages,
}) => {
  if (!selectedText) {
    return (
      <div className="fixed top-20 right-6 bg-gray-800 text-white rounded-lg shadow-lg border border-gray-600 p-3 z-50 text-xs font-mono">
        <p className="text-gray-400">No active selection.</p>
      </div>
    );
  }

  return (
    <div className="fixed top-20 right-6 bg-gray-800 text-white rounded-lg shadow-lg border border-gray-600 p-3 z-50 text-xs font-mono max-w-xs">
      <h4 className="font-bold text-purple-400 mb-2 border-b border-gray-600 pb-1">Selection State</h4>
      <p><span className="text-gray-400">Multi-Page:</span> {isMultiPageSelection ? 'Yes' : 'No'}</p>
      <p><span className="text-gray-400">Pages:</span> [{selectedPages.join(', ')}]</p>
      <p className="text-gray-400 mt-2">Text (Whitespace Visible):</p>
      {/* This <pre> tag will make newlines and extra spaces visible for debugging */}
      <pre className="bg-gray-700 p-1 rounded mt-1 break-words max-h-24 overflow-y-auto whitespace-pre-wrap">
        <code>
          "{selectedText}"
        </code>
      </pre>
    </div>
  );
};
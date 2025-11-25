// src/components/editor/HeaderFooterEditor.tsx

"use client";

import React, { useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';

interface HeaderFooterEditorProps {
  initialHtml: string;
  position: { top: number; left: number; width: number };
  areaType: 'header' | 'footer';
  onClose: (finalHtml: string) => void;
}

export const HeaderFooterEditor: React.FC<HeaderFooterEditorProps> = ({
  initialHtml,
  position,
  areaType,
  onClose,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialHtml;
      
      // Focus and place cursor at end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
      editorRef.current.focus();
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose(editorRef.current?.innerHTML || '');
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose(initialHtml); 
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        onClose(editorRef.current?.innerHTML || '');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [initialHtml, onClose]);

  const handleSave = () => {
    onClose(editorRef.current?.innerHTML || '');
  };

  return (
    <div
      ref={containerRef}
      className="absolute z-40 flex flex-col animate-in fade-in zoom-in-95 duration-150"
      style={{ 
        top: position.top - 36, // Shift up to accommodate the header bar
        left: position.left, 
        width: position.width 
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Label Badge */}
      <div className="flex justify-between items-end mb-1 px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-t-md border-t border-x border-blue-100">
          {areaType}
        </span>
      </div>

      {/* Main Editor Box */}
      <div className="bg-white rounded-lg shadow-xl border border-blue-200 ring-4 ring-blue-500/5 overflow-hidden flex flex-col">
        
        {/* Simplified Toolbar */}
        <div className="bg-gray-50 border-b border-gray-200 p-1.5 flex items-center justify-end select-none">
          <button
            onClick={handleSave}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            Done
          </button>
        </div>

        {/* Editable Area */}
        <div 
          ref={editorRef}
          contentEditable
          className="outline-none p-4 min-h-[60px] text-sm text-gray-800 bg-white cursor-text"
          style={{ lineHeight: '1.5' }}
        />
      </div>
      
      {/* Cancel Action */}
      <div className="text-center mt-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <button 
          onClick={() => onClose(initialHtml)}
          className="text-xs text-gray-400 hover:text-red-500 flex items-center justify-center gap-1 mx-auto"
        >
          <X className="w-3 h-3" /> Cancel changes
        </button>
      </div>
    </div>
  );
};
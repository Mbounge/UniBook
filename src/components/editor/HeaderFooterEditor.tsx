// src/components/editor/HeaderFooterEditor.tsx

"use client";

import React, { useEffect, useRef } from 'react';
import { Hash } from 'lucide-react';

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

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const insertPageNumber = () => {
    if (editorRef.current) {
      const pageNumHtml = '<span class="page-number-placeholder" contenteditable="false">#</span>';
      document.execCommand('insertHTML', false, pageNumHtml);
      editorRef.current.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute z-40"
      style={{ top: position.top, left: position.left, width: position.width }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-lg shadow-lg border border-gray-300 p-2">
        <div 
          ref={editorRef}
          contentEditable
          // --- FIX: Explicitly set text-align to left for the editing experience ---
          className="outline-none p-2 min-h-[40px] text-sm text-gray-600 text-left"
        />
        <div className="flex items-center justify-between border-t border-gray-200 pt-1 mt-1">
          <div className="flex items-center gap-1">
            <button
              onClick={insertPageNumber}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:bg-gray-100 px-2 py-1 rounded-md"
              title="Insert Page Number"
            >
              <Hash className="w-3 h-3" />
              Page Number
            </button>
          </div>
        </div>
      </div>
      <div className="text-center mt-2">
        <span className="text-xs font-semibold text-gray-500 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-gray-200">
          Editing {areaType.charAt(0).toUpperCase() + areaType.slice(1)}
        </span>
      </div>
    </div>
  );
};
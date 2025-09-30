// src/components/editor/PagedEditor.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { EditorPage } from './EditorPage';
import { useEditorState } from '@/hooks/useEditorState';
import { useFormatting } from '@/hooks/useFormatting';
import { Bold, Italic, Underline } from 'lucide-react';
import { getLineText } from '@/types/editor';

const EditorToolbar = ({ onBold, onItalic, onUnderline }: any) => {
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false });

  useEffect(() => {
    const updateActiveFormats = () => {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
      });
    };
    document.addEventListener('selectionchange', updateActiveFormats);
    updateActiveFormats();
    return () => document.removeEventListener('selectionchange', updateActiveFormats);
  }, []);

  const ToolbarButton = ({ onClick, title, isActive, children }: any) => (
    <button onMouseDown={(e) => e.preventDefault()} onClick={onClick} title={title} className={`p-2 rounded ${isActive ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"}`}>
      {children}
    </button>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 flex items-center gap-2 mb-8 sticky top-4 z-50">
      <ToolbarButton onClick={onBold} title="Bold" isActive={activeFormats.bold}><Bold className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton onClick={onItalic} title="Italic" isActive={activeFormats.italic}><Italic className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton onClick={onUnderline} title="Underline" isActive={activeFormats.underline}><Underline className="w-4 h-4" /></ToolbarButton>
    </div>
  );
};

export const PagedEditor: React.FC = () => {
  const editorState = useEditorState();
  const { applyFormat, updateLineFromHTML } = useFormatting({
    pages: editorState.pages,
    setPages: editorState.setPages,
    getAllLines: editorState.getAllLines,
    getFlatIndexFromPageLine: editorState.getFlatIndexFromPageLine,
    redistributeContent: editorState.redistributeContent,
  });

  // --- FIX: This now passes the cursor's charIndex to the state hook ---
  const handleAddLine = (pageIndex: number, lineIndex: number, charIndex: number) => {
    editorState.addLine(pageIndex, lineIndex, charIndex);
  };

  const handleRemoveLine = (pageIndex: number, lineIndex: number) => {
    editorState.removeLine(pageIndex, lineIndex);
  };

  const handleMergeWithPrevious = (pageIndex: number, lineIndex: number) => {
    const allLines = editorState.getAllLines();
    const flatIndex = editorState.getFlatIndexFromPageLine(pageIndex, lineIndex);
    if (flatIndex <= 0) return;
    const prevLine = allLines[flatIndex - 1];
    const prevLineTextLength = getLineText(prevLine).length;
    const mergedLine = { ...prevLine, spans: [...prevLine.spans, ...allLines[flatIndex].spans] };
    const newAllLines = [...allLines.slice(0, flatIndex - 1), mergedLine, ...allLines.slice(flatIndex + 1)];
    const newPages = editorState.redistributeContent(newAllLines);
    editorState.setPages(newPages);
    setTimeout(() => {
      const newCursorPos = editorState.getPageLineFromFlatIndex(flatIndex - 1, newPages);
      editorState.setCursorPosition({ ...newCursorPos, charIndex: prevLineTextLength });
    }, 0);
  };

  const handleUpdateAndCursor = (pageIndex: number, lineIndex: number, html: string, charIndex: number) => {
    updateLineFromHTML(pageIndex, lineIndex, html);
    editorState.setCursorPosition({ pageIndex, lineIndex, charIndex });
  };

  return (
    <div className="flex flex-col items-center">
      <EditorToolbar
        onBold={() => applyFormat('bold')}
        onItalic={() => applyFormat('italic')}
        onUnderline={() => applyFormat('underline')}
      />
      <div className="space-y-8">
        {editorState.pages.map((page, pageIndex) => (
          <EditorPage
            key={page.id}
            page={page}
            pageIndex={pageIndex}
            cursorPosition={editorState.cursorPosition}
            selectedRange={editorState.selectedRange}
            pages={editorState.pages}
            onAddLine={handleAddLine}
            onRemoveLine={handleRemoveLine}
            onMergeWithPrevious={handleMergeWithPrevious}
            onUpdateAndCursor={handleUpdateAndCursor}
            setCursorPosition={editorState.setCursorPosition}
          />
        ))}
      </div>
    </div>
  );
};
// src/components/editor/EditorPage.tsx

'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { EditorLine, CursorPosition, SelectedRange, PageData, getSelectedTextContent, Span, getLineText, spansToHTML } from '@/types/editor';

// --- HELPER FUNCTIONS FOR CURSOR MANAGEMENT ---
const getCursorCharIndex = (element: Node): number => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;
  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.startContainer, range.startOffset);
  return preCaretRange.toString().length;
};

const setCursorCharIndex = (element: Node, charIndex: number) => {
  if (charIndex < 0) return;
  const range = document.createRange();
  const selection = window.getSelection();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();
  let accumulatedLength = 0;
  while (currentNode) {
    const nodeLength = currentNode.textContent?.length || 0;
    if (accumulatedLength + nodeLength >= charIndex) {
      range.setStart(currentNode, charIndex - accumulatedLength);
      range.collapse(true);
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      return;
    }
    accumulatedLength += nodeLength;
    currentNode = walker.nextNode();
  }
  range.selectNodeContents(element);
  range.collapse(false);
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
};

interface EditorPageProps {
  page: PageData;
  pageIndex: number;
  cursorPosition: CursorPosition;
  selectedRange: SelectedRange | null;
  pages: PageData[];
  // --- FIX: The signature of onAddLine has changed ---
  onAddLine: (pageIndex: number, lineIndex: number, charIndex: number) => void;
  onRemoveLine: (pageIndex: number, lineIndex: number) => void;
  onMergeWithPrevious: (pageIndex: number, lineIndex: number) => void;
  onUpdateAndCursor: (pageIndex: number, lineIndex: number, html: string, charIndex: number) => void;
  setCursorPosition: (pos: CursorPosition) => void;
}

export const EditorPage: React.FC<EditorPageProps> = (props) => {
  const pageRef = useRef<HTMLDivElement>(null);
  const A4_WIDTH = 794;
  const A4_HEIGHT = 1123;
  const HEADER_FOOTER_HEIGHT = 60;
  const CONTENT_HEIGHT = A4_HEIGHT - (HEADER_FOOTER_HEIGHT * 2);

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      if (props.selectedRange) {
        e.preventDefault();
        const selectedText = getSelectedTextContent(props.pages, props.selectedRange);
        e.clipboardData?.setData('text/plain', selectedText);
      }
    };
    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [props.selectedRange, props.pages]);

  return (
    <div className="relative bg-white shadow-lg" style={{ width: A4_WIDTH, height: A4_HEIGHT }}>
      <div className="border-b border-gray-200 px-16 py-4 text-sm text-gray-500" style={{ height: HEADER_FOOTER_HEIGHT }}>
        <div className="flex justify-between items-center">
          <span>Document Header</span>
          <span>Page {props.pageIndex + 1}</span>
        </div>
      </div>
      <div ref={pageRef} className="px-16 py-4 overflow-hidden" style={{ height: CONTENT_HEIGHT }}>
        {props.page.lines.map((line, lineIndex) => (
          <EditableLine
            key={line.id}
            line={line}
            pageIndex={props.pageIndex}
            lineIndex={lineIndex}
            isFocused={props.cursorPosition.pageIndex === props.pageIndex && props.cursorPosition.lineIndex === lineIndex}
            cursorCharIndex={props.cursorPosition.charIndex}
            onAddLine={props.onAddLine}
            onRemoveLine={props.onRemoveLine}
            onMergeWithPrevious={props.onMergeWithPrevious}
            onUpdateAndCursor={props.onUpdateAndCursor}
            setCursorPosition={props.setCursorPosition}
          />
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 px-16 py-4 text-sm text-gray-500" style={{ height: HEADER_FOOTER_HEIGHT }}>
        <div className="flex justify-center">
          <span>Document Footer</span>
        </div>
      </div>
    </div>
  );
};

interface EditableLineProps {
  line: EditorLine;
  pageIndex: number;
  lineIndex: number;
  isFocused: boolean;
  cursorCharIndex: number;
  onAddLine: (pageIndex: number, lineIndex: number, charIndex: number) => void;
  onRemoveLine: (pageIndex: number, lineIndex: number) => void;
  onMergeWithPrevious: (pageIndex: number, lineIndex: number) => void;
  onUpdateAndCursor: (pageIndex: number, lineIndex: number, html: string, charIndex: number) => void;
  setCursorPosition: (pos: CursorPosition) => void;
}

const EditableLine: React.FC<EditableLineProps> = React.memo(({
  line, pageIndex, lineIndex, isFocused, cursorCharIndex,
  onAddLine, onMergeWithPrevious, onUpdateAndCursor, setCursorPosition
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const lineHTML = useMemo(() => spansToHTML(line.spans), [line.spans]);

  useEffect(() => {
    if (divRef.current && divRef.current.innerHTML !== lineHTML) {
      divRef.current.innerHTML = lineHTML;
    }
  }, [lineHTML]);

  useEffect(() => {
    if (isFocused && divRef.current) {
      divRef.current.focus();
      setCursorCharIndex(divRef.current, cursorCharIndex);
    }
  }, [isFocused, cursorCharIndex]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const charIndex = getCursorCharIndex(e.currentTarget);
    const html = e.currentTarget.innerHTML;
    onUpdateAndCursor(pageIndex, lineIndex, html, charIndex);
  };

  const updateCursorState = () => {
    setTimeout(() => {
      if (divRef.current) {
        const charIndex = getCursorCharIndex(divRef.current);
        setCursorPosition({ pageIndex, lineIndex, charIndex });
      }
    }, 0);
  };

  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const cursorPos = getCursorCharIndex(e.currentTarget);
    
    if (e.key === 'Enter') {
      e.preventDefault();
      // --- FIX: Pass the current cursor position to onAddLine ---
      onAddLine(pageIndex, lineIndex, cursorPos);
    } else if (e.key === 'Backspace' && cursorPos === 0 && (pageIndex > 0 || lineIndex > 0)) {
      e.preventDefault();
      onMergeWithPrevious(pageIndex, lineIndex);
    }
  };

  const currentText = getLineText(line);
  const showPlaceholder = pageIndex === 0 && lineIndex === 0 && currentText === '';

  return (
    <div className="relative">
      {showPlaceholder && (
        <div className="absolute top-0 left-0 text-gray-400 pointer-events-none" style={{ lineHeight: '24px' }}>
          Start typing...
        </div>
      )}
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDownInternal}
        onMouseUp={updateCursorState}
        onKeyUp={updateCursorState}
        dangerouslySetInnerHTML={{ __html: lineHTML }}
        className="w-full bg-transparent border-none outline-none min-h-6 leading-6 relative z-10"
        style={{
          font: 'inherit', fontSize: '16px', lineHeight: '24px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  if (nextProps.isFocused && prevProps.isFocused) {
    return (
      prevProps.pageIndex === nextProps.pageIndex &&
      prevProps.lineIndex === nextProps.lineIndex &&
      prevProps.cursorCharIndex === nextProps.cursorCharIndex
    );
  }
  return false;
});

EditableLine.displayName = 'EditableLine';
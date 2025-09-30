'use client';

import { useCallback, useState, useEffect } from 'react';
import { PageData, CursorPosition, SelectedRange, comparePositions } from '@/types/editor';

interface UseContentReflowProps {
  pages: PageData[];
  cursorPosition: CursorPosition;
  selectedRange: SelectedRange | null;
  addPage: () => PageData;
  removePage: (pageIndex: number) => void;
  updatePageContent: (pageIndex: number, lineIndex: number, content: string) => void;
  setCursorPosition: (position: CursorPosition) => void;
  setSelectedRange: (range: SelectedRange | null) => void;
  addLine: (pageIndex: number, lineIndex: number, content?: string) => void;
  removeLine: (pageIndex: number, lineIndex: number) => void;
  mergeLine: (pageIndex: number, lineIndex: number, withPrevious?: boolean) => void;
  getAllLines: () => any[];
  getFlatIndexFromPageLine: (pageIndex: number, lineIndex: number) => number;
  getPageLineFromFlatIndex: (flatIndex: number, newPages: PageData[]) => { pageIndex: number; lineIndex: number };
  redistributeContent: (lines: any[]) => PageData[];
}

export const useContentReflow = ({
  pages,
  cursorPosition,
  selectedRange,
  addPage,
  removePage,
  updatePageContent,
  setCursorPosition,
  setSelectedRange,
  addLine,
  removeLine,
  mergeLine,
  getAllLines,
  getFlatIndexFromPageLine,
  getPageLineFromFlatIndex,
  redistributeContent,
}: UseContentReflowProps) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<CursorPosition | null>(null);

  const hasValidSelection = useCallback((): boolean => {
    if (!selectedRange) return false;
    return comparePositions(selectedRange.start, selectedRange.end) !== 0;
  }, [selectedRange]);

  const handleContentUpdate = useCallback((pageIndex: number, lineIndex: number, content: string, cursorIndex: number) => {
    const allLines = getAllLines();
    const currentFlatIndex = getFlatIndexFromPageLine(pageIndex, lineIndex);
    
    const updatedLines = allLines.map((line, index) => 
      index === currentFlatIndex ? { ...line, content } : line
    );

    const newPages = redistributeContent(updatedLines);
    window.dispatchEvent(new CustomEvent('updatePages', { detail: newPages }));

    const newPosition = getPageLineFromFlatIndex(currentFlatIndex, newPages);
    setCursorPosition({
      ...newPosition,
      charIndex: cursorIndex
    });
  }, [
    getAllLines,
    getFlatIndexFromPageLine,
    redistributeContent,
    getPageLineFromFlatIndex,
    setCursorPosition
  ]);

  const replaceSelectedText = useCallback((newText: string = ''): boolean => {
    if (!hasValidSelection() || !selectedRange) return false;

    const { start, end } = selectedRange;
    const actualStart = comparePositions(start, end) <= 0 ? start : end;
    const actualEnd = comparePositions(start, end) <= 0 ? end : start;

    const allLines = getAllLines();
    const startFlatIndex = getFlatIndexFromPageLine(actualStart.pageIndex, actualStart.lineIndex);
    const endFlatIndex = getFlatIndexFromPageLine(actualEnd.pageIndex, actualEnd.lineIndex);

    const startLine = allLines[startFlatIndex];
    const endLine = allLines[endFlatIndex];
    if (!startLine || !endLine) return false;

    const beforeSelection = startLine.content.substring(0, actualStart.charIndex);
    const afterSelection = endLine.content.substring(actualEnd.charIndex);
    
    const finalContent = beforeSelection + newText + afterSelection;

    const newLines = [
      ...allLines.slice(0, startFlatIndex),
      { ...startLine, content: finalContent },
      ...allLines.slice(endFlatIndex + 1)
    ];

    if (newLines.length === 0) {
      newLines.push({ id: `line-${Date.now()}`, content: '' });
    }

    const newPages = redistributeContent(newLines);
    window.dispatchEvent(new CustomEvent('updatePages', { detail: newPages }));

    const newPosition = getPageLineFromFlatIndex(startFlatIndex, newPages);
    setCursorPosition({ ...newPosition, charIndex: beforeSelection.length + newText.length });

    setSelectedRange(null);
    setSelectionStart(null);
    return true;
  }, [
    selectedRange,
    hasValidSelection,
    getAllLines,
    getFlatIndexFromPageLine,
    redistributeContent,
    getPageLineFromFlatIndex,
    setCursorPosition,
    setSelectedRange
  ]);

  const handleMergeWithPrevious = useCallback((pageIndex: number, lineIndex: number) => {
    const allLines = getAllLines();
    const currentFlatIndex = getFlatIndexFromPageLine(pageIndex, lineIndex);
    if (currentFlatIndex <= 0) return;

    const currentLine = allLines[currentFlatIndex];
    const previousLine = allLines[currentFlatIndex - 1];
    if (!currentLine || !previousLine) return;

    const cursorCharIndex = previousLine.content.length;
    const mergedContent = previousLine.content + currentLine.content;

    const newLines = [
      ...allLines.slice(0, currentFlatIndex - 1),
      { ...previousLine, content: mergedContent },
      ...allLines.slice(currentFlatIndex + 1)
    ];

    const newPages = redistributeContent(newLines);
    window.dispatchEvent(new CustomEvent('updatePages', { detail: newPages }));

    const newPosition = getPageLineFromFlatIndex(currentFlatIndex - 1, newPages);
    setCursorPosition({ ...newPosition, charIndex: cursorCharIndex });
  }, [
    getAllLines,
    getFlatIndexFromPageLine,
    redistributeContent,
    getPageLineFromFlatIndex,
    setCursorPosition
  ]);

  const handleMergeWithNext = useCallback((pageIndex: number, lineIndex: number) => {
    const allLines = getAllLines();
    const currentFlatIndex = getFlatIndexFromPageLine(pageIndex, lineIndex);
    if (currentFlatIndex >= allLines.length - 1) return;

    const currentLine = allLines[currentFlatIndex];
    const nextLine = allLines[currentFlatIndex + 1];
    if (!currentLine || !nextLine) return;

    const cursorCharIndex = currentLine.content.length;
    const mergedContent = currentLine.content + nextLine.content;

    const newLines = [
      ...allLines.slice(0, currentFlatIndex),
      { ...currentLine, content: mergedContent },
      ...allLines.slice(currentFlatIndex + 2)
    ];

    const newPages = redistributeContent(newLines);
    window.dispatchEvent(new CustomEvent('updatePages', { detail: newPages }));

    const newPosition = getPageLineFromFlatIndex(currentFlatIndex, newPages);
    setCursorPosition({ ...newPosition, charIndex: cursorCharIndex });
  }, [
    getAllLines,
    getFlatIndexFromPageLine,
    redistributeContent,
    getPageLineFromFlatIndex,
    setCursorPosition
  ]);

  const handleAddLine = useCallback((pageIndex: number, lineIndex: number, content: string = '') => {
    addLine(pageIndex, lineIndex, content);
  }, [addLine]);

  const handleRemoveLine = useCallback((pageIndex: number, lineIndex: number) => {
    removeLine(pageIndex, lineIndex);
  }, [removeLine]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, pageIndex: number, lineIndex: number) => {
    const currentPage = pages[pageIndex];
    if (!currentPage) return;
    const currentLine = currentPage.lines[lineIndex];
    if (!currentLine) return;

    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowDown':
        e.preventDefault();
        let newPos: CursorPosition;
        if (e.key === 'ArrowUp') {
          if (lineIndex > 0) {
            newPos = { 
              pageIndex, 
              lineIndex: lineIndex - 1, 
              charIndex: Math.min(cursorPosition.charIndex, currentPage.lines[lineIndex - 1].content.length) 
            };
          } else if (pageIndex > 0) {
            const prevPage = pages[pageIndex - 1];
            const lastLineIdx = prevPage.lines.length - 1;
            newPos = { 
              pageIndex: pageIndex - 1, 
              lineIndex: lastLineIdx, 
              charIndex: Math.min(cursorPosition.charIndex, prevPage.lines[lastLineIdx].content.length) 
            };
          } else return;
        } else { // ArrowDown
          if (lineIndex < currentPage.lines.length - 1) {
            newPos = { 
              pageIndex, 
              lineIndex: lineIndex + 1, 
              charIndex: Math.min(cursorPosition.charIndex, currentPage.lines[lineIndex + 1].content.length) 
            };
          } else if (pageIndex < pages.length - 1) {
            const nextPage = pages[pageIndex + 1];
            newPos = { 
              pageIndex: pageIndex + 1, 
              lineIndex: 0, 
              charIndex: Math.min(cursorPosition.charIndex, nextPage.lines[0].content.length) 
            };
          } else return;
        }
        setCursorPosition(newPos);
        if (e.shiftKey) {
            const newSelectionStart = selectionStart || cursorPosition;
            setSelectedRange({ start: newSelectionStart, end: newPos });
        } else {
            setSelectedRange(null);
            setSelectionStart(null);
        }
        break;
    }
  }, [pages, cursorPosition, selectionStart, setCursorPosition, setSelectedRange]);

  const handleMouseDown = useCallback((e: React.MouseEvent, pageIndex: number, lineIndex: number, charIndex: number) => {
    const position = { pageIndex, lineIndex, charIndex };
    setIsSelecting(true);
    setSelectionStart(position);
    setCursorPosition(position);
    setSelectedRange({ start: position, end: position });
  }, [setCursorPosition, setSelectedRange]);

  const handleMouseMove = useCallback((e: React.MouseEvent, pageIndex: number, lineIndex: number, charIndex: number) => {
    if (!isSelecting || !selectionStart) return;
    const currentPosition = { pageIndex, lineIndex, charIndex };
    setCursorPosition(currentPosition);
    setSelectedRange({ start: selectionStart, end: currentPosition });
  }, [isSelecting, selectionStart, setSelectedRange, setCursorPosition]);



  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  useEffect(() => {
    const stopSelection = () => setIsSelecting(false);
    if (isSelecting) {
      window.addEventListener('mouseup', stopSelection);
      return () => window.removeEventListener('mouseup', stopSelection);
    }
  }, [isSelecting]);

  return {
    handleKeyDown,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleAddLine,
    handleRemoveLine,
    replaceSelectedText,
    hasValidSelection,
    handleMergeWithPrevious,
    handleMergeWithNext,
    handleContentUpdate,
  };
};
// src/hooks/useEditorFormatting.ts (COMPLETE FIXED FILE - Key fixes for formatting persistence)
'use client';

import { useState, useCallback, useRef } from 'react';
import { 
  PageData, 
  EditorLine, 
  CursorPosition, 
  SelectedRange, 
  comparePositions,
  CharacterFormatting,
  applyFormattingToRange,
  getCharacterAtPosition
} from '@/types/editor';

interface FormattingState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  blockType: string;
  fontFamily: string;
  fontSize: string;
}

interface HistoryEntry {
  pages: PageData[];
  cursorPosition: CursorPosition;
  selectedRange: SelectedRange | null;
}

export const useEditorFormatting = (
  pages: PageData[],
  cursorPosition: CursorPosition,
  selectedRange: SelectedRange | null,
  hasValidSelection: () => boolean,
  onPagesUpdate: (pages: PageData[]) => void,
  onCursorUpdate: (position: CursorPosition) => void,
  onSelectionUpdate: (range: SelectedRange | null) => void
) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentFormatting, setCurrentFormatting] = useState<FormattingState>({
    bold: false,
    italic: false,
    underline: false,
    textAlign: 'left',
    blockType: 'p',
    fontFamily: 'Inter',
    fontSize: '16pt'
  });

  // FIXED: Persistent formatting state that doesn't get cleared
  const [pendingFormatting, setPendingFormatting] = useState<Partial<CharacterFormatting>>({});
  const [isTypingWithFormatting, setIsTypingWithFormatting] = useState(false);

  const saveToHistory = useCallback(() => {
    const entry: HistoryEntry = {
      pages: JSON.parse(JSON.stringify(pages)),
      cursorPosition: { ...cursorPosition },
      selectedRange: selectedRange ? { 
        start: { ...selectedRange.start }, 
        end: { ...selectedRange.end } 
      } : null
    };

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(entry);
      const trimmedHistory = newHistory.slice(-50);
      return trimmedHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [pages, cursorPosition, selectedRange, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const entry = history[historyIndex - 1];
      onPagesUpdate(entry.pages);
      onCursorUpdate(entry.cursorPosition);
      onSelectionUpdate(entry.selectedRange);
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex, onPagesUpdate, onCursorUpdate, onSelectionUpdate]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const entry = history[historyIndex + 1];
      onPagesUpdate(entry.pages);
      onCursorUpdate(entry.cursorPosition);
      onSelectionUpdate(entry.selectedRange);
      setHistoryIndex(prev => prev + 1);
    }
  }, [history, historyIndex, onPagesUpdate, onCursorUpdate, onSelectionUpdate]);

  const applyFormattingToSelection = useCallback((formatting: Partial<CharacterFormatting>) => {
    if (!hasValidSelection() || !selectedRange) return;

    saveToHistory();
    const newPages = [...pages];
    const { start, end } = selectedRange;
    const actualStart = comparePositions(start, end) <= 0 ? start : end;
    const actualEnd = comparePositions(start, end) <= 0 ? end : start;

    for (let pageIndex = actualStart.pageIndex; pageIndex <= actualEnd.pageIndex; pageIndex++) {
      const page = newPages[pageIndex];
      if (!page) continue;

      const startLineIndex = pageIndex === actualStart.pageIndex ? actualStart.lineIndex : 0;
      const endLineIndex = pageIndex === actualEnd.pageIndex ? actualEnd.lineIndex : page.lines.length - 1;

      for (let lineIndex = startLineIndex; lineIndex <= endLineIndex; lineIndex++) {
        const line = page.lines[lineIndex];
        if (!line) continue;

        let startCharIndex = 0;
        let endCharIndex = line.content.length;

        if (pageIndex === actualStart.pageIndex && lineIndex === actualStart.lineIndex) {
          startCharIndex = actualStart.charIndex;
        }
        if (pageIndex === actualEnd.pageIndex && lineIndex === actualEnd.lineIndex) {
          endCharIndex = actualEnd.charIndex;
        }

        newPages[pageIndex].lines[lineIndex] = applyFormattingToRange(
          line,
          startCharIndex,
          endCharIndex,
          formatting
        );
      }
    }

    onPagesUpdate(newPages);
  }, [pages, selectedRange, hasValidSelection, saveToHistory, onPagesUpdate]);

  const applyBlockFormatting = useCallback((formatting: { textAlign?: string; blockType?: string }) => {
    saveToHistory();
    const newPages = [...pages];
    
    if (hasValidSelection() && selectedRange) {
      const { start, end } = selectedRange;
      const actualStart = comparePositions(start, end) <= 0 ? start : end;
      const actualEnd = comparePositions(start, end) <= 0 ? end : start;

      for (let pageIndex = actualStart.pageIndex; pageIndex <= actualEnd.pageIndex; pageIndex++) {
        const page = newPages[pageIndex];
        if (!page) continue;

        const startLineIndex = pageIndex === actualStart.pageIndex ? actualStart.lineIndex : 0;
        const endLineIndex = pageIndex === actualEnd.pageIndex ? actualEnd.lineIndex : page.lines.length - 1;

        for (let lineIndex = startLineIndex; lineIndex <= endLineIndex; lineIndex++) {
          const line = page.lines[lineIndex];
          if (!line) continue;

          newPages[pageIndex].lines[lineIndex] = {
            ...line,
            textAlign: formatting.textAlign as any || line.textAlign,
            blockType: formatting.blockType || line.blockType
          };
        }
      }
    } else {
      const currentPage = newPages[cursorPosition.pageIndex];
      if (currentPage && currentPage.lines[cursorPosition.lineIndex]) {
        newPages[cursorPosition.pageIndex].lines[cursorPosition.lineIndex] = {
          ...currentPage.lines[cursorPosition.lineIndex],
          textAlign: formatting.textAlign as any || currentPage.lines[cursorPosition.lineIndex].textAlign,
          blockType: formatting.blockType || currentPage.lines[cursorPosition.lineIndex].blockType
        };
      }
    }

    onPagesUpdate(newPages);
  }, [pages, cursorPosition, selectedRange, hasValidSelection, saveToHistory, onPagesUpdate]);

  const toggleBold = useCallback(() => {
    if (hasValidSelection()) {
      applyFormattingToSelection({ bold: !currentFormatting.bold });
    } else {
      // FIXED: Set persistent formatting for new text
      const newBoldState = !currentFormatting.bold;
      setPendingFormatting(prev => ({
        ...prev,
        bold: newBoldState
      }));
      setCurrentFormatting(prev => ({ ...prev, bold: newBoldState }));
      setIsTypingWithFormatting(true);
    }
  }, [currentFormatting.bold, hasValidSelection, applyFormattingToSelection]);

  const toggleItalic = useCallback(() => {
    if (hasValidSelection()) {
      applyFormattingToSelection({ italic: !currentFormatting.italic });
    } else {
      const newItalicState = !currentFormatting.italic;
      setPendingFormatting(prev => ({
        ...prev,
        italic: newItalicState
      }));
      setCurrentFormatting(prev => ({ ...prev, italic: newItalicState }));
      setIsTypingWithFormatting(true);
    }
  }, [currentFormatting.italic, hasValidSelection, applyFormattingToSelection]);

  const toggleUnderline = useCallback(() => {
    if (hasValidSelection()) {
      applyFormattingToSelection({ underline: !currentFormatting.underline });
    } else {
      const newUnderlineState = !currentFormatting.underline;
      setPendingFormatting(prev => ({
        ...prev,
        underline: newUnderlineState
      }));
      setCurrentFormatting(prev => ({ ...prev, underline: newUnderlineState }));
      setIsTypingWithFormatting(true);
    }
  }, [currentFormatting.underline, hasValidSelection, applyFormattingToSelection]);

  const setTextAlign = useCallback((align: 'left' | 'center' | 'right' | 'justify') => {
    applyBlockFormatting({ textAlign: align });
    setCurrentFormatting(prev => ({ ...prev, textAlign: align }));
  }, [applyBlockFormatting]);

  const setBlockType = useCallback((blockType: string) => {
    applyBlockFormatting({ blockType });
    setCurrentFormatting(prev => ({ ...prev, blockType }));
  }, [applyBlockFormatting]);

  const setFontFamily = useCallback((fontFamily: string) => {
    if (hasValidSelection()) {
      applyFormattingToSelection({ fontFamily });
    } else {
      setPendingFormatting(prev => ({
        ...prev,
        fontFamily
      }));
      setCurrentFormatting(prev => ({ ...prev, fontFamily }));
      setIsTypingWithFormatting(true);
    }
  }, [hasValidSelection, applyFormattingToSelection]);

  const setFontSize = useCallback((fontSize: string) => {
    const sizeNumber = parseInt(fontSize);
    if (hasValidSelection()) {
      applyFormattingToSelection({ fontSize: sizeNumber });
    } else {
      setPendingFormatting(prev => ({
        ...prev,
        fontSize: sizeNumber
      }));
      setCurrentFormatting(prev => ({ ...prev, fontSize }));
      setIsTypingWithFormatting(true);
    }
  }, [hasValidSelection, applyFormattingToSelection]);

  // FIXED: Only update formatting when cursor moves to different lines, preserve pending formatting
  const updateCurrentFormatting = useCallback(() => {
    // Don't update if user is actively typing with formatting
    if (isTypingWithFormatting) return;

    const currentPage = pages[cursorPosition.pageIndex];
    if (currentPage && currentPage.lines[cursorPosition.lineIndex]) {
      const currentLine = currentPage.lines[cursorPosition.lineIndex];
      
      let charFormatting: CharacterFormatting = {};
      if (cursorPosition.charIndex > 0) {
        const prevChar = getCharacterAtPosition(currentLine, cursorPosition.charIndex - 1);
        charFormatting = prevChar.formatting || {};
      } else {
        charFormatting = currentLine.formatting || {};
      }

      const newFormatting = {
        bold: charFormatting.bold || false,
        italic: charFormatting.italic || false,
        underline: charFormatting.underline || false,
        textAlign: currentLine.textAlign || 'left',
        blockType: currentLine.blockType || 'p',
        fontFamily: charFormatting.fontFamily || 'Inter',
        fontSize: charFormatting.fontSize ? `${charFormatting.fontSize}pt` : '16pt'
      };

      setCurrentFormatting(newFormatting);
      setPendingFormatting({});
    }
  }, [pages, cursorPosition, isTypingWithFormatting]);

  // FIXED: Get formatting for new text with persistence
  const getFormattingForNewText = useCallback((): CharacterFormatting => {
    if (Object.keys(pendingFormatting).length > 0) {
      return pendingFormatting;
    }

    const currentPage = pages[cursorPosition.pageIndex];
    if (currentPage && currentPage.lines[cursorPosition.lineIndex]) {
      const currentLine = currentPage.lines[cursorPosition.lineIndex];
      if (cursorPosition.charIndex > 0) {
        const prevChar = getCharacterAtPosition(currentLine, cursorPosition.charIndex - 1);
        return prevChar.formatting || {};
      }
      return currentLine.formatting || {};
    }

    return {};
  }, [pendingFormatting, pages, cursorPosition]);

  const onUserStartedTyping = useCallback(() => {
    if (history.length === 0 || historyIndex === -1) {
      saveToHistory();
    }
    // FIXED: Don't clear formatting when user starts typing
    // setIsTypingWithFormatting(false); // Remove this line
  }, [history.length, historyIndex, saveToHistory]);

  // FIXED: Reset typing state when cursor moves to different line
  const onCursorMoved = useCallback((newPosition: CursorPosition) => {
    if (newPosition.pageIndex !== cursorPosition.pageIndex || 
        newPosition.lineIndex !== cursorPosition.lineIndex) {
      setIsTypingWithFormatting(false);
      setPendingFormatting({});
    }
  }, [cursorPosition]);

  return {
    currentFormatting,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    undo,
    redo,
    toggleBold,
    toggleItalic,
    toggleUnderline,
    setTextAlign,
    setBlockType,
    setFontFamily,
    setFontSize,
    updateCurrentFormatting,
    saveToHistory,
    getFormattingForNewText,
    pendingFormatting,
    onUserStartedTyping,
    onCursorMoved
  };
};
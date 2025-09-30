// src/hooks/useEditorState.ts

'use client';

import { useState, useCallback, useEffect } from 'react';
import { PageData, EditorLine, CursorPosition, SelectedRange, Span, getLineText } from '@/types/editor';

const LINES_PER_PAGE = 35;

const createInitialLine = (): EditorLine => ({
  id: `line-${Date.now()}`,
  spans: [{ id: `span-${Date.now()}`, text: '', formatting: {} }]
});

export const useEditorState = () => {
  const [pages, setPages] = useState<PageData[]>([
    {
      id: 'page-1',
      lines: [createInitialLine()]
    }
  ]);

  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
    pageIndex: 0,
    lineIndex: 0,
    charIndex: 0,
  });

  const [selectedRange, setSelectedRange] = useState<SelectedRange | null>(null);

  useEffect(() => {
    const handleUpdatePages = (event: CustomEvent) => {
      setPages(event.detail);
    };

    window.addEventListener('updatePages', handleUpdatePages as EventListener);
    return () => {
      window.removeEventListener('updatePages', handleUpdatePages as EventListener);
    };
  }, []);

  const redistributeContent = useCallback((allLines: EditorLine[]) => {
    const newPages: PageData[] = [];
    let currentPageLines: EditorLine[] = [];
    let pageCounter = 1;

    if (allLines.length === 0) {
      allLines = [createInitialLine()];
    }

    allLines.forEach((line, index) => {
      currentPageLines.push(line);
      if (currentPageLines.length >= LINES_PER_PAGE && index < allLines.length - 1) {
        newPages.push({ id: `page-${pageCounter++}`, lines: [...currentPageLines] });
        currentPageLines = [];
      }
    });

    if (currentPageLines.length > 0) {
      newPages.push({ id: `page-${pageCounter++}`, lines: [...currentPageLines] });
    }
    
    if (newPages.length === 0) {
        newPages.push({ id: 'page-1', lines: [createInitialLine()] });
    }

    return newPages;
  }, []);

  const getAllLines = useCallback(() => pages.flatMap(page => page.lines), [pages]);

  const getPageLineFromFlatIndex = useCallback((flatIndex: number, newPages: PageData[]) => {
    let currentIndex = 0;
    for (let pageIndex = 0; pageIndex < newPages.length; pageIndex++) {
      const page = newPages[pageIndex];
      if (flatIndex >= currentIndex && flatIndex < currentIndex + page.lines.length) {
        return { pageIndex, lineIndex: flatIndex - currentIndex };
      }
      currentIndex += page.lines.length;
    }
    const lastPage = newPages[newPages.length - 1];
    return { pageIndex: newPages.length - 1, lineIndex: Math.max(0, lastPage.lines.length - 1) };
  }, []);

  const getFlatIndexFromPageLine = useCallback((pageIndex: number, lineIndex: number) => {
    if (pageIndex < 0 || pageIndex >= pages.length) return 0;
    let flatIndex = 0;
    for (let i = 0; i < pageIndex; i++) {
      flatIndex += pages[i].lines.length;
    }
    return flatIndex + lineIndex;
  }, [pages]);

  const updateLineContent = useCallback((pageIndex: number, lineIndex: number, newSpans: Span[]) => {
    const allLines = getAllLines();
    const flatIndex = getFlatIndexFromPageLine(pageIndex, lineIndex);
    
    const updatedLines = allLines.map((line, index) => {
      if (index === flatIndex) {
        const spans = newSpans.length > 0 ? newSpans : [{ id: `span-${Date.now()}`, text: '', formatting: {} }];
        return { ...line, spans };
      }
      return line;
    });

    const newPages = redistributeContent(updatedLines);
    setPages(newPages);
  }, [getAllLines, getFlatIndexFromPageLine, redistributeContent]);

  // --- FIX STARTS HERE: New function to handle splitting a line ---
  const splitLine = useCallback((pageIndex: number, lineIndex: number, charIndex: number) => {
    const allLines = getAllLines();
    const flatIndex = getFlatIndexFromPageLine(pageIndex, lineIndex);
    const currentLine = allLines[flatIndex];

    let spansBefore: Span[] = [];
    let spansAfter: Span[] = [];
    let accumulatedLength = 0;
    let splitDone = false;

    for (const span of currentLine.spans) {
      if (splitDone) {
        spansAfter.push(span);
        continue;
      }
      const spanLength = span.text.length;
      if (accumulatedLength + spanLength >= charIndex) {
        const splitPoint = charIndex - accumulatedLength;
        const textBefore = span.text.substring(0, splitPoint);
        const textAfter = span.text.substring(splitPoint);

        if (textBefore) spansBefore.push({ ...span, text: textBefore });
        if (textAfter) spansAfter.push({ ...span, text: textAfter });
        splitDone = true;
      } else {
        spansBefore.push(span);
        accumulatedLength += spanLength;
      }
    }

    const updatedCurrentLine = { ...currentLine, spans: spansBefore.length > 0 ? spansBefore : [{ id: `span-${Date.now()}`, text: '', formatting: {} }] };
    const newLine: EditorLine = { id: `line-${Date.now()}`, spans: spansAfter.length > 0 ? spansAfter : [{ id: `span-${Date.now()}`, text: '', formatting: {} }] };

    const newAllLines = [
      ...allLines.slice(0, flatIndex),
      updatedCurrentLine,
      newLine,
      ...allLines.slice(flatIndex + 1),
    ];

    const newPages = redistributeContent(newAllLines);
    setPages(newPages);

    setTimeout(() => {
      const newCursorPos = getPageLineFromFlatIndex(flatIndex + 1, newPages);
      setCursorPosition({ ...newCursorPos, charIndex: 0 });
    }, 0);
  }, [getAllLines, getFlatIndexFromPageLine, redistributeContent, getPageLineFromFlatIndex]);
  // --- FIX ENDS HERE ---

  // This function now intelligently decides whether to split or just add a line
  const addLine = useCallback((pageIndex: number, lineIndex: number, charIndex: number) => {
    splitLine(pageIndex, lineIndex, charIndex);
  }, [splitLine]);

  const removeLine = useCallback((pageIndex: number, lineIndex: number) => {
    const allLines = getAllLines();
    if (allLines.length <= 1) return;
    const flatIndex = getFlatIndexFromPageLine(pageIndex, lineIndex);
    const updatedLines = allLines.filter((_, index) => index !== flatIndex);
    const newPages = redistributeContent(updatedLines);
    setPages(newPages);
    const newFlatIndex = Math.max(0, flatIndex - 1);
    const newPosition = getPageLineFromFlatIndex(newFlatIndex, newPages);
    const targetLineText = getLineText(updatedLines[newFlatIndex]);
    setCursorPosition({ ...newPosition, charIndex: targetLineText.length });
  }, [getAllLines, getFlatIndexFromPageLine, redistributeContent, getPageLineFromFlatIndex]);
  
  const addPage = useCallback(() => {
    const newPage: PageData = { id: `page-${Date.now()}`, lines: [createInitialLine()] };
    setPages(prev => [...prev, newPage]);
    return newPage;
  }, []);

  const removePage = useCallback((pageIndex: number) => {
    if (pages.length <= 1) return;
    setPages(prev => prev.filter((_, index) => index !== pageIndex));
  }, [pages.length]);

  const updatePageContent = (pageIndex: number, lineIndex: number, content: string) => {
      const newSpans: Span[] = [{ id: `span-${Date.now()}`, text: content, formatting: {} }];
      updateLineContent(pageIndex, lineIndex, newSpans);
  };

  return {
    pages, cursorPosition, selectedRange, setPages, setCursorPosition, setSelectedRange,
    addPage, removePage, updatePageContent, updateLineContent, addLine, removeLine,
    getAllLines, getFlatIndexFromPageLine, getPageLineFromFlatIndex, redistributeContent,
  };
};
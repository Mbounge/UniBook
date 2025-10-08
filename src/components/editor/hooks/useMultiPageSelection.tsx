//src/components/editor/hooks/useMultiPageSelection.tsx

'use client';

import { useCallback, useEffect, useState, useRef } from 'react';

type DocumentPosition = {
  node: Node;
  offset: number;
};

export interface CustomSelection {
  start: DocumentPosition;
  end: DocumentPosition;
  text: string;
  startPage: number;
  endPage: number;
}

const getPreciseRectsForRange = (range: Range): DOMRect[] => {
  const rects = Array.from(range.getClientRects());
  const validRects = rects.filter(rect => rect.width > 0.5 && rect.height > 0.5);
  
  if (validRects.length === 0) return [];
  
  const uniqueRects: DOMRect[] = [];
  
  for (const rect of validRects) {
    const hasSignificantOverlap = uniqueRects.some(existing => {
      const overlapX = Math.max(0, Math.min(existing.right, rect.right) - Math.max(existing.left, rect.left));
      const overlapY = Math.max(0, Math.min(existing.bottom, rect.bottom) - Math.max(existing.top, rect.top));
      
      const overlapArea = overlapX * overlapY;
      const rectArea = rect.width * rect.height;
      const existingArea = existing.width * existing.height;
      const smallerArea = Math.min(rectArea, existingArea);
      
      return overlapArea > (smallerArea * 0.8);
    });
    
    if (!hasSignificantOverlap) {
      uniqueRects.push(rect);
    }
  }
  
  return uniqueRects;
};

const mergeRects = (rects: DOMRect[]): DOMRect[] => {
  if (rects.length < 2) {
    return rects;
  }

  const rectMap = new Map<number, DOMRect>();

  for (const rect of rects) {
    const lineTop = Math.round(rect.top);

    const existingRect = rectMap.get(lineTop);
    if (existingRect) {
      const newLeft = Math.min(existingRect.left, rect.left);
      const newRight = Math.max(existingRect.right, rect.right);
      const newTop = Math.min(existingRect.top, rect.top);
      const newBottom = Math.max(existingRect.bottom, rect.bottom);
      
      rectMap.set(lineTop, new DOMRect(
        newLeft,
        newTop,
        newRight - newLeft,
        newBottom - newTop
      ));
    } else {
      rectMap.set(lineTop, rect);
    }
  }

  return Array.from(rectMap.values());
};


export const useMultiPageSelection = (
  containerRef: React.RefObject<HTMLDivElement | null>
) => {
  const [customSelection, setCustomSelection] = useState<CustomSelection | null>(null);
  const [highlightRects, setHighlightRects] = useState<DOMRect[]>([]);
  const isSelectingRef = useRef(false);
  const selectionStartRef = useRef<DocumentPosition | null>(null);
  const animationFrameRef = useRef<number>(0);

  const getPageIndex = useCallback((element: Node | null): number => {
    if (!element || !containerRef.current) return -1;
    const targetNode = element.nodeType === Node.ELEMENT_NODE ? element : element.parentElement;
    const pageContent = (targetNode as HTMLElement)?.closest('.page-content');
    if (!pageContent) return -1;
    const pages = Array.from(containerRef.current.querySelectorAll('.page-content'));
    return pages.indexOf(pageContent as HTMLElement);
  }, [containerRef]);

  const getPositionFromPoint = (x: number, y: number): DocumentPosition | null => {
    const range = document.caretRangeFromPoint(x, y);
    return range ? { node: range.startContainer, offset: range.startOffset } : null;
  };

  const updateStateFromNativeSelection = useCallback((selection: Selection | null) => {
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setCustomSelection(null);
      setHighlightRects([]);
      return;
    }

    const range = selection.getRangeAt(0);
    const startPage = getPageIndex(range.startContainer);
    const endPage = getPageIndex(range.endContainer);

    const fragment = range.cloneContents();
    const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
    const texts: string[] = [];
    let currentNode;
    while (currentNode = walker.nextNode()) {
      texts.push(currentNode.textContent || '');
    }
    const accurateText = texts.join(' ').replace(/\s+/g, ' ').trim();

    setCustomSelection({
      start: { node: range.startContainer, offset: range.startOffset },
      end: { node: range.endContainer, offset: range.endOffset },
      text: accurateText,
      startPage,
      endPage,
    });

    const preciseRects = getPreciseRectsForRange(range);
    const mergedRects = mergeRects(preciseRects);
    setHighlightRects(mergedRects);

  }, [getPageIndex]);

  const updateSelectionFromPositions = useCallback((startPos: DocumentPosition, endPos: DocumentPosition) => {
    try {
      const selection = window.getSelection();
      if (!selection) return;

      selection.removeAllRanges();

      const range = document.createRange();
      
      range.setStart(startPos.node, startPos.offset);
      
      selection.addRange(range);
      
      try {
        selection.extend(endPos.node, endPos.offset);
      } catch (e) {
        const comparison = startPos.node.compareDocumentPosition(endPos.node);
        let isBackward = false;
        
        if (comparison & Node.DOCUMENT_POSITION_PRECEDING) {
          isBackward = true;
        } else if (comparison === 0 && startPos.offset > endPos.offset) {
          isBackward = true;
        }

        if (isBackward) {
          range.setStart(endPos.node, endPos.offset);
          range.setEnd(startPos.node, startPos.offset);
        } else {
          range.setStart(startPos.node, startPos.offset);
          range.setEnd(endPos.node, endPos.offset);
        }
        
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      updateStateFromNativeSelection(selection);
    } catch (error) {
      console.error('Error updating selection:', error);
    }
  }, [updateStateFromNativeSelection]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!containerRef.current?.contains(e.target as Node)) return;
    const target = e.target as HTMLElement;
    if (target.closest('.image-wrapper, .graph-wrapper, .template-wrapper, .math-wrapper, button, input, textarea')) {
      return;
    }

    const startPos = getPositionFromPoint(e.clientX, e.clientY);
    if (startPos) {
      isSelectingRef.current = true;
      selectionStartRef.current = startPos;
      
      if (!e.shiftKey) {
        window.getSelection()?.removeAllRanges();
        updateStateFromNativeSelection(null);
      }
    }
  }, [containerRef, updateStateFromNativeSelection]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isSelectingRef.current || !selectionStartRef.current) return;
    e.preventDefault();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const currentPos = getPositionFromPoint(e.clientX, e.clientY);
      if (currentPos) {
        updateSelectionFromPositions(selectionStartRef.current!, currentPos);
      }
    });
  }, [updateSelectionFromPositions]);

  const handleMouseUp = useCallback(() => {
    isSelectingRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (isSelectingRef.current) return;
      const selection = window.getSelection();
      updateStateFromNativeSelection(selection);
    };

    // --- NEW: Failsafe to cancel selection if mouse leaves the window ---
    const handleMouseLeaveWindow = (event: MouseEvent) => {
      if (event.relatedTarget === null && isSelectingRef.current) {
        handleMouseUp();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectionchange', handleSelectionChange);
    // Listen on the `document`'s mouseout event to detect leaving the window
    document.addEventListener('mouseout', handleMouseLeaveWindow);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseout', handleMouseLeaveWindow);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, updateStateFromNativeSelection]);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    updateStateFromNativeSelection(null);
  }, [updateStateFromNativeSelection]);

  const isMultiPageSelection = customSelection ? customSelection.startPage !== customSelection.endPage : false;
  const selectedPages = [];
  if (customSelection && customSelection.startPage !== -1 && customSelection.endPage !== -1) {
    const start = Math.min(customSelection.startPage, customSelection.endPage);
    const end = Math.max(customSelection.startPage, customSelection.endPage);
    for (let i = start; i <= end; i++) {
      selectedPages.push(i);
    }
  }

  return {
    customSelection,
    highlightRects,
    isSelecting: isSelectingRef.current,
    isMultiPageSelection,
    selectedPages,
    selectedText: customSelection?.text || '',
    clearSelection,
  };
};
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

  // Sort rects by vertical position first for better multi-page handling
  const sortedRects = [...rects].sort((a, b) => {
    const verticalDiff = a.top - b.top;
    if (Math.abs(verticalDiff) > 5) return verticalDiff;
    return a.left - b.left;
  });

  const rectMap = new Map<number, DOMRect>();

  for (const rect of sortedRects) {
    const lineTop = Math.round(rect.top / 5) * 5; // Group by 5px bands for more stable merging

    const existingRect = rectMap.get(lineTop);
    if (existingRect) {
      // Only merge if rects are horizontally adjacent or overlapping
      const horizontalGap = Math.min(
        Math.abs(rect.left - existingRect.right),
        Math.abs(existingRect.left - rect.right)
      );
      
      if (horizontalGap < 5) { // 5px tolerance for merging
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
        // Create new entry with slightly different key
        rectMap.set(lineTop + 0.1, rect);
      }
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
  const rectUpdateTimeoutRef = useRef<number>(0);
  const isUpdatingSelectionRef = useRef(false);
  const lastUpdateTimeRef = useRef<number>(0);
  const isBackwardSelectionRef = useRef(false);
  const pendingRangeRef = useRef<Range | null>(null);

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

  const updateStateFromNativeSelection = useCallback((selection: Selection | null, immediate: boolean = false) => {
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setCustomSelection(null);
      setHighlightRects([]);
      pendingRangeRef.current = null;
      return;
    }

    const range = selection.getRangeAt(0);
    
    // CRITICAL: Always use the range's actual start/end, which are always in document order
    // regardless of how the selection was made (forward or backward)
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

    // Store positions in document order (range.start is always before range.end)
    setCustomSelection({
      start: { node: range.startContainer, offset: range.startOffset },
      end: { node: range.endContainer, offset: range.endOffset },
      text: accurateText,
      startPage,
      endPage,
    });

    const updateRects = () => {
      // Use the pending range if available (for backward selections)
      const rangeToUse = pendingRangeRef.current || range;
      const preciseRects = getPreciseRectsForRange(rangeToUse);
      const mergedRects = mergeRects(preciseRects);
      setHighlightRects(mergedRects);
      lastUpdateTimeRef.current = Date.now();
      pendingRangeRef.current = null;
    };

    // For immediate updates (during active selection), update instantly
    if (immediate) {
      updateRects();
    } else {
      // For passive updates, use minimal debouncing
      if (rectUpdateTimeoutRef.current) {
        clearTimeout(rectUpdateTimeoutRef.current);
      }

      // Only debounce if we updated very recently (< 16ms ago)
      const timeSinceLastUpdate = Date.now() - lastUpdateTimeRef.current;
      const debounceDelay = timeSinceLastUpdate < 16 ? 8 : 0;

      rectUpdateTimeoutRef.current = window.setTimeout(updateRects, debounceDelay);
    }

  }, [getPageIndex]);

  const updateSelectionFromPositions = useCallback((startPos: DocumentPosition, endPos: DocumentPosition) => {
    if (isUpdatingSelectionRef.current) return; // Prevent re-entry
    
    try {
      isUpdatingSelectionRef.current = true;
      
      const selection = window.getSelection();
      if (!selection) return;

      // Determine if this is a backward selection (user is dragging up/left)
      const comparison = startPos.node.compareDocumentPosition(endPos.node);
      const isBackward = Boolean(comparison & Node.DOCUMENT_POSITION_PRECEDING) || 
                        (comparison === 0 && startPos.offset > endPos.offset);
      
      isBackwardSelectionRef.current = isBackward;

      // For backward selections, we need to handle them differently to avoid flicker
      if (isBackward) {
        // Create the range in document order (endPos comes before startPos in the document)
        const range = document.createRange();
        range.setStart(endPos.node, endPos.offset);
        range.setEnd(startPos.node, startPos.offset);
        
        // Store the range for rect calculation
        pendingRangeRef.current = range;
        
        // Now set the selection - this will be backward visually but the range is in document order
        selection.removeAllRanges();
        selection.addRange(range);
        
        // The browser will handle making it appear as a backward selection
        // But the range itself is always in document order (start before end)
        
        // Update state immediately with the correct range
        updateStateFromNativeSelection(selection, true);
      } else {
        // Forward selection - use the standard extend method
        selection.removeAllRanges();
        const range = document.createRange();
        range.setStart(startPos.node, startPos.offset);
        selection.addRange(range);
        
        try {
          selection.extend(endPos.node, endPos.offset);
        } catch (e) {
          // Fallback if extend fails
          range.setEnd(endPos.node, endPos.offset);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        
        pendingRangeRef.current = null;
        updateStateFromNativeSelection(selection, true);
      }
    } catch (error) {
      console.error('Error updating selection:', error);
    } finally {
      isUpdatingSelectionRef.current = false;
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
      isBackwardSelectionRef.current = false;
      pendingRangeRef.current = null;
      
      if (!e.shiftKey) {
        window.getSelection()?.removeAllRanges();
        updateStateFromNativeSelection(null, true);
      }
    }
  }, [containerRef, updateStateFromNativeSelection]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isSelectingRef.current || !selectionStartRef.current || !containerRef.current) return;
    e.preventDefault();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const editorRect = containerRef.current!.getBoundingClientRect();

      // Better clamping with small margin to prevent edge issues
      const margin = 2;
      const clampedX = Math.max(editorRect.left + margin, Math.min(e.clientX, editorRect.right - margin));
      const clampedY = Math.max(editorRect.top + margin, Math.min(e.clientY, editorRect.bottom - margin));

      const currentPos = getPositionFromPoint(clampedX, clampedY);
      
      if (currentPos) {
        updateSelectionFromPositions(selectionStartRef.current!, currentPos);
      }
    });
  }, [containerRef, updateSelectionFromPositions]);

  const handleMouseUp = useCallback(() => {
    isSelectingRef.current = false;
    isBackwardSelectionRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      // CRITICAL: Ignore selection changes during active mouse selection
      if (isSelectingRef.current) return;

      const selection = window.getSelection();
      updateStateFromNativeSelection(selection, false);
    };

    const handleMouseLeaveWindow = (event: MouseEvent) => {
      if (event.relatedTarget === null && isSelectingRef.current) {
        handleMouseUp();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectionchange', handleSelectionChange);
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
      if (rectUpdateTimeoutRef.current) {
        clearTimeout(rectUpdateTimeoutRef.current);
      }
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, updateStateFromNativeSelection]);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    pendingRangeRef.current = null;
    updateStateFromNativeSelection(null, true);
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
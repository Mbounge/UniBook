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

  const sortedRects = [...rects].sort((a, b) => {
    const verticalDiff = a.top - b.top;
    if (Math.abs(verticalDiff) > 5) return verticalDiff;
    return a.left - b.left;
  });

  const rectMap = new Map<number, DOMRect>();

  for (const rect of sortedRects) {
    const lineTop = Math.round(rect.top / 5) * 5;

    const existingRect = rectMap.get(lineTop);
    if (existingRect) {
      const horizontalGap = Math.min(
        Math.abs(rect.left - existingRect.right),
        Math.abs(existingRect.left - rect.right)
      );
      
      if (horizontalGap < 5) {
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
        rectMap.set(lineTop + 0.1, rect);
      }
    } else {
      rectMap.set(lineTop, rect);
    }
  }

  return Array.from(rectMap.values());
};

const getBoundaryPosition = (container: HTMLElement, findStart: boolean): DocumentPosition | null => {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node;
  const boundaryNodes: Text[] = [];
  while (node = walker.nextNode()) {
    if (node.textContent?.trim()) {
      boundaryNodes.push(node as Text);
    }
  }

  if (boundaryNodes.length === 0) return null;

  if (findStart) {
    const firstNode = boundaryNodes[0];
    return { node: firstNode, offset: 0 };
  } else {
    const lastNode = boundaryNodes[boundaryNodes.length - 1];
    return { node: lastNode, offset: lastNode.length };
  }
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

  const forceRecalculateRects = useCallback(() => {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      if (highlightRects.length > 0) setHighlightRects([]);
      return;
    }

    const liveRange = selection.getRangeAt(0);

    try {
      const preciseRects = getPreciseRectsForRange(liveRange);
      const mergedRects = mergeRects(preciseRects);
      setHighlightRects(mergedRects);
    } catch (error) {
      console.error("Failed to recalculate selection rectangles from live selection:", error);
      setHighlightRects([]);
    }
  }, [highlightRects.length]);

  const updateStateFromNativeSelection = useCallback((selection: Selection | null, immediate: boolean = false) => {
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      //console.log("[useMultiPageSelection] Clearing custom selection state.");
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

    //console.log("[useMultiPageSelection] Updating custom selection state from native selection.");
    setCustomSelection({
      start: { node: range.startContainer, offset: range.startOffset },
      end: { node: range.endContainer, offset: range.endOffset },
      text: accurateText,
      startPage,
      endPage,
    });

    const updateRects = () => {
      const preciseRects = getPreciseRectsForRange(range);
      const mergedRects = mergeRects(preciseRects);
      setHighlightRects(mergedRects);
      lastUpdateTimeRef.current = Date.now();
    };

    if (immediate) {
      updateRects();
    } else {
      if (rectUpdateTimeoutRef.current) {
        clearTimeout(rectUpdateTimeoutRef.current);
      }

      const timeSinceLastUpdate = Date.now() - lastUpdateTimeRef.current;
      const debounceDelay = timeSinceLastUpdate < 16 ? 8 : 0;

      rectUpdateTimeoutRef.current = window.setTimeout(updateRects, debounceDelay);
    }

  }, [getPageIndex]);

  const updateSelectionFromPositions = useCallback((startPos: DocumentPosition, endPos: DocumentPosition) => {
    if (isUpdatingSelectionRef.current) return;
    
    try {
      isUpdatingSelectionRef.current = true;
      
      const selection = window.getSelection();
      if (!selection) return;

      selection.setBaseAndExtent(startPos.node, startPos.offset, endPos.node, endPos.offset);
      
      updateStateFromNativeSelection(selection, true);

    } catch (error) {
      console.error('Error updating selection with setBaseAndExtent:', error);
    } finally {
      isUpdatingSelectionRef.current = false;
    }
  }, [updateStateFromNativeSelection]);

  const startTextSelection = useCallback((e: MouseEvent) => {
    //console.log("[useMultiPageSelection] startTextSelection called.");
    const startPos = getPositionFromPoint(e.clientX, e.clientY);
    if (startPos) {
      isSelectingRef.current = true;
      selectionStartRef.current = startPos;
      
      if (!e.shiftKey) {
        const selection = window.getSelection();
        if (selection) {
          selection.collapse(startPos.node, startPos.offset);
        }
        updateStateFromNativeSelection(selection, true);
      }
    }
  }, [updateStateFromNativeSelection]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isSelectingRef.current || !selectionStartRef.current || !containerRef.current) return;
    e.preventDefault();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const container = containerRef.current!;
      const editorRect = container.getBoundingClientRect();
      
      let endPos: DocumentPosition | null = null;

      const isVerticallyInside = e.clientY >= editorRect.top && e.clientY <= editorRect.bottom;
      
      if (isVerticallyInside) {
        const pos = getPositionFromPoint(e.clientX, e.clientY);
        if (pos && container.contains(pos.node)) {
          endPos = pos;
        }
      }
      
      if (!endPos) {
        if (e.clientY < editorRect.top) {
          endPos = getBoundaryPosition(container, true);
        } else if (e.clientY > editorRect.bottom) {
          endPos = getBoundaryPosition(container, false);
        }
      }

      if (endPos) {
        updateSelectionFromPositions(selectionStartRef.current!, endPos);
      }
    });
  }, [containerRef, updateSelectionFromPositions]);

  const handleMouseUp = useCallback(() => {
    if (isSelectingRef.current) {
      //console.log("[useMultiPageSelection] MouseUp detected, ending text selection.");
      isSelectingRef.current = false;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (isSelectingRef.current) return;

      const selection = window.getSelection();
      updateStateFromNativeSelection(selection, false);
    };

    const handleMouseLeaveWindow = (event: MouseEvent) => {
      if (event.relatedTarget === null && isSelectingRef.current) {
        handleMouseUp();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mouseout', handleMouseLeaveWindow);

    return () => {
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
  }, [handleMouseMove, handleMouseUp, updateStateFromNativeSelection]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !customSelection) return;

    let frameId: number;
    const handleLayoutChange = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(forceRecalculateRects);
    };

    const scrollContainer = container.parentElement;
    scrollContainer?.addEventListener('scroll', handleLayoutChange, { passive: true });

    const resizeObserver = new ResizeObserver(handleLayoutChange);
    resizeObserver.observe(container);

    forceRecalculateRects();

    return () => {
      scrollContainer?.removeEventListener('scroll', handleLayoutChange);
      resizeObserver.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [containerRef, customSelection, forceRecalculateRects]);

  const clearSelection = useCallback(() => {
    //console.log("[useMultiPageSelection] clearSelection called.");
    window.getSelection()?.removeAllRanges();
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
    forceRecalculateRects,
    startTextSelection,
  };
};
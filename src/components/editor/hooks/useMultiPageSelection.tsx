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

// Optimized rect calculation with better caching
const getRectsWithinRange = (range: Range): DOMRect[] => {
  const rects: DOMRect[] = [];
  const selector = 'p, h1, h2, h3, h4, li, blockquote, pre, .image-wrapper, .graph-wrapper, .math-wrapper, .template-wrapper';
  const commonAncestor = range.commonAncestorContainer;
  const parentElement = (commonAncestor.nodeType === Node.ELEMENT_NODE ? commonAncestor : commonAncestor.parentElement) as HTMLElement;
  if (!parentElement) return [];

  const elements = Array.from(parentElement.querySelectorAll(selector));
  
  for (const el of elements) {
    if (!range.intersectsNode(el)) continue;

    if (el.matches('.image-wrapper, .graph-wrapper, .math-wrapper, .template-wrapper')) {
      rects.push(el.getBoundingClientRect());
      continue;
    }

    const intersectionRange = range.cloneRange();
    intersectionRange.selectNodeContents(el);

    if (range.startContainer.isSameNode(el) || el.contains(range.startContainer)) {
      intersectionRange.setStart(range.startContainer, range.startOffset);
    }
    if (range.endContainer.isSameNode(el) || el.contains(range.endContainer)) {
      intersectionRange.setEnd(range.endContainer, range.endOffset);
    }
    
    rects.push(...Array.from(intersectionRange.getClientRects()));
  }
  
  if (rects.length === 0) {
    rects.push(...Array.from(range.getClientRects()));
  }

  return rects.filter(r => r.width > 0 && r.height > 0);
};

// Optimized precise rect calculation with Viewport Culling
const getPreciseRectsForSelection = (
  selection: CustomSelection | null,
  container: HTMLElement | null
): DOMRect[] => {
  if (!selection || !container) return [];

  const { start, end, startPage, endPage } = selection;
  const allPages = Array.from(container.querySelectorAll<HTMLElement>('.page-content'));
  const finalRects: DOMRect[] = [];

  if (!document.body.contains(start.node) || !document.body.contains(end.node)) {
    return [];
  }

  const minPage = Math.min(startPage, endPage);
  const maxPage = Math.max(startPage, endPage);

  // --- OPTIMIZATION: Viewport Culling ---
  // We assume the container's parent is the scrollable element (the editor viewport)
  const scrollContainer = container.parentElement;
  let viewportTop = 0;
  let viewportBottom = window.innerHeight;

  if (scrollContainer) {
    const containerRect = scrollContainer.getBoundingClientRect();
    viewportTop = containerRect.top;
    viewportBottom = containerRect.bottom;
  }

  // Buffer allows highlights to exist slightly offscreen so they don't "pop" in
  const BUFFER = 600; 

  for (let i = minPage; i <= maxPage; i++) {
    const pageContent = allPages[i];
    if (!pageContent) continue;

    // Check visibility before calculating expensive ranges
    const pageRect = pageContent.getBoundingClientRect();
    
    // If page is completely above or completely below the viewport (plus buffer), skip it
    if (pageRect.bottom < viewportTop - BUFFER || pageRect.top > viewportBottom + BUFFER) {
      continue; 
    }

    const pageRange = document.createRange();

    try {
      if (i === startPage) {
        const startNodeLength = start.node.textContent?.length ?? 0;
        pageRange.setStart(start.node, Math.min(start.offset, startNodeLength));
      } else {
        pageRange.setStart(pageContent, 0);
      }

      if (i === endPage) {
        const endNodeLength = end.node.textContent?.length ?? 0;
        pageRange.setEnd(end.node, Math.min(end.offset, endNodeLength));
      } else {
        pageRange.setEnd(pageContent, pageContent.childNodes.length);
      }

      const pageRects = getRectsWithinRange(pageRange);
      finalRects.push(...pageRects);

    } catch (error) {
      console.error("Error creating range:", error);
      continue;
    }
  }

  return finalRects;
};

// Highly optimized rect merging algorithm
const mergeRects = (rects: DOMRect[]): DOMRect[] => {
  if (rects.length < 2) return rects;

  const sorted = [...rects].sort((a, b) => {
    const vertDiff = a.top - b.top;
    return Math.abs(vertDiff) > 2 ? vertDiff : a.left - b.left;
  });

  const merged: DOMRect[] = [];
  const VERTICAL_THRESHOLD = 3;
  const HORIZONTAL_GAP = 10;

  for (const rect of sorted) {
    let wasMerged = false;
    
    for (let i = merged.length - 1; i >= 0; i--) {
      const existing = merged[i];
      
      const sameLine = Math.abs(rect.top - existing.top) < VERTICAL_THRESHOLD && 
                       Math.abs(rect.height - existing.height) < VERTICAL_THRESHOLD;
      
      if (sameLine) {
        const horizontalGap = Math.min(
          Math.abs(rect.left - existing.right),
          Math.abs(existing.left - rect.right)
        );
        
        if (horizontalGap < HORIZONTAL_GAP || rect.left <= existing.right + 1) {
          merged[i] = new DOMRect(
            Math.min(existing.left, rect.left),
            Math.min(existing.top, rect.top),
            Math.max(existing.right, rect.right) - Math.min(existing.left, rect.left),
            Math.max(existing.bottom, rect.bottom) - Math.min(existing.top, rect.top)
          );
          wasMerged = true;
          break;
        }
      }
      
      if (existing.bottom < rect.top - 20) break;
    }
    
    if (!wasMerged) {
      merged.push(rect);
    }
  }

  return merged;
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

// Helper to compare two positions
const comparePositions = (pos1: DocumentPosition, pos2: DocumentPosition): number => {
  if (pos1.node === pos2.node) {
    return pos1.offset - pos2.offset;
  }
  
  const comparison = pos1.node.compareDocumentPosition(pos2.node);
  if (comparison & Node.DOCUMENT_POSITION_FOLLOWING) {
    return -1; // pos1 comes before pos2
  } else if (comparison & Node.DOCUMENT_POSITION_PRECEDING) {
    return 1; // pos1 comes after pos2
  }
  return 0;
};

export const useMultiPageSelection = (
  containerRef: React.RefObject<HTMLDivElement | null>
) => {
  const [customSelection, setCustomSelection] = useState<CustomSelection | null>(null);
  const [highlightRects, setHighlightRects] = useState<DOMRect[]>([]);
  const isSelectingRef = useRef(false);
  const selectionStartRef = useRef<DocumentPosition | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef(0);
  const throttleDelayRef = useRef(8); // ~120fps for ultra-smooth updates
  const lockedSelectionRef = useRef<CustomSelection | null>(null);
  const pendingRectsUpdateRef = useRef<number>(0);
  
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

  // Lazy text extraction - only when needed
  const extractSelectionText = useCallback((start: DocumentPosition, end: DocumentPosition): string => {
    try {
      const range = document.createRange();
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
      
      const fragment = range.cloneContents();
      const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
      const texts: string[] = [];
      let currentNode;
      while (currentNode = walker.nextNode()) {
        const text = currentNode.textContent || '';
        if (text) texts.push(text);
      }
      return texts.join(' ').replace(/\s+/g, ' ').trim();
    } catch (error) {
      return '';
    }
  }, []);

  const updateStateFromNativeSelection = useCallback((selection: Selection | null) => {
    if (lockedSelectionRef.current) {
      return;
    }

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      if (customSelection !== null) {
        setCustomSelection(null);
      }
      return;
    }

    const range = selection.getRangeAt(0);
    const startPage = getPageIndex(range.startContainer);
    const endPage = getPageIndex(range.endContainer);

    const newSelection: CustomSelection = {
      start: { node: range.startContainer, offset: range.startOffset },
      end: { node: range.endContainer, offset: range.endOffset },
      text: '', // Defer text extraction
      startPage,
      endPage,
    };

    setCustomSelection(newSelection);
  }, [getPageIndex, customSelection]);

  // Ultra-fast rect updates with immediate rendering
  const scheduleRectsUpdate = useCallback((selection: CustomSelection) => {
    if (pendingRectsUpdateRef.current) {
      cancelAnimationFrame(pendingRectsUpdateRef.current);
    }

    // Immediate update for responsiveness
    pendingRectsUpdateRef.current = requestAnimationFrame(() => {
      try {
        const preciseRects = getPreciseRectsForSelection(selection, containerRef.current);
        const mergedRects = mergeRects(preciseRects);
        setHighlightRects(mergedRects);
      } catch (error) {
        console.error("Error calculating highlight rectangles:", error);
        setHighlightRects([]);
      }
    });
  }, [containerRef]);

  // Update rects immediately
  useEffect(() => {
    if (!customSelection) {
      if (highlightRects.length > 0) {
        setHighlightRects([]);
      }
      if (pendingRectsUpdateRef.current) {
        cancelAnimationFrame(pendingRectsUpdateRef.current);
      }
      return;
    }

    if (!document.body.contains(customSelection.start.node) || !document.body.contains(customSelection.end.node)) {
      return;
    }

    scheduleRectsUpdate(customSelection);

    return () => {
      if (pendingRectsUpdateRef.current) {
        cancelAnimationFrame(pendingRectsUpdateRef.current);
      }
    };
  }, [customSelection, containerRef, scheduleRectsUpdate, highlightRects.length]);

  const updateSelectionFromPositions = useCallback((anchorPos: DocumentPosition, focusPos: DocumentPosition) => {
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < throttleDelayRef.current) {
      return;
    }
    lastUpdateTimeRef.current = now;
    
    try {
      // Determine actual start and end based on document order (bidirectional support)
      const comparison = comparePositions(anchorPos, focusPos);
      let start: DocumentPosition;
      let end: DocumentPosition;
      
      if (comparison <= 0) {
        // Normal direction: anchor before focus
        start = anchorPos;
        end = focusPos;
      } else {
        // Reverse direction: focus before anchor
        start = focusPos;
        end = anchorPos;
      }
      
      const startPage = getPageIndex(start.node);
      const endPage = getPageIndex(end.node);

      const newSelection: CustomSelection = {
        start,
        end,
        text: '', // Defer text extraction for performance
        startPage,
        endPage,
      };

      setCustomSelection(newSelection);

      // Update native selection using setBaseAndExtent for bidirectional support
      const selection = window.getSelection();
      if (selection) {
        selection.setBaseAndExtent(anchorPos.node, anchorPos.offset, focusPos.node, focusPos.offset);
      }

    } catch (error) {
      console.error('Error updating selection:', error);
    }
  }, [getPageIndex]);

  const startTextSelection = useCallback((e: MouseEvent) => {
    const startPos = getPositionFromPoint(e.clientX, e.clientY);
    if (startPos) {
      isSelectingRef.current = true;
      selectionStartRef.current = startPos;
      lastUpdateTimeRef.current = Date.now();
      lockedSelectionRef.current = null;
      
      if (!e.shiftKey) {
        const selection = window.getSelection();
        if (selection) {
          selection.collapse(startPos.node, startPos.offset);
        }
        setCustomSelection(null);
      }
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isSelectingRef.current || !selectionStartRef.current || !containerRef.current) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Immediate update without RAF for max responsiveness
    const container = containerRef.current;
    const editorRect = container.getBoundingClientRect();
    
    let focusPos: DocumentPosition | null = null;

    const isVerticallyInside = e.clientY >= editorRect.top && e.clientY <= editorRect.bottom;
    
    if (isVerticallyInside) {
      const pos = getPositionFromPoint(e.clientX, e.clientY);
      if (pos && container.contains(pos.node)) {
        focusPos = pos;
      }
    }
    
    // Handle selection outside bounds - bidirectional
    if (!focusPos) {
      if (e.clientY < editorRect.top) {
        focusPos = getBoundaryPosition(container, true);
      } else if (e.clientY > editorRect.bottom) {
        focusPos = getBoundaryPosition(container, false);
      }
    }

    if (focusPos) {
      updateSelectionFromPositions(selectionStartRef.current!, focusPos);
    }
  }, [containerRef, updateSelectionFromPositions]);

  const handleMouseUp = useCallback(() => {
    isSelectingRef.current = false;
    lastUpdateTimeRef.current = 0;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Extract text only when selection is finalized
    if (customSelection) {
      const finalSelection: CustomSelection = {
        ...customSelection,
        text: extractSelectionText(customSelection.start, customSelection.end),
      };
      
      setCustomSelection(finalSelection);
      
      // Lock multi-page selections
      if (finalSelection.startPage !== finalSelection.endPage && 
          finalSelection.startPage !== -1 && 
          finalSelection.endPage !== -1) {
        lockedSelectionRef.current = finalSelection;
        
        try {
          const range = document.createRange();
          range.setStart(finalSelection.start.node, finalSelection.start.offset);
          range.setEnd(finalSelection.end.node, finalSelection.end.offset);
          
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } catch (error) {
          console.error("Failed to maintain multi-page selection:", error);
        }
      }
    }
  }, [customSelection, extractSelectionText]);

  const clearSelection = useCallback(() => {
    lockedSelectionRef.current = null;
    window.getSelection()?.removeAllRanges();
    setCustomSelection(null);
  }, []);

  const forceRecalculateRects = useCallback(() => {
    if (!customSelection) {
      if (highlightRects.length > 0) setHighlightRects([]);
      return;
    }
    scheduleRectsUpdate(customSelection);
  }, [customSelection, highlightRects.length, scheduleRectsUpdate]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (isSelectingRef.current || lockedSelectionRef.current) return;

      const selection = window.getSelection();
      
      if (!selection || !selection.anchorNode || !containerRef.current || !containerRef.current.contains(selection.anchorNode)) {
        if (customSelection) {
          setCustomSelection(null);
        }
        return;
      }

      updateStateFromNativeSelection(selection);
    };

    const handleMouseLeaveWindow = (event: MouseEvent) => {
      if (event.relatedTarget === null && isSelectingRef.current) {
        handleMouseUp();
      }
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
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
      if (pendingRectsUpdateRef.current) {
        cancelAnimationFrame(pendingRectsUpdateRef.current);
      }
    };
  }, [handleMouseMove, handleMouseUp, updateStateFromNativeSelection, containerRef, customSelection]);

  // Optimized layout change detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !customSelection) return;

    let frameId: number;
    let lastScrollY = 0;
    
    const handleLayoutChange = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const scrollContainer = container.parentElement;
        const currentScrollY = scrollContainer?.scrollTop || 0;
        
        // Always recalculate on scroll to update viewport culling
        lastScrollY = currentScrollY;
        forceRecalculateRects();
      });
    };

    const scrollContainer = container.parentElement;
    scrollContainer?.addEventListener('scroll', handleLayoutChange, { passive: true });

    const resizeObserver = new ResizeObserver(handleLayoutChange);
    resizeObserver.observe(container);

    return () => {
      scrollContainer?.removeEventListener('scroll', handleLayoutChange);
      resizeObserver.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [containerRef, customSelection, forceRecalculateRects]);

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
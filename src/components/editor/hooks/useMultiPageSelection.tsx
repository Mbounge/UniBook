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

const getPreciseRectsForSelection = (
  selection: CustomSelection | null,
  container: HTMLElement | null
): DOMRect[] => {
  if (!selection || !container) return [];

  const { start, end, startPage, endPage } = selection;
  const allPages = Array.from(container.querySelectorAll<HTMLElement>('.page-content'));
  const finalRects: DOMRect[] = [];

  if (!document.body.contains(start.node) || !document.body.contains(end.node)) {
    console.warn("getPreciseRectsForSelection: Stale selection node detected. Aborting.");
    return [];
  }

  const minPage = Math.min(startPage, endPage);
  const maxPage = Math.max(startPage, endPage);

  for (let i = minPage; i <= maxPage; i++) {
    const pageContent = allPages[i];
    if (!pageContent) continue;

    const pageRange = document.createRange();

    try {
      
      if (i === startPage) {
       
        const startNodeLength = start.node.textContent?.length ?? 0;
        if (start.offset > startNodeLength) {
          console.warn(`Correcting stale start offset: ${start.offset} > ${startNodeLength}`);
          pageRange.setStart(start.node, startNodeLength);
        } else {
          pageRange.setStart(start.node, start.offset);
        }
      } else {
        pageRange.setStart(pageContent, 0);
      }

     
      if (i === endPage) {
        
        const endNodeLength = end.node.textContent?.length ?? 0;
        if (end.offset > endNodeLength) {
          console.warn(`Correcting stale end offset: ${end.offset} > ${endNodeLength}`);
          pageRange.setEnd(end.node, endNodeLength);
        } else {
          pageRange.setEnd(end.node, end.offset);
        }
      } else {
        pageRange.setEnd(pageContent, pageContent.childNodes.length);
      }

      const pageRects = getRectsWithinRange(pageRange);
      finalRects.push(...pageRects);

    } catch (error) {
      console.error("Error creating range in getPreciseRectsForSelection:", error, { startNode: start.node, startOffset: start.offset, endNode: end.node, endOffset: end.offset });
      continue;
    }
  }

  return finalRects;
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

  const merged: DOMRect[] = [];
  
  for (const rect of sortedRects) {
    let wasMerged = false;
    
    
    for (let i = 0; i < merged.length; i++) {
      const existingRect = merged[i];
      
      
      const onSameLine = Math.abs(rect.top - existingRect.top) < 5 && 
                         Math.abs(rect.height - existingRect.height) < 5;
      
      if (onSameLine) {
       
        const horizontalOverlap = !(rect.right < existingRect.left || rect.left > existingRect.right);
        const horizontalGap = horizontalOverlap ? 0 : Math.min(
          Math.abs(rect.left - existingRect.right),
          Math.abs(existingRect.left - rect.right)
        );
        
        
        if (horizontalOverlap || horizontalGap < 15) {
          const newLeft = Math.min(existingRect.left, rect.left);
          const newRight = Math.max(existingRect.right, rect.right);
          const newTop = Math.min(existingRect.top, rect.top);
          const newBottom = Math.max(existingRect.bottom, rect.bottom);
          
          merged[i] = new DOMRect(
            newLeft,
            newTop,
            newRight - newLeft,
            newBottom - newTop
          );
          
          wasMerged = true;
          break;
        }
      }
      
      
      const verticalOverlap = !(rect.bottom < existingRect.top || rect.top > existingRect.bottom);
      const horizontalOverlap = !(rect.right < existingRect.left || rect.left > existingRect.right);
      
      if (verticalOverlap && horizontalOverlap) {
       
        const newLeft = Math.min(existingRect.left, rect.left);
        const newRight = Math.max(existingRect.right, rect.right);
        const newTop = Math.min(existingRect.top, rect.top);
        const newBottom = Math.max(existingRect.bottom, rect.bottom);
        
        merged[i] = new DOMRect(
          newLeft,
          newTop,
          newRight - newLeft,
          newBottom - newTop
        );
        
        wasMerged = true;
        break;
      }
    }
    
    if (!wasMerged) {
      merged.push(rect);
    }
  }

  
  const finalMerged: DOMRect[] = [];
  
  for (const rect of merged) {
    let wasMerged = false;
    
    for (let i = 0; i < finalMerged.length; i++) {
      const existingRect = finalMerged[i];
      
      const verticalOverlap = !(rect.bottom < existingRect.top || rect.top > existingRect.bottom);
      const horizontalOverlap = !(rect.right < existingRect.left || rect.left > existingRect.right);
      
      if (verticalOverlap && horizontalOverlap) {
        const newLeft = Math.min(existingRect.left, rect.left);
        const newRight = Math.max(existingRect.right, rect.right);
        const newTop = Math.min(existingRect.top, rect.top);
        const newBottom = Math.max(existingRect.bottom, rect.bottom);
        
        finalMerged[i] = new DOMRect(
          newLeft,
          newTop,
          newRight - newLeft,
          newBottom - newTop
        );
        
        wasMerged = true;
        break;
      }
    }
    
    if (!wasMerged) {
      finalMerged.push(rect);
    }
  }

  return finalMerged;
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
  const isUpdatingSelectionRef = useRef(false);
  
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
      if (customSelection !== null) {
        setCustomSelection(null);
      }
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
  }, [getPageIndex, customSelection]);

  useEffect(() => {
    if (!customSelection) {
      if (highlightRects.length > 0) {
        setHighlightRects([]);
      }
      return;
    }

    if (!document.body.contains(customSelection.start.node) || !document.body.contains(customSelection.end.node)) {
      return;
    }

    try {
      // Use the new page-aware function
      const preciseRects = getPreciseRectsForSelection(customSelection, containerRef.current);
      const mergedRects = mergeRects(preciseRects);
      setHighlightRects(mergedRects);
    } catch (error) {
      console.error("Error calculating highlight rectangles:", error);
      setHighlightRects([]);
    }
  }, [customSelection, containerRef, highlightRects.length]);


  const updateSelectionFromPositions = useCallback((startPos: DocumentPosition, endPos: DocumentPosition) => {
    if (isUpdatingSelectionRef.current) return;
    
    try {
      isUpdatingSelectionRef.current = true;
      
      const selection = window.getSelection();
      if (!selection) return;

      selection.setBaseAndExtent(startPos.node, startPos.offset, endPos.node, endPos.offset);
      
      updateStateFromNativeSelection(selection);

    } catch (error) {
      console.error('Error updating selection with setBaseAndExtent:', error);
    } finally {
      isUpdatingSelectionRef.current = false;
    }
  }, [updateStateFromNativeSelection]);

  const startTextSelection = useCallback((e: MouseEvent) => {
    const startPos = getPositionFromPoint(e.clientX, e.clientY);
    if (startPos) {
      isSelectingRef.current = true;
      selectionStartRef.current = startPos;
      
      if (!e.shiftKey) {
        const selection = window.getSelection();
        if (selection) {
          selection.collapse(startPos.node, startPos.offset);
        }
        updateStateFromNativeSelection(selection);
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
    isSelectingRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    updateStateFromNativeSelection(null);
  }, [updateStateFromNativeSelection]);

  const forceRecalculateRects = useCallback(() => {
    if (!customSelection) {
      if (highlightRects.length > 0) setHighlightRects([]);
      return;
    }
    try {
      const preciseRects = getPreciseRectsForSelection(customSelection, containerRef.current);
      const mergedRects = mergeRects(preciseRects);
      setHighlightRects(mergedRects);
    } catch (error) {
      console.error("Failed to force recalculate selection rectangles:", error);
      setHighlightRects([]);
    }
  }, [customSelection, containerRef, highlightRects.length]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (isSelectingRef.current) return;

      const selection = window.getSelection();
      
      if (!selection || !selection.anchorNode || !containerRef.current || !containerRef.current.contains(selection.anchorNode)) {
        if (customSelection) {
          clearSelection();
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
    };
  }, [handleMouseMove, handleMouseUp, updateStateFromNativeSelection, containerRef, customSelection, clearSelection]);

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
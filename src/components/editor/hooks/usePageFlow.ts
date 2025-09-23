'use client';

import { useCallback, useRef, useEffect } from 'react';

const PAGE_HEIGHT_INCHES = 11;
const PAGE_PADDING_INCHES = 1;
const CONTENT_HEIGHT_INCHES = PAGE_HEIGHT_INCHES - (PAGE_PADDING_INCHES * 2); // 9 inches
const DPI = 96; // Standard web DPI
const CONTENT_HEIGHT_PX = CONTENT_HEIGHT_INCHES * DPI; // 864px

interface CursorPosition {
  pageIndex: number;
  textOffset: number;
  containerNode: Node;
  offset: number;
}

export const usePageFlow = (editorRef: React.RefObject<HTMLDivElement | null>) => {
  const isReflowing = useRef(false);
  const reflowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollPosition = useRef(0);

  const saveCursorPosition = useCallback((): CursorPosition | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const pages = Array.from(editorRef.current?.querySelectorAll('.page-content') || []);
    
    // Find which page contains the cursor
    let pageIndex = -1;
    let pageContent: HTMLElement | null = null;
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] as HTMLElement;
      if (page.contains(range.startContainer) || page === range.startContainer) {
        pageIndex = i;
        pageContent = page;
        break;
      }
    }
    
    if (pageIndex === -1 || !pageContent) return null;
    
    // Calculate text offset within the page
    const pageRange = document.createRange();
    pageRange.selectNodeContents(pageContent);
    pageRange.setEnd(range.startContainer, range.startOffset);
    
    const textOffset = pageRange.toString().length;
    
    return {
      pageIndex,
      textOffset,
      containerNode: range.startContainer,
      offset: range.startOffset
    };
  }, [editorRef]);

  const restoreCursorPosition = useCallback((position: CursorPosition, maintainScroll: boolean = true) => {
    if (!editorRef.current) return;
    
    // Save current scroll position
    const currentScroll = window.scrollY;
    
    const pages = Array.from(editorRef.current.querySelectorAll('.page-content'));
    if (position.pageIndex >= pages.length) return;
    
    const targetPage = pages[position.pageIndex] as HTMLElement;
    
    // Try to restore to the exact same node first
    try {
      if (targetPage.contains(position.containerNode)) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStart(position.containerNode, position.offset);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        if (maintainScroll) {
          window.scrollTo(0, currentScroll);
        }
        return;
      }
    } catch (e) {
      // Fall back to text offset method
    }
    
    // Fallback: Use TreeWalker to find the correct position by text offset
    const walker = document.createTreeWalker(
      targetPage,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let currentOffset = 0;
    let node: Node | null;
    
    while ((node = walker.nextNode())) {
      const nodeLength = node.textContent?.length || 0;
      
      if (currentOffset + nodeLength >= position.textOffset) {
        const selection = window.getSelection();
        const range = document.createRange();
        
        try {
          range.setStart(node, Math.min(position.textOffset - currentOffset, nodeLength));
          range.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(range);
          
          if (maintainScroll) {
            window.scrollTo(0, currentScroll);
          }
          return;
        } catch (e) {
          // Continue to next node
        }
      }
      
      currentOffset += nodeLength;
    }
    
    // Final fallback: set cursor at the end of the page
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(targetPage);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      if (maintainScroll) {
        window.scrollTo(0, currentScroll);
      }
    } catch (e) {
      console.warn('Could not restore cursor position');
    }
  }, [editorRef]);

  const createNewPage = useCallback((): HTMLElement => {
    const pageDiv = document.createElement('div');
    pageDiv.className = 'page';
    
    const pageContent = document.createElement('div');
    pageContent.className = 'page-content';
    pageContent.contentEditable = 'true';
    pageContent.style.minHeight = `${CONTENT_HEIGHT_PX}px`;
    pageContent.style.maxHeight = `${CONTENT_HEIGHT_PX}px`;
    pageContent.style.overflow = 'hidden';
    
    pageDiv.appendChild(pageContent);
    return pageDiv;
  }, []);

  const isPageOverflowing = useCallback((pageContent: HTMLElement): boolean => {
    // Create a clone to measure without affecting the original
    const clone = pageContent.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.visibility = 'hidden';
    clone.style.height = 'auto';
    clone.style.maxHeight = 'none';
    clone.style.overflow = 'visible';
    clone.style.width = pageContent.offsetWidth + 'px';
    clone.style.left = '-9999px';
    
    document.body.appendChild(clone);
    const isOverflowing = clone.scrollHeight > CONTENT_HEIGHT_PX;
    document.body.removeChild(clone);
    
    return isOverflowing;
  }, []);

  const moveOverflowToNextPage = useCallback((pageContent: HTMLElement): HTMLElement[] => {
    const children = Array.from(pageContent.children) as HTMLElement[];
    const elementsToMove: HTMLElement[] = [];
    
    // Binary search to find the split point
    let left = 0;
    let right = children.length;
    let splitIndex = children.length;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      
      // Test if we can fit elements 0 to mid
      const testDiv = document.createElement('div');
      testDiv.className = 'page-content';
      testDiv.style.position = 'absolute';
      testDiv.style.visibility = 'hidden';
      testDiv.style.width = pageContent.offsetWidth + 'px';
      testDiv.style.left = '-9999px';
      
      for (let i = 0; i <= mid; i++) {
        testDiv.appendChild(children[i].cloneNode(true));
      }
      
      document.body.appendChild(testDiv);
      const fits = testDiv.scrollHeight <= CONTENT_HEIGHT_PX;
      document.body.removeChild(testDiv);
      
      if (fits) {
        left = mid + 1;
      } else {
        right = mid;
        splitIndex = mid;
      }
    }
    
    // Move elements from splitIndex onwards
    for (let i = splitIndex; i < children.length; i++) {
      elementsToMove.push(children[i]);
    }
    
    // Remove the elements from the current page
    elementsToMove.forEach(el => el.remove());
    
    return elementsToMove;
  }, []);

  const reflowContent = useCallback((startPageIndex: number = 0) => {
    if (!editorRef.current || isReflowing.current) return;
    
    isReflowing.current = true;
    const cursorPos = saveCursorPosition();
    lastScrollPosition.current = window.scrollY;
    
    try {
      const pages = Array.from(editorRef.current.querySelectorAll('.page'));
      
      // Only reflow if we detect actual overflow
      let needsReflow = false;
      for (let i = startPageIndex; i < pages.length; i++) {
        const pageContent = pages[i].querySelector('.page-content') as HTMLElement;
        if (pageContent && isPageOverflowing(pageContent)) {
          needsReflow = true;
          break;
        }
      }
      
      if (!needsReflow) {
        isReflowing.current = false;
        return;
      }
      
      // Collect content that needs to be redistributed
      const contentToRedistribute: HTMLElement[] = [];
      
      for (let i = startPageIndex; i < pages.length; i++) {
        const pageContent = pages[i].querySelector('.page-content') as HTMLElement;
        if (!pageContent) continue;
        
        if (isPageOverflowing(pageContent)) {
          const overflowElements = moveOverflowToNextPage(pageContent);
          contentToRedistribute.push(...overflowElements);
        }
      }
      
      // Remove empty pages from the end
      for (let i = pages.length - 1; i >= startPageIndex; i--) {
        const pageContent = pages[i].querySelector('.page-content') as HTMLElement;
        if (pageContent && pageContent.children.length === 0) {
          pages[i].remove();
        }
      }
      
      // Redistribute overflow content
      if (contentToRedistribute.length > 0) {
        let currentPageIndex = Math.max(0, pages.length - 1);
        let contentIndex = 0;
        
        while (contentIndex < contentToRedistribute.length) {
          let currentPage = pages[currentPageIndex];
          let currentPageContent: HTMLElement;
          
          if (!currentPage) {
            // Create a new page
            currentPage = createNewPage();
            currentPageContent = currentPage.querySelector('.page-content') as HTMLElement;
            editorRef.current.appendChild(currentPage);
          } else {
            currentPageContent = currentPage.querySelector('.page-content') as HTMLElement;
          }
          
          // Add elements until we would overflow
          while (contentIndex < contentToRedistribute.length) {
            const element = contentToRedistribute[contentIndex];
            currentPageContent.appendChild(element);
            
            if (isPageOverflowing(currentPageContent)) {
              // Remove the element that caused overflow
              element.remove();
              break;
            }
            
            contentIndex++;
          }
          
          currentPageIndex++;
        }
      }
      
      // Restore cursor position and scroll
      if (cursorPos) {
        setTimeout(() => {
          restoreCursorPosition(cursorPos, true);
        }, 0);
      } else {
        // Maintain scroll position
        setTimeout(() => {
          window.scrollTo(0, lastScrollPosition.current);
        }, 0);
      }
      
    } finally {
      isReflowing.current = false;
    }
  }, [editorRef, saveCursorPosition, restoreCursorPosition, createNewPage, isPageOverflowing, moveOverflowToNextPage]);

  const handleContentChange = useCallback((pageIndex: number) => {
    if (isReflowing.current) return;
    
    // Clear any existing timeout
    if (reflowTimeoutRef.current) {
      clearTimeout(reflowTimeoutRef.current);
    }
    
    // Only reflow if we detect potential overflow
    const pages = Array.from(editorRef.current?.querySelectorAll('.page-content') || []);
    const currentPage = pages[pageIndex] as HTMLElement;
    
    if (currentPage && isPageOverflowing(currentPage)) {
      // Debounce the reflow with a longer delay for smoother typing
      reflowTimeoutRef.current = setTimeout(() => {
        reflowContent(pageIndex);
      }, 500); // Increased delay for smoother experience
    }
  }, [reflowContent, editorRef, isPageOverflowing]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (reflowTimeoutRef.current) {
        clearTimeout(reflowTimeoutRef.current);
      }
    };
  }, []);

  return {
    reflowContent,
    handleContentChange,
    createNewPage,
    saveCursorPosition,
    restoreCursorPosition,
    isPageOverflowing
  };
};
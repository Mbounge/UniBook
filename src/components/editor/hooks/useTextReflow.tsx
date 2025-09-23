//src/components/editor/hooks/useTextReflow.ts

'use client';

import { useCallback, useRef } from 'react';

interface ReflowOptions {
  pageHeight: number; // in pixels
  marginTop: number;
  marginBottom: number;
}

export const useTextReflow = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  saveToHistory: (force?: boolean) => void
) => {
  const reflowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReflowingRef = useRef(false);

  const DEFAULT_OPTIONS: ReflowOptions = {
    pageHeight: 936, // Match your actual CSS minHeight for page-content
    marginTop: 0,   
    marginBottom: 0 
  };
  
  const getContentHeight = useCallback((pageContent: HTMLElement): number => {
    const range = document.createRange();
    range.selectNodeContents(pageContent);
    const rect = range.getBoundingClientRect();
    return rect.height;
  }, []);

  const getAvailableHeight = useCallback((options: ReflowOptions): number => {
    const theoreticalHeight = options.pageHeight - options.marginTop - options.marginBottom;
    return theoreticalHeight;
  }, []);

  const createNewPage = useCallback((): HTMLElement => {
    const newPageDiv = document.createElement('div');
    newPageDiv.className = 'page';
    
    const newPageContent = document.createElement('div');
    newPageContent.className = 'page-content';
    newPageContent.contentEditable = 'true';
    
    newPageDiv.appendChild(newPageContent);
    return newPageDiv;
  }, []);

  const moveContentToNextPage = useCallback((
    fromPage: HTMLElement, 
    toPage: HTMLElement, 
    availableContentHeight: number
  ): boolean => {
    const fromContent = fromPage.querySelector('.page-content') as HTMLElement;
    const toContent = toPage.querySelector('.page-content') as HTMLElement;
    
    if (!fromContent || !toContent) return false;

    let moved = false;
    const children = Array.from(fromContent.children);
    
    // Get actual content height (not CSS forced height)
    const getActualContentHeight = (content: HTMLElement): number => {
      const range = document.createRange();
      range.selectNodeContents(content);
      return range.getBoundingClientRect().height;
    };
    
    // Start from the end and move elements that cause overflow
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i] as HTMLElement;
      
      // Check actual content height vs available space
      const actualHeight = getActualContentHeight(fromContent);
      if (actualHeight <= availableContentHeight) break;
      
      // Move the element to the beginning of the next page
      const clonedChild = child.cloneNode(true) as HTMLElement;
      
      // If next page is empty, replace its content, otherwise prepend
      if (!toContent.textContent?.trim() || toContent.innerHTML === '<p><br></p>') {
        toContent.innerHTML = '';
        toContent.appendChild(clonedChild);
      } else {
        toContent.insertBefore(clonedChild, toContent.firstChild);
      }
      
      child.remove();
      moved = true;
    }

    return moved;
  }, []);

  const moveContentToPreviousPage = useCallback((
    fromPage: HTMLElement,
    toPage: HTMLElement,
    availableHeight: number
  ): boolean => {
    const fromContent = fromPage.querySelector('.page-content') as HTMLElement;
    const toContent = toPage.querySelector('.page-content') as HTMLElement;
    
    if (!fromContent || !toContent) return false;

    let moved = false;
    const children = Array.from(fromContent.children);
    
    // Move elements from the beginning of current page to end of previous page
    for (const child of children) {
      const childElement = child as HTMLElement;
      
      // Test if adding this element would exceed the height limit
      const clonedChild = childElement.cloneNode(true) as HTMLElement;
      toContent.appendChild(clonedChild);
      
      const newHeight = getContentHeight(toContent);
      if (newHeight > availableHeight) {
        // Remove the test element and stop
        clonedChild.remove();
        break;
      }
      
      // Keep the element and remove from current page
      childElement.remove();
      moved = true;
    }

    return moved;
  }, [getContentHeight]);

  const reflowContent = useCallback((options: ReflowOptions = DEFAULT_OPTIONS) => {
    if (!containerRef.current || isReflowingRef.current) return;
    
    isReflowingRef.current = true;
    const container = containerRef.current;
    const pages = Array.from(container.querySelectorAll('.page')) as HTMLElement[];
    const availableHeight = getAvailableHeight(options);
    
    let hasChanges = false;

    // Forward pass: handle overflow by moving content to next pages
    for (let i = 0; i < pages.length; i++) {
      const currentPage = pages[i];
      const currentContent = currentPage.querySelector('.page-content') as HTMLElement;
      
      if (!currentContent) continue;
      
      const contentHeight = getContentHeight(currentContent);
      
      if (contentHeight > availableHeight) {
        // Need to move content to next page
        let nextPage = pages[i + 1];
        
        if (!nextPage) {
          // Create new page
          nextPage = createNewPage();
          container.appendChild(nextPage);
          pages.push(nextPage);
        }
        
        if (moveContentToNextPage(currentPage, nextPage, availableHeight)) {
          hasChanges = true;
        }
      }
    }

    // Backward pass: fill up pages by pulling content from next pages
    for (let i = pages.length - 2; i >= 0; i--) {
      const currentPage = pages[i];
      const nextPage = pages[i + 1];
      const currentContent = currentPage.querySelector('.page-content') as HTMLElement;
      
      if (!currentContent || !nextPage) continue;
      
      const contentHeight = getContentHeight(currentContent);
      const remainingHeight = availableHeight - contentHeight;
      
      if (remainingHeight > 50) { // Only try to pull content if there's meaningful space
        if (moveContentToPreviousPage(nextPage, currentPage, availableHeight)) {
          hasChanges = true;
        }
      }
    }

    // Remove empty pages (except the first one)
    const updatedPages = Array.from(container.querySelectorAll('.page')) as HTMLElement[];
    for (let i = updatedPages.length - 1; i > 0; i--) {
      const page = updatedPages[i];
      const content = page.querySelector('.page-content') as HTMLElement;
      
      // Don't remove pages that are marked as user-active or have cursor focus
      const isUserActive = content?.hasAttribute('data-user-active');
      const hasFocus = document.activeElement === content || content?.contains(document.activeElement);
      
      // if (content && !isUserActive && !hasFocus && 
      //     (!content.textContent?.trim() || content.innerHTML === '<p><br></p>' || content.innerHTML === '<br>' || content.innerHTML === '')) {
      //   page.remove();
      //   hasChanges = true;
      // }
    }

    isReflowingRef.current = false;
    
    if (hasChanges) {
      saveToHistory(true);
    }
  }, [containerRef, getContentHeight, getAvailableHeight, createNewPage, moveContentToNextPage, moveContentToPreviousPage, saveToHistory, DEFAULT_OPTIONS]);

  const scheduleReflow = useCallback((delay: number = 100) => {
    if (reflowTimeoutRef.current) {
      clearTimeout(reflowTimeoutRef.current);
    }
    
    reflowTimeoutRef.current = setTimeout(() => {
      reflowContent();
    }, delay);
  }, [reflowContent]);

  const immediateReflow = useCallback(() => {
    if (reflowTimeoutRef.current) {
      clearTimeout(reflowTimeoutRef.current);
    }
    reflowContent();
  }, [reflowContent]);

  return {
    scheduleReflow,
    immediateReflow,
    reflowContent,
    isReflowing: () => isReflowingRef.current
  };
};
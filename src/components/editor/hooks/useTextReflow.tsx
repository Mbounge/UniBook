'use client';

import { useCallback, useRef } from 'react';

interface ReflowOptions {
  pageHeight: number; // in pixels
  marginTop: number;
  marginBottom: number;
}

// --- DIAGNOSTIC FUNCTION (Re-enabled as requested) ---
const analyzeParagraphs = (pageContent: HTMLElement, pageIndex: number) => {
  console.log(`\n--- PARAGRAPH ANALYSIS FOR PAGE ${pageIndex} ---`);
  
  const paragraphs = Array.from(pageContent.querySelectorAll('p'));
  
  if (paragraphs.length === 0) {
    console.log("No paragraphs found on this page.");
    return;
  }

  paragraphs.forEach((p, index) => {
    if (!p.textContent?.trim()) {
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(p);

    const lineRects = range.getClientRects();
    
    const uniqueTops = new Set<number>();
    for (const rect of lineRects) {
      uniqueTops.add(Math.round(rect.top));
    }
    const visualLineCount = uniqueTops.size;

    const textPreview = p.textContent.substring(0, 40).trim() + '...';

    console.log(
      `[P ${index + 1}]: "${textPreview}" occupies ${visualLineCount} visual line(s). (Raw fragments: ${lineRects.length})`
    );
  });
};

// --- HELPER FUNCTIONS (kept internal to the hook) ---

const createNewPage = (): HTMLElement => {
  const newPageDiv = document.createElement('div');
  newPageDiv.className = 'page';
  
  const newPageContent = document.createElement('div');
  newPageContent.className = 'page-content';
  newPageContent.contentEditable = 'true';
  
  newPageDiv.appendChild(newPageContent);
  return newPageDiv;
};

const moveContentToNextPage = (
  fromPage: HTMLElement, 
  toPage: HTMLElement, 
  availableContentHeight: number
): boolean => {
  const fromContent = fromPage.querySelector('.page-content') as HTMLElement;
  const toContent = toPage.querySelector('.page-content') as HTMLElement;
  
  if (!fromContent || !toContent) return false;

  let moved = false;
  const children = Array.from(fromContent.children);
  
  const contentAreaRect = fromContent.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(fromContent);
  const paddingTop = parseFloat(computedStyle.paddingTop);

  const lastChild = children[children.length - 1] as HTMLElement;
  if (!lastChild) return false;

  if (lastChild.tagName === 'P' && lastChild.textContent?.trim()) {
    const paragraphId = lastChild.dataset.paragraphId;
    if (paragraphId) {
      const nextPageFirstChild = toContent.firstElementChild as HTMLElement;

      if (nextPageFirstChild && nextPageFirstChild.dataset.paragraphId === paragraphId) {
        console.log(`%c[Reflow Action]: MERGING paragraph chain [${paragraphId}]`, "color: green; font-weight: bold;");
        
        while (nextPageFirstChild.firstChild) {
          lastChild.appendChild(nextPageFirstChild.firstChild);
        }

        if (nextPageFirstChild.dataset.splitPoint === 'end') {
          lastChild.removeAttribute('data-paragraph-id');
          lastChild.removeAttribute('data-split-point');
        } else {
          lastChild.setAttribute('data-split-point', 'start');
        }

        nextPageFirstChild.remove();
        toContent.insertBefore(lastChild, toContent.firstChild);
        moved = true;
        return moved;
      }
    }

    const range = document.createRange();
    range.selectNodeContents(lastChild);
    const lineRects = Array.from(range.getClientRects());

    let splitRectIndex = -1;
    for (let i = 0; i < lineRects.length; i++) {
      const lineBottomRelativeToContentBox = lineRects[i].bottom - (contentAreaRect.top + paddingTop);
      if (lineBottomRelativeToContentBox > availableContentHeight) {
        splitRectIndex = i;
        break;
      }
    }

    if (splitRectIndex > -1) {
      const rectsToKeep = lineRects.slice(0, splitRectIndex);
      const visualLinesToKeep = new Set(rectsToKeep.map(r => Math.round(r.top))).size;

      if (visualLinesToKeep > 0) {
        const overflowLineTop = Math.round(lineRects[splitRectIndex].top);
        const findSplitPointInDOM = (node: Node): { splitNode: Node | null, splitOffset: number } => {
          if (node.nodeType === Node.TEXT_NODE) {
            const textContent = node.textContent || '';
            for (let i = 0; i < textContent.length; i++) {
              const charRange = document.createRange();
              charRange.setStart(node, i);
              charRange.setEnd(node, i + 1);
              const charRects = charRange.getClientRects();
              if (charRects.length > 0 && Math.round(charRects[0].top) === overflowLineTop) return { splitNode: node, splitOffset: i };
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            for (const childNode of Array.from(node.childNodes)) {
              const result = findSplitPointInDOM(childNode);
              if (result.splitNode) return result;
            }
          }
          return { splitNode: null, splitOffset: 0 };
        };

        const { splitNode, splitOffset } = findSplitPointInDOM(lastChild);

        if (splitNode) {
          const moveRange = document.createRange();
          moveRange.setStart(splitNode, splitOffset);
          moveRange.setEnd(lastChild, lastChild.childNodes.length);
          const fragmentToMove = moveRange.extractContents();
          const newParagraph = document.createElement('p');
          newParagraph.appendChild(fragmentToMove);

          const existingId = lastChild.dataset.paragraphId;
          const isAlreadySplit = !!existingId;

          if (isAlreadySplit) {
            newParagraph.setAttribute('data-paragraph-id', existingId);
            newParagraph.setAttribute('data-split-point', 'end');
            const nextPiece = toContent.firstElementChild as HTMLElement;
            if (nextPiece && nextPiece.dataset.paragraphId === existingId) {
              nextPiece.removeAttribute('data-split-point');
            }
          } else {
            const newId = `para-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            lastChild.setAttribute('data-paragraph-id', newId);
            lastChild.setAttribute('data-split-point', 'start');
            newParagraph.setAttribute('data-paragraph-id', newId);
            newParagraph.setAttribute('data-split-point', 'end');
          }
          
          toContent.insertBefore(newParagraph, toContent.firstChild);
          moved = true;
        }
      } else {
        toContent.insertBefore(lastChild.cloneNode(true), toContent.firstChild);
        lastChild.remove();
        moved = true;
      }
    } else {
      toContent.insertBefore(lastChild.cloneNode(true), toContent.firstChild);
      lastChild.remove();
      moved = true;
    }
    return moved;
  }
  
  toContent.insertBefore(lastChild.cloneNode(true), toContent.firstChild);
  lastChild.remove();
  moved = true;

  return moved;
};

// --- MAIN HOOK ---
export const useTextReflow = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  saveToHistory: (force?: boolean) => void
) => {
  const reflowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReflowingRef = useRef(false);

  const DEFAULT_OPTIONS: ReflowOptions = {
    pageHeight: 1056, 
    marginTop: 96,   
    marginBottom: 96 // MODIFIED: Corresponds to 1in bottom padding
  };
  
  const getContentHeight = useCallback((pageContent: HTMLElement): number => {
    const range = document.createRange();
    range.selectNodeContents(pageContent);
    const rect = range.getBoundingClientRect();
    return rect.height;
  }, []);

  const getAvailableHeight = useCallback((options: ReflowOptions): number => {
    return options.pageHeight - options.marginTop - options.marginBottom;
  }, []);

  const moveContentToPreviousPage = useCallback((
    fromPage: HTMLElement,
    toPage: HTMLElement,
    availableHeight: number
  ): boolean => {
    const fromContent = fromPage.querySelector('.page-content') as HTMLElement;
    const toContent = toPage.querySelector('.page-content') as HTMLElement;
    
    if (!fromContent || !toContent) return false;

    const firstChild = fromContent.firstElementChild as HTMLElement;
    const lastChildOnToPage = toContent.lastChild as HTMLElement;

    if (!firstChild) return false;

    let moved = false;
    const currentContentHeight = getContentHeight(toContent);
    const remainingHeight = availableHeight - currentContentHeight;

    if (remainingHeight < 20) return false;

    if (lastChildOnToPage && lastChildOnToPage.tagName === 'P' && lastChildOnToPage.dataset.splitPoint === 'start' &&
        firstChild.tagName === 'P' && firstChild.dataset.paragraphId === lastChildOnToPage.dataset.paragraphId) {
      
      console.log(`%c[Reflow Action]: Backward MERGE detected for chain [${firstChild.dataset.paragraphId}]`, "color: purple; font-weight: bold;");
      
      const range = document.createRange();
      range.selectNodeContents(firstChild);
      const lineRects = Array.from(range.getClientRects());
      let splitRectIndex = -1;

      for (let i = 0; i < lineRects.length; i++) {
        const heightOfLines = lineRects[i].bottom - lineRects[0].top;
        if (heightOfLines < remainingHeight) {
          splitRectIndex = i + 1;
        } else {
          break;
        }
      }

      if (splitRectIndex > -1) {
        const lineToSplitAfter = lineRects[splitRectIndex - 1];
        const splitRange = document.caretRangeFromPoint(lineToSplitAfter.right, lineToSplitAfter.bottom);
        if (splitRange) {
          const rangeToMove = document.createRange();
          rangeToMove.setStart(firstChild, 0);
          rangeToMove.setEnd(splitRange.startContainer, splitRange.startOffset);
          
          const fragmentToMove = rangeToMove.extractContents();
          lastChildOnToPage.appendChild(fragmentToMove);
          moved = true;

          if (!firstChild.textContent?.trim()) {
            firstChild.remove();
            lastChildOnToPage.removeAttribute('data-split-point');
          }
        }
      }
      return moved;
    }

    const firstChildRect = firstChild.getBoundingClientRect();
    if (firstChildRect.height < remainingHeight) {
      console.log(`%c[Reflow Action]: Pulling up entire <${firstChild.tagName}> element.`, "color: purple;");
      toContent.appendChild(firstChild);
      moved = true;
    } else if (firstChild.tagName === 'P') {
      console.log(`%c[Reflow Action]: Creating new backward SPLIT on <P> element.`, "color: purple; font-weight: bold;");
      const range = document.createRange();
      range.selectNodeContents(firstChild);
      const lineRects = Array.from(range.getClientRects());
      let splitRectIndex = -1;

      for (let i = 0; i < lineRects.length; i++) {
        const heightOfLines = lineRects[i].bottom - lineRects[0].top;
        if (heightOfLines < remainingHeight) {
          splitRectIndex = i + 1;
        } else {
          break;
        }
      }

      if (splitRectIndex > -1) {
        const lineToSplitAfter = lineRects[splitRectIndex - 1];
        const splitRange = document.caretRangeFromPoint(lineToSplitAfter.right, lineToSplitAfter.bottom);
        if (splitRange) {
          const rangeToMove = document.createRange();
          rangeToMove.setStart(firstChild, 0);
          rangeToMove.setEnd(splitRange.startContainer, splitRange.startOffset);
          
          const fragmentToMove = rangeToMove.extractContents();
          const newParagraph = document.createElement('p');
          newParagraph.appendChild(fragmentToMove);
          
          const newId = `para-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          newParagraph.setAttribute('data-paragraph-id', newId);
          newParagraph.setAttribute('data-split-point', 'start');
          firstChild.setAttribute('data-paragraph-id', newId);
          firstChild.setAttribute('data-split-point', 'end');
          
          toContent.appendChild(newParagraph);
          moved = true;
        }
      }
    }

    return moved;
  }, [getContentHeight]);

  const reflowPage = useCallback((pageElement: HTMLElement, options: ReflowOptions = DEFAULT_OPTIONS): boolean => {
    if (!containerRef.current || isReflowingRef.current) return false;
    
    isReflowingRef.current = true;
    const container = containerRef.current;
    const availableHeight = getAvailableHeight(options);
    let hasChanges = false;

    const pageContent = pageElement.querySelector('.page-content') as HTMLElement;
    if (pageContent) {
      const allPages = Array.from(container.querySelectorAll('.page'));
      const pageIndex = allPages.indexOf(pageElement);
      analyzeParagraphs(pageContent, pageIndex + 1);
    }

    let nextPage = pageElement.nextElementSibling as HTMLElement;
    if (!nextPage) {
      nextPage = createNewPage();
      container.appendChild(nextPage);
    }
    
    if (moveContentToNextPage(pageElement, nextPage, availableHeight)) {
      hasChanges = true;
    }
    
    isReflowingRef.current = false;
    if(hasChanges) {
      saveToHistory(true);
    }
    return hasChanges;
  }, [containerRef, getAvailableHeight, saveToHistory, DEFAULT_OPTIONS]);

  const reflowBackwardFromPage = useCallback((pageElement: HTMLElement, options: ReflowOptions = DEFAULT_OPTIONS): boolean => {
    if (!containerRef.current || isReflowingRef.current) return false;

    isReflowingRef.current = true;
    const availableHeight = getAvailableHeight(options);
    let hasChanges = false;

    const currentContent = pageElement.querySelector('.page-content') as HTMLElement;
    const nextPage = pageElement.nextElementSibling as HTMLElement;

    if (currentContent && nextPage) {
      const contentHeight = getContentHeight(currentContent);
      if (contentHeight < availableHeight) {
        if (moveContentToPreviousPage(nextPage, pageElement, availableHeight)) {
          hasChanges = true;
          const newContentHeight = getContentHeight(currentContent);
          if (newContentHeight > availableHeight) {
            console.log(`%c[Reflow Correction]: Fast backward reflow was too aggressive. Correcting...`, 'color: #e65100;');
            moveContentToNextPage(pageElement, nextPage, availableHeight);
          }

          // --- MODIFIED: Automatic Cleanup Logic ---
          const nextPageContent = nextPage.querySelector('.page-content') as HTMLElement;
          const isNextPageEmpty = nextPageContent && nextPageContent.textContent?.trim() === '' && nextPageContent.querySelectorAll('img, .math-wrapper, .graph-wrapper, .template-wrapper').length === 0;

          // Check if the page we pulled from is now empty AND it's the last page.
          if (isNextPageEmpty && !nextPage.nextElementSibling) {
              console.log(`%c[Reflow Cleanup]: Removing empty last page after backward reflow.`, 'color: blue;');
              nextPage.remove();
          }
          // --- END MODIFICATION ---
        }
      }
    }

    isReflowingRef.current = false;
    if (hasChanges) {
      saveToHistory(true);
    }
    return hasChanges;
  }, [containerRef, getAvailableHeight, getContentHeight, moveContentToPreviousPage, saveToHistory, DEFAULT_OPTIONS]);

  const reflowContent = useCallback((options: ReflowOptions = DEFAULT_OPTIONS) => {
    if (!containerRef.current || isReflowingRef.current) return;
    
    isReflowingRef.current = true;
    const container = containerRef.current;
    let pages = Array.from(container.querySelectorAll('.page')) as HTMLElement[];
    const availableHeight = getAvailableHeight(options);
    
    let hasChanges = false;

    for (let i = 0; i < pages.length; i++) {
      const currentPage = pages[i];
      const currentContent = currentPage.querySelector('.page-content') as HTMLElement;
      if (!currentContent) continue;
      
      const contentHeight = getContentHeight(currentContent);
      if (contentHeight > availableHeight) {
        let nextPage = pages[i + 1];
        if (!nextPage) {
          nextPage = createNewPage();
          container.appendChild(nextPage);
          pages = Array.from(container.querySelectorAll('.page')) as HTMLElement[];
        }
        if (moveContentToNextPage(currentPage, nextPage, availableHeight)) {
          hasChanges = true;
        }
      }
    }

    for (let i = pages.length - 2; i >= 0; i--) {
      const currentPage = pages[i];
      const nextPage = pages[i + 1];
      const currentContent = currentPage.querySelector('.page-content') as HTMLElement;
      if (!currentContent || !nextPage) continue;
      
      const contentHeight = getContentHeight(currentContent);
      if (contentHeight < availableHeight) {
        if (moveContentToPreviousPage(nextPage, currentPage, availableHeight)) {
          hasChanges = true;
          const newContentHeight = getContentHeight(currentContent);
          if (newContentHeight > availableHeight) {
            console.log(`%c[Reflow Correction]: Backward reflow was too aggressive on page ${i + 1}. Correcting...`, 'color: #e65100;');
            moveContentToNextPage(currentPage, nextPage, availableHeight);
          }
        }
      }
    }

    const updatedPages = Array.from(container.querySelectorAll('.page')) as HTMLElement[];
    if (updatedPages.length > 1) {
      const lastPage = updatedPages[updatedPages.length - 1];
      const content = lastPage.querySelector('.page-content') as HTMLElement;

      if (content && content.textContent?.trim() === '' && content.querySelectorAll('img, .math-wrapper, .graph-wrapper, .template-wrapper').length === 0) {
        console.log(`%c[Reflow Cleanup]: Removing empty last page (${updatedPages.length}).`, 'color: blue;');
        lastPage.remove();
        hasChanges = true;
      }
    }

    isReflowingRef.current = false;
    
    if (hasChanges) {
      saveToHistory(true);
    }
  }, [containerRef, getContentHeight, getAvailableHeight, moveContentToPreviousPage, saveToHistory, DEFAULT_OPTIONS]);

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
    reflowPage,
    reflowBackwardFromPage, 
    isReflowing: () => isReflowingRef.current
  };
};
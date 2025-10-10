//src/components/editor/hooks/useTextReflow.tsx 

'use client';

import { useCallback, useRef } from 'react';

interface ReflowOptions {
  pageHeight: number;
  marginTop: number;
  marginBottom: number;
}

export const analyzeParagraphs = (pageContent: HTMLElement, pageIndex: number) => {
  // console.log(`\n--- PARAGRAPH ANALYSIS FOR PAGE ${pageIndex} ---`);
  
  const paragraphs = Array.from(pageContent.querySelectorAll('p'));
  
  if (paragraphs.length === 0) {
    // console.log("No paragraphs found on this page.");
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

    // console.log(
    //   `[P ${index + 1}]: "${textPreview}" occupies ${visualLineCount} visual line(s). (Raw fragments: ${lineRects.length})`
    // );
  });
};

const createNewPage = (): HTMLElement => {
  const newPageDiv = document.createElement('div');
  newPageDiv.className = 'page';
  
  const newPageContent = document.createElement('div');
  newPageContent.className = 'page-content';
  newPageContent.contentEditable = 'true';
  
  newPageDiv.appendChild(newPageContent);
  return newPageDiv;
};

const findLineStartOffset = (paragraph: HTMLElement, targetLineTop: number): { node: Node; offset: number } | null => {
  const walker = document.createTreeWalker(
    paragraph,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentNode: Node | null;
  while ((currentNode = walker.nextNode())) {
    const textNode = currentNode as Text;
    const textContent = textNode.textContent || '';
    
    for (let i = 0; i < textContent.length; i++) {
      const range = document.createRange();
      range.setStart(textNode, i);
      range.setEnd(textNode, i + 1);
      
      const rects = range.getClientRects();
      if (rects.length > 0) {
        const charTop = Math.round(rects[0].top);
        if (charTop === targetLineTop) {
          return { node: textNode, offset: i };
        }
      }
    }
  }
  
  return null;
};

const getUniqueLineTops = (rects: DOMRectList | DOMRect[]): number[] => {
  const tops = new Set<number>();
  for (let i = 0; i < rects.length; i++) {
    tops.add(Math.round(rects[i].top));
  }
  return Array.from(tops).sort((a, b) => a - b);
};

const measureLineHeights = (paragraph: HTMLElement): { lineTop: number; lineHeight: number }[] => {
  const range = document.createRange();
  range.selectNodeContents(paragraph);
  const lineRects = Array.from(range.getClientRects());
  const lineTops = getUniqueLineTops(lineRects);
  
  return lineTops.map(lineTop => {
    const lineRectsForThisLine = lineRects.filter(r => Math.round(r.top) === lineTop);
    const lineHeight = Math.max(...lineRectsForThisLine.map(r => r.bottom)) - lineTop;
    return { lineTop, lineHeight };
  });
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

  if (lastChild.tagName === 'UL' || lastChild.tagName === 'OL') {
    const list = lastChild;
    const listItems = Array.from(list.children) as HTMLElement[];
    if (listItems.length === 0) return false;

    let splitItemIndex = -1;
    for (let i = 0; i < listItems.length; i++) {
      const item = listItems[i];
      const itemRect = item.getBoundingClientRect();
      const itemBottomRelativeToContent = itemRect.bottom - (contentAreaRect.top + paddingTop);

      if (itemBottomRelativeToContent > availableContentHeight) {
        splitItemIndex = i;
        break;
      }
    }

    if (splitItemIndex !== -1) {
      let nextPageList = toContent.firstElementChild as HTMLElement;
      if (!nextPageList || nextPageList.tagName !== list.tagName) {
        nextPageList = document.createElement(list.tagName);
        toContent.insertBefore(nextPageList, toContent.firstChild);
      }

      const itemsToMove = listItems.slice(splitItemIndex);
      itemsToMove.forEach(item => nextPageList.insertBefore(item, nextPageList.firstChild));
      moved = true;

      if (list.tagName === 'OL') {
        const remainingItemsCount = list.children.length;
        const originalStart = parseInt(list.getAttribute('start') || '1', 10);
        nextPageList.setAttribute('start', String(originalStart + remainingItemsCount));
      }
      // Return early to prevent paragraph logic from running on this list.
      return moved;
    }
  }

  if (lastChild.tagName === 'P' && lastChild.textContent?.trim()) {
    const paragraphId = lastChild.dataset.paragraphId;
    
    if (paragraphId) {
      const nextPageFirstChild = toContent.firstElementChild as HTMLElement;

      if (nextPageFirstChild && nextPageFirstChild.dataset.paragraphId === paragraphId) {
        while (nextPageFirstChild.firstChild) {
          lastChild.appendChild(nextPageFirstChild.firstChild);
        }
        nextPageFirstChild.remove();
      }
    }

    const range = document.createRange();
    range.selectNodeContents(lastChild);
    const lineRects = Array.from(range.getClientRects());
    
    if (lineRects.length === 0) return false;

    const lineTops = getUniqueLineTops(lineRects);
    
    let splitLineIndex = -1;
    for (let i = 0; i < lineTops.length; i++) {
      const lineTop = lineTops[i];
      const lineRectsForThisLine = lineRects.filter(r => Math.round(r.top) === lineTop);
      const lineBottom = Math.max(...lineRectsForThisLine.map(r => r.bottom));
      
      const lineBottomRelativeToContentBox = lineBottom - (contentAreaRect.top + paddingTop);
      
      if (lineBottomRelativeToContentBox > availableContentHeight) {
        splitLineIndex = i;
        break;
      }
    }

    if (splitLineIndex > 0) {
      const overflowLineTop = lineTops[splitLineIndex];
      const splitPoint = findLineStartOffset(lastChild, overflowLineTop);
      
      if (splitPoint) {
        const moveRange = document.createRange();
        moveRange.setStart(splitPoint.node, splitPoint.offset);
        moveRange.setEndAfter(lastChild.lastChild!);
        
        const fragmentToMove = moveRange.extractContents();
        const newParagraph = document.createElement('p');
        
        newParagraph.style.cssText = lastChild.style.cssText;
        newParagraph.className = lastChild.className;
        
        newParagraph.appendChild(fragmentToMove);

        const existingId = lastChild.dataset.paragraphId;
        const isAlreadySplit = !!existingId;

        if (isAlreadySplit) {
          newParagraph.setAttribute('data-paragraph-id', existingId);
          newParagraph.setAttribute('data-split-point', 'end');
          lastChild.setAttribute('data-split-point', 'start');
          
          const nextPiece = toContent.firstElementChild as HTMLElement;
          if (nextPiece && nextPiece.dataset.paragraphId === existingId) {
            newParagraph.setAttribute('data-split-point', 'middle');
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
    } else if (splitLineIndex === 0) {
      toContent.insertBefore(lastChild, toContent.firstChild);
      moved = true;
    } else {
      if (paragraphId) {
        lastChild.removeAttribute('data-paragraph-id');
        lastChild.removeAttribute('data-split-point');
      }
    }
    
    return moved;
  }
  
  toContent.insertBefore(lastChild, toContent.firstChild);
  moved = true;

  return moved;
};

export const useTextReflow = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  saveToHistory: (force?: boolean) => void
) => {
  const reflowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReflowingRef = useRef(false);

  const DEFAULT_OPTIONS: ReflowOptions = {
    pageHeight: 1056, 
    marginTop: 96,   
    marginBottom: 96
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
  
  if (!fromContent || !toContent || !fromContent.firstElementChild) return false;

  

  let moved = false;
  let firstChild = fromContent.firstElementChild as HTMLElement;
  const lastChildOnToPage = toContent.lastElementChild as HTMLElement;

  if (lastChildOnToPage && (lastChildOnToPage.tagName === 'UL' || lastChildOnToPage.tagName === 'OL') && lastChildOnToPage.tagName === firstChild.tagName) {
    const toList = lastChildOnToPage;
    const fromList = firstChild;
    const fromListItems = Array.from(fromList.children) as HTMLElement[];
    if (fromListItems.length === 0) return false;

    const currentContentHeight = getContentHeight(toContent);
    const remainingHeight = availableHeight - currentContentHeight;

    const firstItemToPull = fromListItems[0];
    const itemRect = firstItemToPull.getBoundingClientRect();

    if (itemRect.height <= remainingHeight) {
      toList.appendChild(firstItemToPull);
      moved = true;

      if (fromList.children.length === 0) {
        fromList.remove();
      }
      
      if (fromList.tagName === 'OL' && fromList.hasAttribute('start')) {
        fromList.removeAttribute('start');
      }
      // Return early to prevent paragraph logic from running on this list.
      return moved;
    }
  }

  if (lastChildOnToPage && 
      lastChildOnToPage.tagName === 'P' && 
      lastChildOnToPage.dataset.splitPoint === 'start' &&
      firstChild.tagName === 'P' && 
      firstChild.dataset.paragraphId === lastChildOnToPage.dataset.paragraphId) {
    
    const currentContentHeight = getContentHeight(toContent);
    const remainingHeight = availableHeight - currentContentHeight;
    const lineInfo = measureLineHeights(firstChild);
    
    let linesToPull = 0;
    let accumulatedHeight = 0;
    
    for (let i = 0; i < lineInfo.length; i++) {
      if (accumulatedHeight + lineInfo[i].lineHeight <= remainingHeight) {
        linesToPull++;
        accumulatedHeight += lineInfo[i].lineHeight;
      } else {
        break;
      }
    }

    if (linesToPull > 0) {
      moved = true;

      if (linesToPull === lineInfo.length) {
        while (firstChild.firstChild) {
          lastChildOnToPage.appendChild(firstChild.firstChild);
        }
        firstChild.remove();
        
        const nextPiece = fromContent.firstElementChild as HTMLElement;
        if (!nextPiece || nextPiece.dataset.paragraphId !== lastChildOnToPage.dataset.paragraphId) {
          lastChildOnToPage.removeAttribute('data-split-point');
          lastChildOnToPage.removeAttribute('data-paragraph-id');
        }

      } else {
        const splitLineTop = lineInfo[linesToPull].lineTop;
        const splitPoint = findLineStartOffset(firstChild, splitLineTop);
        
        if (splitPoint) {
          const rangeToMove = document.createRange();
          rangeToMove.setStart(firstChild.firstChild!, 0);
          rangeToMove.setEnd(splitPoint.node, splitPoint.offset);
          
          const fragmentToMove = rangeToMove.extractContents();
          lastChildOnToPage.appendChild(fragmentToMove);
        }
      }
    }
    return moved;
  }

  const currentContentHeight = getContentHeight(toContent);
  const remainingHeight = availableHeight - currentContentHeight;

  if (remainingHeight < 5) return false;

  firstChild = fromContent.firstElementChild as HTMLElement;
  if (!firstChild) return false;

  if (firstChild.tagName === 'P' && firstChild.textContent?.trim()) {
    const lineInfo = measureLineHeights(firstChild);
    
    let linesToPull = 0;
    let accumulatedHeight = 0;
    
    for (let i = 0; i < lineInfo.length; i++) {
      if (accumulatedHeight + lineInfo[i].lineHeight <= remainingHeight) {
        linesToPull++;
        accumulatedHeight += lineInfo[i].lineHeight;
      } else {
        break;
      }
    }

    if (linesToPull === lineInfo.length) {
      toContent.appendChild(firstChild);
      moved = true;
    } else if (linesToPull > 0) {
      const splitLineTop = lineInfo[linesToPull].lineTop;
      const splitPoint = findLineStartOffset(firstChild, splitLineTop);
      
      if (splitPoint) {
        const rangeToMove = document.createRange();
        rangeToMove.setStart(firstChild.firstChild!, 0);
        rangeToMove.setEnd(splitPoint.node, splitPoint.offset);
        
        const fragmentToMove = rangeToMove.extractContents();
        const newParagraph = document.createElement('p');
        newParagraph.style.cssText = firstChild.style.cssText;
        newParagraph.className = firstChild.className;
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
  } else {
    const firstChildRect = firstChild.getBoundingClientRect();
    if (firstChildRect.height < remainingHeight) {
      toContent.appendChild(firstChild);
      moved = true;
    }
  }

  return moved;
}, [getContentHeight, getAvailableHeight]);

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

  // --- MODIFIED: The final, robust, iterative reflow logic ---
  const reflowBackwardFromPage = useCallback((startPageElement: HTMLElement, options: ReflowOptions = DEFAULT_OPTIONS): boolean => {
    if (!containerRef.current || isReflowingRef.current) return false;

    isReflowingRef.current = true;
    const availableHeight = getAvailableHeight(options);
    let overallChanges = false;
    let currentPage = startPageElement;

    while (currentPage) {
      let nextPage = currentPage.nextElementSibling as HTMLElement;
      if (!nextPage) break; // End of document

      let movedContentInIteration = false;
      // Keep pulling content from the next page as long as there's space and content to pull
      while (true) {
        if (!moveContentToPreviousPage(nextPage, currentPage, availableHeight)) {
          break; // Stop if we couldn't move anything
        }
        movedContentInIteration = true;
        overallChanges = true;
      }

      // After pulling, check if the next page is now empty
      const nextPageContent = nextPage.querySelector('.page-content') as HTMLElement;
      if (nextPageContent && nextPageContent.children.length === 0 && nextPageContent.textContent?.trim() === '') {
        nextPage.remove();
        overallChanges = true;
        // The loop will continue with the same currentPage, and the page after the deleted one is now the "nextPage"
        continue; 
      }
      
      // If we didn't move any content in this iteration, we are done with this chain
      if (!movedContentInIteration) {
        break;
      }
      
      // We might have over-pulled, so do a quick correction
      const currentContent = currentPage.querySelector('.page-content') as HTMLElement;
      if (getContentHeight(currentContent) > availableHeight) {
        let pageToPushTo = currentPage.nextElementSibling as HTMLElement;
        // If there's no next page (because we deleted it), we must create one
        if (!pageToPushTo) {
          pageToPushTo = createNewPage();
          containerRef.current?.appendChild(pageToPushTo);
        }
        moveContentToNextPage(currentPage, pageToPushTo, availableHeight);
      }
      
      // Move to the next page in the document to continue the reflow chain if needed
      currentPage = currentPage.nextElementSibling as HTMLElement;
    }

    isReflowingRef.current = false;
    if (overallChanges) {
      saveToHistory(true);
    }
    return overallChanges;
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
      reflowBackwardFromPage(pages[i], options);
    }

    isReflowingRef.current = false;
    
    if (hasChanges) {
      saveToHistory(true);
    }
  }, [containerRef, getContentHeight, getAvailableHeight, reflowBackwardFromPage, saveToHistory, DEFAULT_OPTIONS]);

  const reflowSplitParagraph = useCallback((paragraphId: string): boolean => {
    if (!containerRef.current || isReflowingRef.current) return false;

    isReflowingRef.current = true;

    const allPieces = Array.from(
      containerRef.current.querySelectorAll(`p[data-paragraph-id="${paragraphId}"]`)
    ) as HTMLElement[];

    if (allPieces.length === 0) {
      isReflowingRef.current = false;
      return false;
    }

    const firstPiece = allPieces[0];
    const startPage = firstPiece.closest('.page') as HTMLElement;

    if (startPage) {
      reflowBackwardFromPage(startPage);
    }

    isReflowingRef.current = false;
    
    // The reflowBackwardFromPage function now handles its own history saving.
    return true; 
  }, [containerRef, reflowBackwardFromPage]);

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
    reflowSplitParagraph,
    isReflowing: () => isReflowingRef.current
  };
};
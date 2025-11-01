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

const moveContentToNextPage = (
  fromPage: HTMLElement, 
  toPage: HTMLElement, 
  availableContentHeight: number
): boolean => {
  const fromContent = fromPage.querySelector('.page-content') as HTMLElement;
  const toContent = toPage.querySelector('.page-content') as HTMLElement;
  
  if (!fromContent || !toContent) return false;

  const children = Array.from(fromContent.children);
  if (children.length === 0) return false;

  const lastChild = children[children.length - 1] as HTMLElement;
  if (!lastChild) return false;

  if (children.length === 1) {
    toContent.insertBefore(lastChild, toContent.firstChild);
    return true;
  }

  const contentAreaRect = fromContent.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(fromContent);
  const paddingTop = parseFloat(computedStyle.paddingTop);
  
  const SAFETY_BUFFER = 10;
  const effectiveLimit = availableContentHeight - SAFETY_BUFFER;

  if (lastChild.tagName === 'UL' || lastChild.tagName === 'OL') {
    const list = lastChild;
    const listItems = Array.from(list.children) as HTMLElement[];
    if (listItems.length === 0) {
        toContent.insertBefore(lastChild, toContent.firstChild);
        return true;
    }

    let splitItemIndex = -1;
    for (let i = 0; i < listItems.length; i++) {
      const item = listItems[i];
      const itemRect = item.getBoundingClientRect();
      const itemBottomRelativeToContent = itemRect.bottom - (contentAreaRect.top + paddingTop);
      
      if (itemBottomRelativeToContent > effectiveLimit) {
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

      if (list.tagName === 'OL') {
        const remainingItemsCount = list.children.length;
        const originalStart = parseInt(list.getAttribute('start') || '1', 10);
        nextPageList.setAttribute('start', String(originalStart + remainingItemsCount));
      }
      return true;
    }
  }

  if (lastChild.tagName === 'P' && lastChild.textContent?.trim()) {
      const range = document.createRange();
      range.selectNodeContents(lastChild);
      const lineRects = Array.from(range.getClientRects());
      const lineTops = getUniqueLineTops(lineRects);
      
      let firstOverflowLineIndex = -1;
      for (let i = 0; i < lineTops.length; i++) {
        const lineTop = lineTops[i];
        const rectsForThisLine = lineRects.filter(r => Math.round(r.top) === lineTop);
        const lineBottom = Math.max(...rectsForThisLine.map(r => r.bottom));
        const lineBottomRelativeToContentBox = lineBottom - (contentAreaRect.top + paddingTop);
        
        if (lineBottomRelativeToContentBox > effectiveLimit) {
          firstOverflowLineIndex = i;
          break;
        }
      }

      if (firstOverflowLineIndex > 0) {
        const overflowLineTop = lineTops[firstOverflowLineIndex];
        const splitPoint = findLineStartOffset(lastChild, overflowLineTop);

        if (splitPoint) {
          const moveRange = document.createRange();
          moveRange.setStart(splitPoint.node, splitPoint.offset);
          moveRange.setEndAfter(lastChild.lastChild!);
          
          const fragmentToMove = moveRange.extractContents();
          const existingId = lastChild.dataset.paragraphId || `para-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          lastChild.dataset.paragraphId = existingId;
          lastChild.dataset.splitPoint = 'start';
          
          // --- MODIFICATION: Let CSS handle padding ---
          lastChild.style.marginBottom = '0px';
          // (lastChild.style as any).paddingBottom = '0'; // REMOVED THIS LINE

          const firstChildOnNextPage = toContent.firstElementChild as HTMLElement;
          if (firstChildOnNextPage && firstChildOnNextPage.dataset.paragraphId === existingId) {
            firstChildOnNextPage.insertBefore(fragmentToMove, firstChildOnNextPage.firstChild);
            if (lastChild.textContent && !/\s$/.test(lastChild.textContent) && firstChildOnNextPage.textContent && !/^\s/.test(firstChildOnNextPage.textContent)) {
                const space = document.createTextNode(' ');
                lastChild.appendChild(space);
            }
          } else {
            const newParagraph = document.createElement('p');
            newParagraph.style.cssText = lastChild.style.cssText;
            if (lastChild.className) newParagraph.className = lastChild.className;
            newParagraph.dataset.paragraphId = existingId;
            newParagraph.dataset.splitPoint = 'end';
            newParagraph.appendChild(fragmentToMove);
            toContent.insertBefore(newParagraph, toContent.firstChild);
          }
          
          console.log(`[Reflow Debug] Successfully split paragraph, leaving ${firstOverflowLineIndex} line(s) behind.`);
          return true;
        }
      }
  }
  
  console.log(`[Reflow Debug] Could not split last element gradually. Moving whole element: <${lastChild.tagName}>`);
  toContent.insertBefore(lastChild, toContent.firstChild);
  return true;
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
    const children = Array.from(pageContent.children) as HTMLElement[];
    if (children.length === 0) return 0;

    // Get the bounding rectangle of the parent content area itself.
    const parentRect = pageContent.getBoundingClientRect();
    
    // Get the bounding rectangle of the very last element inside.
    const lastChild = children[children.length - 1];
    const lastRect = lastChild.getBoundingClientRect();

    // Calculate the height from the top of the parent's content box (including its padding)
    // to the bottom of the very last element. This is immune to margin-collapsing issues
    // of the first child.
    const contentHeight = lastRect.bottom - parentRect.top;
    
    // We also need to subtract the parent's top padding to get the pure content height.
    const parentStyle = window.getComputedStyle(pageContent);
    const paddingTop = parseFloat(parentStyle.paddingTop);

    return contentHeight - paddingTop;
  }, []);

  const getAvailableHeight = useCallback((options: ReflowOptions = DEFAULT_OPTIONS): number => {
    return options.pageHeight - options.marginTop - options.marginBottom;
  }, [DEFAULT_OPTIONS]);


const reflowPage = useCallback((pageElement: HTMLElement, options: ReflowOptions = DEFAULT_OPTIONS): boolean => {
    if (!containerRef.current || isReflowingRef.current) return false;
    console.log('called')
    
    isReflowingRef.current = true;
    const container = containerRef.current;
    const availableHeight = getAvailableHeight(options);
    let hasChanges = false;
    let attempts = 0;

    const pageContent = pageElement.querySelector('.page-content') as HTMLElement;
    if (!pageContent) {
      isReflowingRef.current = false;
      return false;
    }

    const allPages = Array.from(container.querySelectorAll('.page'));
    const pageIndex = allPages.indexOf(pageElement);
    let currentContentHeight = getContentHeight(pageContent);
    const overflowAmount = currentContentHeight - availableHeight;

    if (overflowAmount > 0) {
        console.log('we made it here')
        console.log(
            `%c[Reflow Debug] Page ${pageIndex + 1} is overflowing.`,
            'color: #e11d48; font-weight: bold;',
            `\n  - Available Height: ${availableHeight.toFixed(2)}px`,
            `\n  - Used Height:      ${currentContentHeight.toFixed(2)}px`,
            `\n  - Overflow Amount:  ${overflowAmount.toFixed(2)}px`,
            `\n  - Attempting to move content...`
        );
    }
    
    while (getContentHeight(pageContent) > availableHeight && attempts < 50) {
      let nextPage = pageElement.nextElementSibling as HTMLElement;
      if (!nextPage) {
        nextPage = createNewPage();
        container.appendChild(nextPage);
      }
      
      if (pageContent.children.length === 1) {
        nextPage.querySelector('.page-content')?.insertBefore(pageContent.firstElementChild!, null);
        hasChanges = true;
        break; 
      }

      if (moveContentToNextPage(pageElement, nextPage, availableHeight)) {
        hasChanges = true;
      } else {
        console.warn("Reflow loop broke: moveContentToNextPage failed on an overflowing page.", pageElement);
        break;
      }
      attempts++;
    }
    if (attempts >= 50) console.warn("Reflow safety net triggered in reflowPage.");

    const finalContentHeight = getContentHeight(pageContent);
    const RED_LINE_THRESHOLD = 950;
    if (finalContentHeight <= RED_LINE_THRESHOLD) {
      pageContent.classList.remove('overflow-warning');
    } else {
      if (!pageContent.classList.contains('overflow-warning')) {
        pageContent.classList.add('overflow-warning');
      }
    }
    
    isReflowingRef.current = false;
    if(hasChanges) {
      saveToHistory(true);
    }
    return hasChanges;
  }, [containerRef, getAvailableHeight, getContentHeight, saveToHistory, DEFAULT_OPTIONS]);

const moveContentToPreviousPage = useCallback((
  fromPage: HTMLElement,
  toPage: HTMLElement,
  availableHeight: number
): boolean => {
  const fromContent = fromPage.querySelector('.page-content') as HTMLElement;
  const toContent = toPage.querySelector('.page-content') as HTMLElement;
  
  if (!fromContent || !toContent || !fromContent.firstElementChild) return false;

  const SAFETY_BUFFER = 2;
  const effectiveLimit = availableHeight - SAFETY_BUFFER;

  const elementToPull = fromContent.firstElementChild as HTMLElement;
  if (!elementToPull) return false;

  const currentContentHeight = getContentHeight(toContent);
  const remainingHeight = effectiveLimit - currentContentHeight;

  // If there's barely any space, don't even try.
  if (remainingHeight < 10) return false;

  // --- START: HYBRID LOGIC ---

  // CASE 1: The "fast path". The entire next element fits perfectly. Move it.
  const elementRect = elementToPull.getBoundingClientRect();
  if (elementRect.height <= remainingHeight) {
    toContent.appendChild(elementToPull);
    return true;
  }

  // CASE 2: The element is not a paragraph (e.g., an image) and it's too big. We can't split it, so we fail.
  if (elementToPull.tagName !== 'P') {
    return false;
  }

  // CASE 3: The "smart path". The element is a paragraph, but it's too big to move entirely.
  // We must perform an incremental, line-by-line pull.
  const lastParaOnToPage = toContent.lastElementChild as HTMLElement;

  // Determine our target: are we appending to an existing split paragraph, or creating a new one?
  const targetParagraph = (lastParaOnToPage?.tagName === 'P' && lastParaOnToPage.dataset.paragraphId === elementToPull.dataset.paragraphId)
    ? lastParaOnToPage
    : document.createElement('p');

  // If we created a new paragraph, style it and add it to the page.
  if (targetParagraph !== lastParaOnToPage) {
    targetParagraph.style.cssText = elementToPull.style.cssText;
    if (elementToPull.className) targetParagraph.className = elementToPull.className;
    toContent.appendChild(targetParagraph);
  }

  let movedSomething = false;
  // Loop word-by-word, pulling content from the source paragraph until the page is full.
  while (elementToPull.firstChild) {
    const nodeToPull = elementToPull.firstChild;
    
    // Create a tiny clone of the next piece of content to measure it.
    const tempNode = nodeToPull.cloneNode(true);
    if (tempNode.nodeType === Node.TEXT_NODE) {
      const text = tempNode.textContent || '';
      const firstWord = text.trim().split(/\s+/)[0] || '';
      if (!firstWord) { // If it's just whitespace, move the whole node and continue
          targetParagraph.appendChild(nodeToPull);
          continue;
      }
      tempNode.textContent = firstWord;
    }

    // Temporarily add the piece and measure the new height of the page.
    targetParagraph.appendChild(tempNode);
    const newHeight = getContentHeight(toContent);
    targetParagraph.removeChild(tempNode); // Immediately remove the temporary piece.

    // If adding this word would overflow the page, we stop.
    if (newHeight > effectiveLimit) {
      break;
    }

    // It fits! Move the word/node for real.
    if (nodeToPull.nodeType === Node.TEXT_NODE) {
      const text = nodeToPull.textContent || '';
      const firstWordWithSpace = text.substring(0, text.indexOf(' ') + 1) || text;
      targetParagraph.appendChild(document.createTextNode(firstWordWithSpace));
      
      // Remove the moved word from the source paragraph.
      nodeToPull.textContent = text.substring(firstWordWithSpace.length);
      if (!nodeToPull.textContent?.trim()) {
        nodeToPull.remove();
      }
    } else {
      // If it's not a text node (e.g., a <span>), move the whole thing.
      targetParagraph.appendChild(nodeToPull);
    }
    movedSomething = true;
  }

  // If we couldn't even fit one word, clean up the temporary paragraph we might have created.
  if (!movedSomething && targetParagraph !== lastParaOnToPage) {
    targetParagraph.remove();
  } else if (movedSomething) {
    // If we did move content, we now have a split paragraph. Tag both pieces correctly.
    const existingId = `para-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    targetParagraph.dataset.paragraphId = existingId;
    targetParagraph.dataset.splitPoint = 'start';
    elementToPull.dataset.paragraphId = existingId;
    elementToPull.dataset.splitPoint = 'end';
  }

  // If the source paragraph on the next page is now empty, remove it.
  if (!elementToPull.hasChildNodes()) {
    elementToPull.remove();
  }

  return movedSomething;
}, [getContentHeight]);

  
  
  const reflowBackwardFromPage = useCallback((startPageElement: HTMLElement, options: ReflowOptions = DEFAULT_OPTIONS): boolean => {
    if (!containerRef.current || isReflowingRef.current) return false;

    isReflowingRef.current = true;
    const availableHeight = getAvailableHeight(options);
    let overallChanges = false;
    let currentPage = startPageElement;

    while (currentPage) {
      let nextPage = currentPage.nextElementSibling as HTMLElement;
      if (!nextPage) break; // End of document

      // Step 1: Pull content backward from the next page until it's full.
      while (true) {
        if (!moveContentToPreviousPage(nextPage, currentPage, availableHeight)) {
          break; // Stop if we couldn't move anything.
        }
        overallChanges = true;
      }

      // Step 2: VERIFY. After pulling, check if the current page has overflowed.
      // This is the critical safety check that fixes the bug.
      const currentContent = currentPage.querySelector('.page-content') as HTMLElement;
      if (getContentHeight(currentContent) > availableHeight) {
        // If we overflowed, run a forward reflow to push content back down.
        reflowPage(currentPage);
      }
       
      // Step 3: CLEANUP. Only after verifying the layout, check if the next page
      // is now truly empty and can be deleted.
      const nextPageContent = nextPage.querySelector('.page-content') as HTMLElement;
      if (nextPageContent && nextPageContent.children.length === 0 && nextPageContent.textContent?.trim() === '') {
        const pageAfterNext = nextPage.nextElementSibling;
        nextPage.remove();
        overallChanges = true;
        // If we deleted a page, we need to re-evaluate from the current page
        // with the new "next" page.
        nextPage = pageAfterNext as HTMLElement; 
        if (!nextPage) break;
      }
      
      currentPage = nextPage;
    }

    // Final pass to update overflow warnings
    let checkPage: HTMLElement | null = startPageElement;
    while (checkPage) {
      const pageContent = checkPage.querySelector('.page-content') as HTMLElement;
      if (pageContent) {
        const contentHeight = getContentHeight(pageContent);
        if (contentHeight <= availableHeight) {
          pageContent.classList.remove('overflow-warning');
        }
      }
      checkPage = checkPage.nextElementSibling as HTMLElement;
    }

    isReflowingRef.current = false;
    if (overallChanges) {
      saveToHistory(true);
    }
    return overallChanges;
  }, [containerRef, getAvailableHeight, getContentHeight, moveContentToPreviousPage, reflowPage, saveToHistory, DEFAULT_OPTIONS]);

  const reflowContent = useCallback((options: ReflowOptions = DEFAULT_OPTIONS) => {
    if (!containerRef.current || isReflowingRef.current) return;
    
    isReflowingRef.current = true;
    const container = containerRef.current;
    const availableHeight = getAvailableHeight(options);
    let hasChanges = false;

    let currentPage: HTMLElement | null = container.querySelector('.page');
    while (currentPage) {
      const currentContent = currentPage.querySelector('.page-content') as HTMLElement;
      if (currentContent) {
        // Keep moving content forward until the current page is no longer overflowing
        while (getContentHeight(currentContent) > availableHeight) {
          let nextPage = currentPage.nextElementSibling as HTMLElement;
          if (!nextPage) {
            nextPage = createNewPage();
            container.appendChild(nextPage);
          }
          if (moveContentToNextPage(currentPage, nextPage, availableHeight)) {
            hasChanges = true;
          } else {
            // Safety break if content can't be moved
            break;
          }
        }
      }
      currentPage = currentPage.nextElementSibling as HTMLElement | null;
    }

    // The backward pass can now start from the last page for a full document balance
    const allPages = Array.from(container.querySelectorAll('.page')) as HTMLElement[];
    for (let i = allPages.length - 2; i >= 0; i--) {
      reflowBackwardFromPage(allPages[i], options);
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
  
    if (allPieces.length <= 1) {
      allPieces[0]?.removeAttribute('data-paragraph-id');
      allPieces[0]?.removeAttribute('data-split-point');
      isReflowingRef.current = false;
      return false;
    }
  
    const firstPiece = allPieces[0];
    const startPage = firstPiece.closest('.page') as HTMLElement;
   
    // Merge all pieces into the first piece
    for (let i = 1; i < allPieces.length; i++) {
      const nextPiece = allPieces[i];
      
      const lastText = firstPiece.textContent || '';
      const nextText = nextPiece.textContent || '';
      if (lastText && nextText && !/\s$/.test(lastText) && !/^\s/.test(nextText)) {
        firstPiece.appendChild(document.createTextNode(' '));
      }
      
      while (nextPiece.firstChild) {
        firstPiece.appendChild(nextPiece.firstChild);
      }
      nextPiece.remove();
    }
  
    // Clean up the now-merged paragraph
    firstPiece.removeAttribute('data-paragraph-id');
    firstPiece.removeAttribute('data-split-point');
    firstPiece.normalize();
  
    // IMPORTANT: Now, trigger a forward reflow on the page containing the
    // merged paragraph. This will cause it to re-split perfectly.
    if (startPage) {
      reflowPage(startPage);
    }
  
    isReflowingRef.current = false;
    saveToHistory(true);
    return true; 
  }, [containerRef, reflowPage, saveToHistory]);

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
    reflowPage,
    reflowBackwardFromPage, 
    reflowSplitParagraph,
    isReflowing: () => isReflowingRef.current,
    getContentHeight,
    getAvailableHeight,
  };
};
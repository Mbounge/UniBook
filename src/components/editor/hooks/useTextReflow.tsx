'use client';

import { useCallback, useRef, useState } from 'react';

interface ReflowOptions {
  pageHeight: number;
  marginTop: number;
  marginBottom: number;
}

export const analyzeParagraphs = (pageContent: HTMLElement, pageIndex: number) => {
  const paragraphs = Array.from(pageContent.querySelectorAll('p'));
  if (paragraphs.length === 0) { return; }
  paragraphs.forEach((p, index) => {
    if (!p.textContent?.trim()) { return; }
    const range = document.createRange();
    range.selectNodeContents(p);
    const lineRects = range.getClientRects();
    const uniqueTops = new Set<number>();
    for (const rect of lineRects) { uniqueTops.add(Math.round(rect.top)); }
  });
};

const getUniqueLineTops = (rects: DOMRectList | DOMRect[]): number[] => {
  const tops = new Set<number>();
  for (let i = 0; i < rects.length; i++) {
    tops.add(Math.round(rects[i].top));
  }
  return Array.from(tops).sort((a, b) => a - b);
};

const findLineStartOffset = (paragraph: HTMLElement, targetLineTop: number): { node: Node; offset: number } | null => {
  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT, null);
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
  if (!fromContent || !toContent || fromContent.children.length === 0) return false;

  const children = Array.from(fromContent.children);
  const lastChild = children[children.length - 1] as HTMLElement;
  if (!lastChild) return false;

  const contentAreaRect = fromContent.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(fromContent);
  const paddingTop = parseFloat(computedStyle.paddingTop);
  const SAFETY_BUFFER = 5;
  const effectiveLimit = availableContentHeight - SAFETY_BUFFER;

  // --- NEW: Handle table splitting ---
  if (lastChild.tagName === 'TABLE') {
    const tbody = lastChild.querySelector('tbody');
    if (!tbody) return false; // Can't split if there's no body
    
    const rows = Array.from(tbody.children) as HTMLElement[];
    let firstOverflowRowIndex = -1;

    for (let i = 0; i < rows.length; i++) {
      const rowRect = rows[i].getBoundingClientRect();
      const rowBottomRelativeToContent = rowRect.bottom - (contentAreaRect.top + paddingTop);
      if (rowBottomRelativeToContent > effectiveLimit) {
        firstOverflowRowIndex = i;
        break;
      }
    }

    // We only split if there's at least one row left on the current page
    if (firstOverflowRowIndex > 0 && firstOverflowRowIndex < rows.length) {
      const tableId = lastChild.dataset.tableId || `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      lastChild.dataset.tableId = tableId;

      // Check if the next page already has the second part of this table
      let nextTablePart = toContent.firstElementChild as HTMLElement;
      if (!nextTablePart || nextTablePart.dataset.tableId !== tableId) {
        const newTable = document.createElement('table');
        // Copy classes and styles
        if (lastChild.className) newTable.className = lastChild.className;
        newTable.style.cssText = lastChild.style.cssText;
        newTable.dataset.tableId = tableId;
        const newTbody = document.createElement('tbody');
        newTable.appendChild(newTbody);
        toContent.insertBefore(newTable, toContent.firstChild);
        nextTablePart = newTable;
      }

      const nextTbody = nextTablePart.querySelector('tbody');
      if (nextTbody) {
        const rowsToMove = rows.slice(firstOverflowRowIndex);
        // Move rows in reverse order to prepend them correctly
        for (let i = rowsToMove.length - 1; i >= 0; i--) {
          nextTbody.insertBefore(rowsToMove[i], nextTbody.firstChild);
        }
        return true; // We successfully split the table
      }
    }
  }

  // --- NEW: Handle list splitting (UL and OL) ---
  if (['UL', 'OL'].includes(lastChild.tagName)) {
    const listItems = Array.from(lastChild.children) as HTMLElement[];
    let firstOverflowItemIndex = -1;

    for (let i = 0; i < listItems.length; i++) {
      const itemRect = listItems[i].getBoundingClientRect();
      const itemBottomRelativeToContent = itemRect.bottom - (contentAreaRect.top + paddingTop);
      if (itemBottomRelativeToContent > effectiveLimit) {
        firstOverflowItemIndex = i;
        break;
      }
    }

    if (firstOverflowItemIndex > 0 && firstOverflowItemIndex < listItems.length) {
      const listId = lastChild.dataset.listId || `list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      lastChild.dataset.listId = listId;

      let nextListPart = toContent.firstElementChild as HTMLElement;
      if (!nextListPart || nextListPart.dataset.listId !== listId) {
        const newList = document.createElement(lastChild.tagName);
        if (lastChild.className) newList.className = lastChild.className;
        newList.style.cssText = lastChild.style.cssText;
        newList.dataset.listId = listId;
        toContent.insertBefore(newList, toContent.firstChild);
        nextListPart = newList;
      }

      const itemsToMove = listItems.slice(firstOverflowItemIndex);
      for (let i = itemsToMove.length - 1; i >= 0; i--) {
        nextListPart.insertBefore(itemsToMove[i], nextListPart.firstChild);
      }
      return true; // We successfully split the list
    }
  }

  // --- EXISTING: Paragraph splitting logic (now as a fallback) ---
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

      if (firstOverflowLineIndex > 0 && firstOverflowLineIndex < lineTops.length) {
        const overflowLineTop = lineTops[firstOverflowLineIndex];
        const splitPoint = findLineStartOffset(lastChild, overflowLineTop);
        if (splitPoint) {
          const moveRange = document.createRange();
          moveRange.setStart(splitPoint.node, splitPoint.offset);
          moveRange.setEndAfter(lastChild.lastChild || lastChild);
          const fragmentToMove = moveRange.extractContents();
          const existingId = lastChild.dataset.paragraphId || `para-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          lastChild.dataset.paragraphId = existingId;
          lastChild.dataset.splitPoint = 'start';
          lastChild.style.paddingBottom = '0px';

          const firstChildOnNextPage = toContent.firstElementChild as HTMLElement;
          if (firstChildOnNextPage && firstChildOnNextPage.dataset.paragraphId === existingId) {
            firstChildOnNextPage.insertBefore(fragmentToMove, firstChildOnNextPage.firstChild);
          } else {
            const newParagraph = document.createElement('p');
            newParagraph.style.cssText = lastChild.style.cssText;
            if (lastChild.className) newParagraph.className = lastChild.className;
            newParagraph.dataset.paragraphId = existingId;
            newParagraph.dataset.splitPoint = 'end';
            newParagraph.style.paddingBottom = '1.25rem';
            newParagraph.appendChild(fragmentToMove);
            toContent.insertBefore(newParagraph, toContent.firstChild);
          }
          return true;
        }
      }
  }

  // --- FALLBACK: Move the entire element if it can't be split ---
  toContent.insertBefore(lastChild, toContent.firstChild);
  return true;
};

export const useTextReflow = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  saveToHistory: (force?: boolean) => void
) => {
  const reflowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReflowingRef = useRef(false);
  const [isReflowingState, setIsReflowingState] = useState(false);

  const DEFAULT_OPTIONS: ReflowOptions = {
    pageHeight: 1056, 
    marginTop: 96,   
    marginBottom: 96
  };
  
  const getContentHeight = useCallback((pageContent: HTMLElement): number => {
    const children = Array.from(pageContent.children) as HTMLElement[];
    if (children.length === 0) return 0;
    const parentRect = pageContent.getBoundingClientRect();
    const lastChild = children[children.length - 1];
    const lastRect = lastChild.getBoundingClientRect();
    const contentHeight = lastRect.bottom - parentRect.top;
    const parentStyle = window.getComputedStyle(pageContent);
    const paddingTop = parseFloat(parentStyle.paddingTop);
    return contentHeight - paddingTop;
  }, []);

  const getAvailableHeight = useCallback((options: ReflowOptions = DEFAULT_OPTIONS): number => {
    return options.pageHeight - options.marginTop - options.marginBottom;
  }, [DEFAULT_OPTIONS]);

  const reflowPage = useCallback((pageElement: HTMLElement, options: ReflowOptions = DEFAULT_OPTIONS): boolean => {
    // This function is now an alias for fullReflowPage for simplicity,
    // but kept for any potential legacy calls.
    return fullReflowPage(pageElement, options);
  }, []);

  const reflowSplitParagraph = useCallback((paragraphId: string): boolean => {
    if (!containerRef.current) return false;
  
    const allPieces = Array.from(
      containerRef.current.querySelectorAll(`p[data-paragraph-id="${paragraphId}"]`)
    ) as HTMLElement[];
  
    if (allPieces.length <= 1) {
      if (allPieces[0]) {
        allPieces[0].removeAttribute('data-paragraph-id');
        allPieces[0].removeAttribute('data-split-point');
        allPieces[0].style.paddingBottom = '1.25rem';
      }
      return false;
    }
  
    const firstPiece = allPieces[0];
    const startPage = firstPiece.closest('.page') as HTMLElement;
   
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
  
    firstPiece.removeAttribute('data-paragraph-id');
    firstPiece.removeAttribute('data-split-point');
    firstPiece.style.paddingBottom = '1.25rem';
    firstPiece.normalize();
  
    if (startPage) {
      setTimeout(() => reflowPage(startPage), 0);
    }
  
    saveToHistory(true);
    return true; 
  }, [containerRef, saveToHistory, reflowPage]);

  const reflowSplitTable = useCallback((tableId: string): boolean => {
    if (!containerRef.current) return false;

    const allPieces = Array.from(
      containerRef.current.querySelectorAll(`table[data-table-id="${tableId}"]`)
    ) as HTMLElement[];

    if (allPieces.length <= 1) {
      if (allPieces[0]) {
        allPieces[0].removeAttribute('data-table-id');
      }
      return false;
    }

    const firstPiece = allPieces[0];
    const firstTbody = firstPiece.querySelector('tbody');
    const startPage = firstPiece.closest('.page') as HTMLElement;

    if (!firstTbody) return false;

    for (let i = 1; i < allPieces.length; i++) {
      const nextPiece = allPieces[i];
      const nextTbody = nextPiece.querySelector('tbody');
      if (nextTbody) {
        while (nextTbody.firstChild) {
          firstTbody.appendChild(nextTbody.firstChild);
        }
      }
      nextPiece.remove();
    }

    firstPiece.removeAttribute('data-table-id');

    if (startPage) {
      setTimeout(() => reflowPage(startPage), 0);
    }

    saveToHistory(true);
    return true;
  }, [containerRef, saveToHistory, reflowPage]);

  const reflowSplitList = useCallback((listId: string): boolean => {
    if (!containerRef.current) return false;

    const allPieces = Array.from(
      containerRef.current.querySelectorAll(`[data-list-id="${listId}"]`)
    ) as HTMLElement[];

    if (allPieces.length <= 1) {
      if (allPieces[0]) {
        allPieces[0].removeAttribute('data-list-id');
      }
      return false;
    }
    
    const firstPiece = allPieces[0];
    const startPage = firstPiece.closest('.page') as HTMLElement;

    for (let i = 1; i < allPieces.length; i++) {
      const nextPiece = allPieces[i];
      while (nextPiece.firstChild) {
        firstPiece.appendChild(nextPiece.firstChild);
      }
      nextPiece.remove();
    }

    firstPiece.removeAttribute('data-list-id');

    if (startPage) {
      setTimeout(() => reflowPage(startPage), 0);
    }

    saveToHistory(true);
    return true;
  }, [containerRef, saveToHistory, reflowPage]);
  
  const fullReflowPage = useCallback((pageElement: HTMLElement, options: ReflowOptions = DEFAULT_OPTIONS): boolean => {
    if (!containerRef.current || isReflowingRef.current) return false;
    
    isReflowingRef.current = true;
    setIsReflowingState(true);
    const availableHeight = getAvailableHeight(options);
    let hasChanges = false;
    let attempts = 0;
    const pageContent = pageElement.querySelector('.page-content') as HTMLElement;
    if (!pageContent) {
      isReflowingRef.current = false;
      setIsReflowingState(false);
      return false;
    }
    
    let nextPage: HTMLElement | null = null;
    while (getContentHeight(pageContent) > availableHeight && attempts < 50) {
      nextPage = pageElement.nextElementSibling as HTMLElement;
      if (!nextPage || !nextPage.classList.contains('page')) {
        nextPage = createNewPage();
        pageElement.after(nextPage);
      }
      if (moveContentToNextPage(pageElement, nextPage, availableHeight)) {
        hasChanges = true;
      } else {
        break;
      }
      attempts++;
    }

    if (nextPage) {
        const nextPageContent = nextPage.querySelector('.page-content') as HTMLElement;
        if (nextPageContent) {
            const children = Array.from(nextPageContent.children);
            if (children.length >= 2) {
                const firstChild = children[0] as HTMLElement;
                const secondChild = children[1] as HTMLElement;
                if (
                    firstChild.dataset.paragraphId &&
                    firstChild.dataset.paragraphId === secondChild.dataset.paragraphId
                ) {
                    reflowSplitParagraph(firstChild.dataset.paragraphId);
                }
            }
        }
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
    setIsReflowingState(false);
    if(hasChanges) {
      saveToHistory(true);
    }
    return hasChanges;
  }, [containerRef, getAvailableHeight, getContentHeight, saveToHistory, reflowSplitParagraph, DEFAULT_OPTIONS]);

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
    if (remainingHeight < 1) return false;
  
    // --- NEW: Handle pulling up part of a split table ---
    if (elementToPull.tagName === 'TABLE' && elementToPull.dataset.tableId) {
      const tableId = elementToPull.dataset.tableId;
      const lastElementOnToPage = toContent.lastElementChild as HTMLElement;
  
      // Check if the previous page already has the first part of this table
      if (lastElementOnToPage?.dataset.tableId === tableId) {
        const fromTbody = elementToPull.querySelector('tbody');
        const toTbody = lastElementOnToPage.querySelector('tbody');
        if (fromTbody && toTbody && fromTbody.firstElementChild) {
          const rowToPull = fromTbody.firstElementChild as HTMLElement;
          const rowRect = rowToPull.getBoundingClientRect();
  
          // Check if the next row fits
          if (rowRect.height <= remainingHeight) {
            toTbody.appendChild(rowToPull);
            // If the 'from' table is now empty, remove it
            if (fromTbody.children.length === 0) {
              elementToPull.remove();
            }
            return true; // Successfully pulled one row
          }
        }
      }
    }
  
    // --- NEW: Handle pulling up part of a split list ---
    if (['UL', 'OL'].includes(elementToPull.tagName) && elementToPull.dataset.listId) {
      const listId = elementToPull.dataset.listId;
      const lastElementOnToPage = toContent.lastElementChild as HTMLElement;
  
      if (lastElementOnToPage?.dataset.listId === listId) {
        if (elementToPull.firstElementChild) {
          const itemToPull = elementToPull.firstElementChild as HTMLElement;
          const itemRect = itemToPull.getBoundingClientRect();
  
          if (itemRect.height <= remainingHeight) {
            lastElementOnToPage.appendChild(itemToPull);
            if (elementToPull.children.length === 0) {
              elementToPull.remove();
            }
            return true; // Successfully pulled one list item
          }
        }
      }
    }
  
    // --- EXISTING: Logic for pulling up a whole element or part of a paragraph ---
    const elementRect = elementToPull.getBoundingClientRect();
    if (elementRect.height <= remainingHeight) {
      toContent.appendChild(elementToPull);
      return true;
    }
  
    // If the whole element doesn't fit, try to pull part of a paragraph
    if (elementToPull.tagName !== 'P') {
      return false;
    }
  
    const lastParaOnToPage = toContent.lastElementChild as HTMLElement;
    
    if (lastParaOnToPage?.tagName === 'P' && lastParaOnToPage.dataset.paragraphId === elementToPull.dataset.paragraphId) {
        if (lastParaOnToPage.innerHTML.toLowerCase().trim() === '<br>') {
            lastParaOnToPage.innerHTML = '';
        }
    }
  
    const targetParagraph = (lastParaOnToPage?.tagName === 'P' && lastParaOnToPage.dataset.paragraphId === elementToPull.dataset.paragraphId)
      ? lastParaOnToPage
      : document.createElement('p');
  
    if (targetParagraph !== lastParaOnToPage) {
      targetParagraph.style.cssText = elementToPull.style.cssText;
      if (elementToPull.className) targetParagraph.className = elementToPull.className;
      toContent.appendChild(targetParagraph);
    }
  
    let movedSomething = false;
    while (elementToPull.firstChild) {
      const nodeToPull = elementToPull.firstChild;
      const tempNode = nodeToPull.cloneNode(true);
  
      // Use a more robust way to check if a word/node fits
      if (tempNode.nodeType === Node.TEXT_NODE) {
        const text = tempNode.textContent || '';
        const firstWord = text.trim().split(/\s+/)[0] || '';
        if (!firstWord) { // Just whitespace
            targetParagraph.appendChild(nodeToPull);
            continue;
        }
        tempNode.textContent = firstWord;
      }
      
      targetParagraph.appendChild(tempNode);
      const newHeight = getContentHeight(toContent);
      targetParagraph.removeChild(tempNode);
  
      if (newHeight > effectiveLimit) {
        break; // This node doesn't fit, stop trying
      }
  
      // It fits, so move it permanently
      if (nodeToPull.nodeType === Node.TEXT_NODE) {
        const text = nodeToPull.textContent || '';
        const firstWordWithSpace = text.substring(0, text.indexOf(' ') + 1) || text;
        targetParagraph.appendChild(document.createTextNode(firstWordWithSpace));
        nodeToPull.textContent = text.substring(firstWordWithSpace.length);
        if (!nodeToPull.textContent?.trim()) {
          nodeToPull.remove();
        }
      } else {
        targetParagraph.appendChild(nodeToPull);
      }
      movedSomething = true;
    }
  
    if (!movedSomething && targetParagraph !== lastParaOnToPage) {
      targetParagraph.remove();
    } else if (movedSomething) {
      const existingId = elementToPull.dataset.paragraphId || `para-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      targetParagraph.dataset.paragraphId = existingId;
      targetParagraph.dataset.splitPoint = 'start';
      targetParagraph.style.paddingBottom = '0px';
      elementToPull.dataset.paragraphId = existingId;
      elementToPull.dataset.splitPoint = 'end';
    }
  
    if (!elementToPull.hasChildNodes()) {
      elementToPull.remove();
    }
    
    return movedSomething;
  }, [getContentHeight]);
  
  const reflowBackwardFromPage = useCallback((startPageElement: HTMLElement, options: ReflowOptions = DEFAULT_OPTIONS): boolean => {
    if (!containerRef.current || isReflowingRef.current) return false;
    isReflowingRef.current = true;
    setIsReflowingState(true);
    const availableHeight = getAvailableHeight(options);
    let overallChanges = false;
    let currentPage = startPageElement;
    while (currentPage) {
      let nextPage = currentPage.nextElementSibling as HTMLElement;
      if (!nextPage || !nextPage.classList.contains('page')) break;
      while (true) {
        if (!moveContentToPreviousPage(nextPage, currentPage, availableHeight)) {
          break;
        }
        overallChanges = true;
      }
      const currentContent = currentPage.querySelector('.page-content') as HTMLElement;
      if (currentContent && getContentHeight(currentContent) > availableHeight) {
        fullReflowPage(currentPage, options);
      }
      const nextPageContent = nextPage.querySelector('.page-content') as HTMLElement;
      if (nextPageContent && nextPageContent.children.length === 0 && nextPageContent.textContent?.trim() === '') {
        const pageAfterNext = nextPage.nextElementSibling;
        nextPage.remove();
        overallChanges = true;
        nextPage = pageAfterNext as HTMLElement; 
        if (!nextPage) break;
      }
      currentPage = nextPage;
    }
    isReflowingRef.current = false;
    setIsReflowingState(false);
    if (overallChanges) {
      saveToHistory(true);
    }
    return overallChanges;
  }, [containerRef, getAvailableHeight, getContentHeight, moveContentToPreviousPage, fullReflowPage, saveToHistory, DEFAULT_OPTIONS]);

  const reflowContent = useCallback((options: ReflowOptions = DEFAULT_OPTIONS) => {
    if (!containerRef.current || isReflowingRef.current) return;
    isReflowingRef.current = true;
    setIsReflowingState(true);
    const container = containerRef.current;
    let currentPage: HTMLElement | null = container.querySelector('.page');
    while (currentPage) {
      fullReflowPage(currentPage, options);
      currentPage = currentPage.nextElementSibling as HTMLElement | null;
    }
    const allPages = Array.from(container.querySelectorAll('.page')) as HTMLElement[];
    if (allPages.length > 0) {
      reflowBackwardFromPage(allPages[0], options);
    }
    isReflowingRef.current = false;
    setIsReflowingState(false);
  }, [containerRef, fullReflowPage, reflowBackwardFromPage, DEFAULT_OPTIONS]);
  
  const scheduleReflow = useCallback((delay: number = 150) => {
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
    reflowPage: fullReflowPage,
    reflowBackwardFromPage, 
    reflowSplitParagraph,
    reflowSplitTable,
    reflowSplitList,
    isReflowing: () => isReflowingRef.current,
    getContentHeight,
    getAvailableHeight,
  };
};
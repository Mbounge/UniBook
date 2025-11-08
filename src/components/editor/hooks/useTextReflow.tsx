'use client';

import { useCallback, useRef, useState } from 'react';

// ... (keep existing interfaces and helper functions like analyzeParagraphs, getUniqueLineTops, findLineStartOffset, createNewPage)

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

  const floatedElements = Array.from(fromContent.querySelectorAll<HTMLElement>('.image-wrapper, .graph-wrapper, .template-wrapper')).filter(
    el => el.style.float === 'left' || el.style.float === 'right'
  );

  for (const floatedEl of floatedElements) {
    const elRect = floatedEl.getBoundingClientRect();
    const elBottomRelativeToContent = elRect.bottom - (contentAreaRect.top + paddingTop);

    if (elBottomRelativeToContent > effectiveLimit) {
      const elementIndex = children.indexOf(floatedEl);
      if (elementIndex !== -1) {
        console.log(`%c[Reflow] Moving overflowing floated element and subsequent content down.`, 'color: #f59e0b;', floatedEl);
        const elementsToMove = children.slice(elementIndex);
        for (let i = elementsToMove.length - 1; i >= 0; i--) {
          toContent.insertBefore(elementsToMove[i], toContent.firstChild);
        }
        return true;
      }
    }
  }

  if (lastChild.tagName === 'TABLE') {
    const tbody = lastChild.querySelector('tbody');
    if (!tbody) return false;
    
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

    if (firstOverflowRowIndex > 0 && firstOverflowRowIndex < rows.length) {
      console.log(`%c[Reflow] Splitting table at row ${firstOverflowRowIndex}.`, 'color: #f59e0b;');
      const tableId = lastChild.dataset.tableId || `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      lastChild.dataset.tableId = tableId;

      let nextTablePart = toContent.firstElementChild as HTMLElement;
      if (!nextTablePart || nextTablePart.dataset.tableId !== tableId) {
        const newTable = document.createElement('table');
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
        for (let i = rowsToMove.length - 1; i >= 0; i--) {
          nextTbody.insertBefore(rowsToMove[i], nextTbody.firstChild);
        }
        return true;
      }
    }
  }

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
      console.log(`%c[Reflow] Splitting list at item ${firstOverflowItemIndex}.`, 'color: #f59e0b;');
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

      if (firstOverflowLineIndex > 0 && firstOverflowLineIndex < lineTops.length) {
        console.log(`%c[Reflow] Splitting paragraph at line ${firstOverflowLineIndex}.`, 'color: #f59e0b;');
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
  
  console.log(`%c[Reflow] Moving whole element down:`, 'color: #f59e0b;', lastChild);
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

  const getLineHeightValue = (spacing: string): string => {
    const spacingMap: { [key: string]: string } = {
      '1.0': '1.15',
      '1.2': '1.5',
      '1.5': '1.75',
      '2.0': '2.2',
    };
    return spacingMap[spacing] || '1.5';
  };
  
  const getContentHeight = useCallback((pageContent: HTMLElement): number => {
    const children = Array.from(pageContent.children) as HTMLElement[];
    if (children.length === 0) return 0;

    const parentRect = pageContent.getBoundingClientRect();
    const parentStyle = window.getComputedStyle(pageContent);
    const paddingTop = parseFloat(parentStyle.paddingTop);

    let maxBottom = 0;

    for (const child of children) {
      const childRect = child.getBoundingClientRect();
      if (childRect.bottom > maxBottom) {
        maxBottom = childRect.bottom;
      }
    }

    if (maxBottom > 0) {
      const contentHeight = maxBottom - parentRect.top;
      return contentHeight - paddingTop;
    }

    const lastChild = children[children.length - 1];
    const lastRect = lastChild.getBoundingClientRect();
    const fallbackHeight = lastRect.bottom - parentRect.top;
    return fallbackHeight - paddingTop;
  }, []);

  const getAvailableHeight = useCallback((options: ReflowOptions = DEFAULT_OPTIONS): number => {
    return options.pageHeight - options.marginTop - options.marginBottom;
  }, [DEFAULT_OPTIONS]);

  const reflowPage = useCallback((pageElement: HTMLElement, options: ReflowOptions = DEFAULT_OPTIONS): boolean => {
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
  
    console.log(`%c[Reflow] Consolidating split paragraph ID: ${paragraphId}`, 'color: #8b5cf6; font-weight: bold;');
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

    console.log(`%c[Reflow] Consolidating split table ID: ${tableId}`, 'color: #8b5cf6; font-weight: bold;');
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
    
    console.log(`%c[Reflow] Consolidating split list ID: ${listId}`, 'color: #8b5cf6; font-weight: bold;');
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

  const consolidateAdjacentPieces = (pageContent: HTMLElement) => {
    if (!pageContent) return;

    const children = Array.from(pageContent.children) as HTMLElement[];
    for (let i = 0; i < children.length - 1; i++) {
      const currentEl = children[i];
      const nextEl = children[i + 1];

      const isConsolidatable = (el: HTMLElement) => 
        el.dataset.paragraphId || el.dataset.tableId || el.dataset.listId;

      if (
        isConsolidatable(currentEl) &&
        isConsolidatable(nextEl) &&
        (currentEl.dataset.paragraphId && currentEl.dataset.paragraphId === nextEl.dataset.paragraphId) ||
        (currentEl.dataset.tableId && currentEl.dataset.tableId === nextEl.dataset.tableId) ||
        (currentEl.dataset.listId && currentEl.dataset.listId === nextEl.dataset.listId)
      ) {
        if (currentEl.dataset.paragraphId) {
          reflowSplitParagraph(currentEl.dataset.paragraphId);
        }
        if (currentEl.dataset.tableId) {
          reflowSplitTable(currentEl.dataset.tableId);
        }
        if (currentEl.dataset.listId) {
          reflowSplitList(currentEl.dataset.listId);
        }
        consolidateAdjacentPieces(pageContent);
        return;
      }
    }
  };
  
  const fullReflowPage = useCallback((pageElement: HTMLElement, options: ReflowOptions = DEFAULT_OPTIONS): boolean => {
    if (!containerRef.current || isReflowingRef.current) return false;
    
    console.groupCollapsed(`%c[Reflow] Starting Forward Reflow on Page`, 'font-weight: bold; color: #0ea5e9;', pageElement);
    isReflowingRef.current = true;
    setIsReflowingState(true);

    let overallChanges = false;
    let currentPage: HTMLElement | null = pageElement;

    while (currentPage) {
      const pageContent = currentPage.querySelector('.page-content') as HTMLElement;
      if (!pageContent) {
        break;
      }

      consolidateAdjacentPieces(pageContent);

      const availableHeight = getAvailableHeight(options);
      let hasPageChanges = false;
      let attempts = 0;
      const MAX_ATTEMPTS = 50;

      let nextPage: HTMLElement | null = null;
      while (getContentHeight(pageContent) > availableHeight && attempts < MAX_ATTEMPTS) {
        console.log(`%c[Reflow] Page is overflowing. Attempting to move content down... (Attempt ${attempts + 1})`, 'color: #f97316;');
        nextPage = currentPage.nextElementSibling as HTMLElement;
        if (!nextPage || !nextPage.classList.contains('page')) {
          console.log('%c[Reflow] Creating a new page.', 'color: #a855f7;');
          nextPage = createNewPage();
          currentPage.after(nextPage);
        }
        if (moveContentToNextPage(currentPage, nextPage, availableHeight)) {
          hasPageChanges = true;
          overallChanges = true;
        } else {
          console.warn('[Reflow] moveContentToNextPage returned false, breaking loop.');
          break;
        }
        attempts++;
      }

      if (hasPageChanges) {
        const tempP = document.createElement('p');
        tempP.innerHTML = '<br>';
        tempP.style.fontSize = '14pt';
        tempP.style.lineHeight = '1.5';
        pageContent.appendChild(tempP);
        const paragraphHeight = tempP.getBoundingClientRect().height;
        pageContent.removeChild(tempP);

        if (paragraphHeight > 0) {
          while (true) {
            const currentHeight = getContentHeight(pageContent);
            const remainingSpace = availableHeight - currentHeight;

            if (remainingSpace < paragraphHeight * 1.5) {
              break;
            }

            const paddingParagraph = document.createElement('p');
            paddingParagraph.innerHTML = '<br>';
            paddingParagraph.style.lineHeight = getLineHeightValue('1.2');
            paddingParagraph.dataset.lineSpacing = '1.2';
            paddingParagraph.style.fontSize = '14pt';
            paddingParagraph.style.marginBottom = '0px';
            paddingParagraph.style.paddingBottom = '1.25rem';
            pageContent.appendChild(paddingParagraph);
          }
        }
      }

      if (attempts >= MAX_ATTEMPTS) {
        console.warn("Reflow safety net triggered in reflowPage cascade.");
      }

      const finalContentHeight = getContentHeight(pageContent);
      const RED_LINE_THRESHOLD = 950;
      if (finalContentHeight <= RED_LINE_THRESHOLD) {
        pageContent.classList.remove('overflow-warning');
      } else {
        if (!pageContent.classList.contains('overflow-warning')) {
          pageContent.classList.add('overflow-warning');
        }
      }

      if (hasPageChanges && nextPage) {
        currentPage = nextPage;
      } else {
        currentPage = null;
      }
    }

    isReflowingRef.current = false;
    setIsReflowingState(false);

    if(overallChanges) {
      saveToHistory(true);
    }
    console.log(`%c[Reflow] Forward Reflow Finished. Changes made: ${overallChanges}`, 'font-weight: bold; color: #0ea5e9;');
    console.groupEnd();
    return overallChanges;
  }, [containerRef, getAvailableHeight, getContentHeight, saveToHistory, DEFAULT_OPTIONS, consolidateAdjacentPieces]);

  const moveContentToPreviousPage = useCallback((
    fromPage: HTMLElement,
    toPage: HTMLElement,
    availableHeight: number
  ): boolean => {
    const fromContent = fromPage.querySelector('.page-content') as HTMLElement;
    const toContent = toPage.querySelector('.page-content') as HTMLElement;
    if (!fromContent || !toContent || !fromContent.firstElementChild) return false;
  
    toContent.getBoundingClientRect();

    const SAFETY_BUFFER = 2;
    const effectiveLimit = availableHeight - SAFETY_BUFFER;
    const elementToPull = fromContent.firstElementChild as HTMLElement;
    if (!elementToPull) return false;
  
    const currentContentHeight = getContentHeight(toContent);
    const remainingHeight = effectiveLimit - currentContentHeight;
    console.log(`%c[Reflow] Attempting to pull content up. Remaining space: ${Math.round(remainingHeight)}px`, 'color: #22c55e;');

    if (remainingHeight < 1) {
      console.log('%c[Reflow] No space remaining. Cannot pull up.', 'color: #ef4444;');
      return false;
    }

    if (elementToPull.tagName === 'TABLE' && elementToPull.dataset.tableId) {
      const tableId = elementToPull.dataset.tableId;
      const lastElementOnToPage = toContent.lastElementChild as HTMLElement;
  
      if (lastElementOnToPage?.dataset.tableId === tableId) {
        const fromTbody = elementToPull.querySelector('tbody');
        const toTbody = lastElementOnToPage.querySelector('tbody');
        if (fromTbody && toTbody && fromTbody.firstElementChild) {
          const rowToPull = fromTbody.firstElementChild as HTMLElement;
          const rowRect = rowToPull.getBoundingClientRect();
  
          if (rowRect.height <= remainingHeight) {
            console.log(`%c[Reflow] Pulling up table row.`, 'color: #10b981;', rowToPull);
            toTbody.appendChild(rowToPull);
            if (fromTbody.children.length === 0) {
              elementToPull.remove();
            }
            return true;
          }
        }
      }
    }
  
    if (['UL', 'OL'].includes(elementToPull.tagName) && elementToPull.dataset.listId) {
      const listId = elementToPull.dataset.listId;
      const lastElementOnToPage = toContent.lastElementChild as HTMLElement;
  
      if (lastElementOnToPage?.dataset.listId === listId) {
        if (elementToPull.firstElementChild) {
          const itemToPull = elementToPull.firstElementChild as HTMLElement;
          const itemRect = itemToPull.getBoundingClientRect();
  
          if (itemRect.height <= remainingHeight) {
            console.log(`%c[Reflow] Pulling up list item.`, 'color: #10b981;', itemToPull);
            lastElementOnToPage.appendChild(itemToPull);
            if (elementToPull.children.length === 0) {
              elementToPull.remove();
            }
            return true;
          }
        }
      }
    }
  
    const elementRect = elementToPull.getBoundingClientRect();
    console.log(`%c[Reflow] Considering element:`, 'color: #6366f1;', elementToPull, `Height: ${Math.round(elementRect.height)}px`);
    if (elementRect.height <= remainingHeight) {
      console.log(`%c[Reflow] Pulling up whole element.`, 'color: #10b981;');
      toContent.appendChild(elementToPull);
      return true;
    }
  
    if (elementToPull.tagName !== 'P') {
      console.log(`%c[Reflow] Element is not a paragraph and too large to pull up.`, 'color: #ef4444;');
      return false;
    }
    
    console.log(`%c[Reflow] Element too large. Attempting to pull up word by word...`, 'color: #f59e0b;');
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
  
      if (tempNode.nodeType === Node.TEXT_NODE) {
        const text = tempNode.textContent || '';
        const firstWord = text.trim().split(/\s+/)[0] || '';
        if (!firstWord) {
            targetParagraph.appendChild(nodeToPull);
            continue;
        }
        tempNode.textContent = firstWord;
      }
      
      targetParagraph.appendChild(tempNode);
      const newHeight = getContentHeight(toContent);
      targetParagraph.removeChild(tempNode);
  
      if (newHeight > effectiveLimit) {
        console.log(`%c[Reflow] Word/node won't fit. Stopping word-by-word pull.`, 'color: #ef4444;', tempNode);
        break;
      }
  
      if (nodeToPull.nodeType === Node.TEXT_NODE) {
        const text = nodeToPull.textContent || '';
        const firstWordWithSpace = text.substring(0, text.indexOf(' ') + 1) || text;
        console.log(`%c[Reflow] Pulling up word: "${firstWordWithSpace.trim()}"`, 'color: #10b981;');
        targetParagraph.appendChild(document.createTextNode(firstWordWithSpace));
        nodeToPull.textContent = text.substring(firstWordWithSpace.length);
        if (!nodeToPull.textContent?.trim()) {
          nodeToPull.remove();
        }
      } else {
        console.log(`%c[Reflow] Pulling up node:`, 'color: #10b981;', nodeToPull);
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
    console.group(`%c[Reflow] Starting Backward Consolidation from Page`, 'font-weight: bold; color: #16a34a;', startPageElement);
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

      if (currentContent) {
        consolidateAdjacentPieces(currentContent);
      }

      if (currentContent && getContentHeight(currentContent) > availableHeight) {
        console.log('%c[Reflow] Backward pass caused an overflow. Triggering a forward reflow cascade.', 'color: #f97316; font-weight: bold;');
        fullReflowPage(currentPage, options); 
      }

      const nextPageContent = nextPage.querySelector('.page-content') as HTMLElement;
      if (nextPageContent && nextPageContent.children.length === 0 && nextPageContent.textContent?.trim() === '') {
        console.log('%c[Reflow] Removing empty page.', 'color: #a855f7;', nextPage);
        const pageAfterNext = nextPage.nextElementSibling;
        nextPage.remove();
        overallChanges = true;
        continue; 
      }

      currentPage = nextPage;
    }

    isReflowingRef.current = false;
    setIsReflowingState(false);
    if (overallChanges) {
      saveToHistory(true);
    }
    console.log(`%c[Reflow] Backward Consolidation Finished. Changes made: ${overallChanges}`, 'font-weight: bold; color: #16a34a;');
    console.groupEnd();
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
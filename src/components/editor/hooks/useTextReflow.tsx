//useTextReflow.tsx

'use client';

import { useCallback, useRef } from 'react';

interface ReflowOptions {
  pageHeight: number;
  marginTop: number;
  marginBottom: number;
}

export const analyzeParagraphs = (pageContent: HTMLElement, pageIndex: number) => {
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

const createNewPage = (): HTMLElement => {
  const newPageDiv = document.createElement('div');
  newPageDiv.className = 'page';
  
  const newPageContent = document.createElement('div');
  newPageContent.className = 'page-content';
  newPageContent.contentEditable = 'true';
  
  newPageDiv.appendChild(newPageContent);
  return newPageDiv;
};

// Helper to find the exact character offset where a line starts
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

// Helper to get unique line tops from rects
const getUniqueLineTops = (rects: DOMRectList | DOMRect[]): number[] => {
  const tops = new Set<number>();
  for (let i = 0; i < rects.length; i++) {
    tops.add(Math.round(rects[i].top));
  }
  return Array.from(tops).sort((a, b) => a - b);
};

// Helper to measure height of lines in a paragraph
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

  // Handle paragraph splitting
  if (lastChild.tagName === 'P' && lastChild.textContent?.trim()) {
    const paragraphId = lastChild.dataset.paragraphId;
    
    // Check if we need to merge with existing split on next page
    if (paragraphId) {
      const nextPageFirstChild = toContent.firstElementChild as HTMLElement;

      if (nextPageFirstChild && nextPageFirstChild.dataset.paragraphId === paragraphId) {
        console.log(`%c[Forward Reflow]: MERGING paragraph chain [${paragraphId}]`, "color: green; font-weight: bold;");
        
        // Merge content back together
        while (nextPageFirstChild.firstChild) {
          lastChild.appendChild(nextPageFirstChild.firstChild);
        }

        // Remove the now-empty next piece
        nextPageFirstChild.remove();
        
        // Keep the split attributes on lastChild since we'll re-split if needed
        // Don't remove attributes yet - let the split logic below handle it
      }
    }

    // Get all line rectangles
    const range = document.createRange();
    range.selectNodeContents(lastChild);
    const lineRects = Array.from(range.getClientRects());
    
    if (lineRects.length === 0) return false;

    // Get unique line tops
    const lineTops = getUniqueLineTops(lineRects);
    
    // Find which line crosses the threshold
    let splitLineIndex = -1;
    for (let i = 0; i < lineTops.length; i++) {
      const lineTop = lineTops[i];
      // Find the bottom of this line
      const lineRectsForThisLine = lineRects.filter(r => Math.round(r.top) === lineTop);
      const lineBottom = Math.max(...lineRectsForThisLine.map(r => r.bottom));
      
      const lineBottomRelativeToContentBox = lineBottom - (contentAreaRect.top + paddingTop);
      
      if (lineBottomRelativeToContentBox > availableContentHeight) {
        splitLineIndex = i;
        break;
      }
    }

    // If overflow detected, split at the line
    if (splitLineIndex > 0) {
      const overflowLineTop = lineTops[splitLineIndex];
      
      console.log(`%c[Forward Split]: Splitting paragraph at line ${splitLineIndex + 1}/${lineTops.length}`, "color: orange; font-weight: bold;");
      
      // Find the exact character position where this line starts
      const splitPoint = findLineStartOffset(lastChild, overflowLineTop);
      
      if (splitPoint) {
        // Extract content from split point to end
        const moveRange = document.createRange();
        moveRange.setStart(splitPoint.node, splitPoint.offset);
        moveRange.setEndAfter(lastChild.lastChild!);
        
        const fragmentToMove = moveRange.extractContents();
        
        // Create new paragraph for overflow content
        const newParagraph = document.createElement('p');
        
        // Preserve styling
        newParagraph.style.cssText = lastChild.style.cssText;
        newParagraph.className = lastChild.className;
        
        newParagraph.appendChild(fragmentToMove);

        // Set up split tracking - MAINTAIN OR CREATE ID
        const existingId = lastChild.dataset.paragraphId;
        const isAlreadySplit = !!existingId;

        if (isAlreadySplit) {
          // Continue existing split chain
          console.log(`%c[Forward Split]: Continuing split chain [${existingId}]`, "color: green;");
          newParagraph.setAttribute('data-paragraph-id', existingId);
          newParagraph.setAttribute('data-split-point', 'end');
          lastChild.setAttribute('data-split-point', 'start');
          
          // Check if there's another piece after this
          const nextPiece = toContent.firstElementChild as HTMLElement;
          if (nextPiece && nextPiece.dataset.paragraphId === existingId) {
            // There's already another piece, make this one a middle piece
            newParagraph.setAttribute('data-split-point', 'middle');
          }
        } else {
          // Create new split chain
          const newId = `para-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          console.log(`%c[Forward Split]: Creating new split chain [${newId}]`, "color: green;");
          lastChild.setAttribute('data-paragraph-id', newId);
          lastChild.setAttribute('data-split-point', 'start');
          newParagraph.setAttribute('data-paragraph-id', newId);
          newParagraph.setAttribute('data-split-point', 'end');
        }
        
        // Insert at beginning of next page
        toContent.insertBefore(newParagraph, toContent.firstChild);
        moved = true;
        
        console.log(`%c[Forward Split Result]: Split maintained with ID [${lastChild.dataset.paragraphId}]`, "color: green;");
      }
    } else if (splitLineIndex === 0) {
      // Entire paragraph needs to move
      console.log(`%c[Forward Move]: Moving entire paragraph to next page`, "color: blue;");
      
      // If this paragraph was part of a split, we need to handle the chain
      if (paragraphId) {
        // Keep the split attributes when moving
        toContent.insertBefore(lastChild, toContent.firstChild);
        moved = true;
      } else {
        toContent.insertBefore(lastChild, toContent.firstChild);
        moved = true;
      }
    } else {
      // Paragraph fits completely - remove split attributes if present
      if (paragraphId) {
        console.log(`%c[Forward Reflow]: Paragraph now fits completely, cleaning up split [${paragraphId}]`, "color: blue;");
        lastChild.removeAttribute('data-paragraph-id');
        lastChild.removeAttribute('data-split-point');
      }
    }
    
    return moved;
  }
  
  // Handle non-paragraph elements
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
    
    if (!fromContent || !toContent) return false;

    const firstChild = fromContent.firstElementChild as HTMLElement;
    const lastChildOnToPage = toContent.lastElementChild as HTMLElement;

    if (!firstChild) return false;

    let moved = false;
    const currentContentHeight = getContentHeight(toContent);
    const remainingHeight = availableHeight - currentContentHeight;

    if (remainingHeight < 5) return false;

    // Check if we're pulling back into a split paragraph
    if (lastChildOnToPage && 
        lastChildOnToPage.tagName === 'P' && 
        lastChildOnToPage.dataset.splitPoint === 'start' &&
        firstChild.tagName === 'P' && 
        firstChild.dataset.paragraphId === lastChildOnToPage.dataset.paragraphId) {
      
      console.log(`%c[Backward Reflow]: Merging split paragraph [${firstChild.dataset.paragraphId}]`, "color: purple; font-weight: bold;");
      
      // Measure lines in the next page's fragment
      const lineInfo = measureLineHeights(firstChild);
      
      // Determine how many complete lines we can pull back
      let linesToPull = 0;
      let accumulatedHeight = 0;
      
      for (let i = 0; i < lineInfo.length; i++) {
        const { lineHeight } = lineInfo[i];
        
        if (accumulatedHeight + lineHeight <= remainingHeight) {
          linesToPull++;
          accumulatedHeight += lineHeight;
        } else {
          break;
        }
      }

      if (linesToPull > 0 && linesToPull < lineInfo.length) {
        // Pull back specific lines - MAINTAIN SPLIT CHAIN
        const splitLineTop = lineInfo[linesToPull].lineTop;
        const splitPoint = findLineStartOffset(firstChild, splitLineTop);
        
        if (splitPoint) {
          const rangeToMove = document.createRange();
          rangeToMove.setStart(firstChild.firstChild!, 0);
          rangeToMove.setEnd(splitPoint.node, splitPoint.offset);
          
          const fragmentToMove = rangeToMove.extractContents();
          lastChildOnToPage.appendChild(fragmentToMove);
          moved = true;

          console.log(`%c[Backward Reflow]: Pulled ${linesToPull} line(s) back, maintaining split chain`, "color: purple;");

          // IMPORTANT: Keep split attributes on both pieces
          // lastChildOnToPage stays as 'start'
          // firstChild stays as 'end' (or 'middle' if there's more after)
          
          // Check if source is now empty
          if (!firstChild.textContent?.trim()) {
            const paragraphId = firstChild.dataset.paragraphId;
            firstChild.remove();
            
            // Check if there are more pieces in the chain
            const nextPiece = fromContent.firstElementChild as HTMLElement;
            if (nextPiece && nextPiece.dataset.paragraphId === paragraphId) {
              // There's another piece, keep the chain
              console.log(`%c[Backward Reflow]: Removed empty piece, chain continues`, "color: purple;");
            } else {
              // This was the last piece, clean up
              console.log(`%c[Backward Reflow]: Removed last piece, cleaning up split`, "color: purple;");
              lastChildOnToPage.removeAttribute('data-split-point');
              lastChildOnToPage.removeAttribute('data-paragraph-id');
            }
          }
        }
      } else if (linesToPull === lineInfo.length) {
        // Pull entire fragment back
        const paragraphId = firstChild.dataset.paragraphId;
        
        while (firstChild.firstChild) {
          lastChildOnToPage.appendChild(firstChild.firstChild);
        }
        
        firstChild.remove();
        
        // Check if there are more pieces in the chain
        const nextPiece = fromContent.firstElementChild as HTMLElement;
        if (nextPiece && nextPiece.dataset.paragraphId === paragraphId) {
          // There's another piece, keep the split on lastChildOnToPage
          console.log(`%c[Backward Reflow]: Pulled entire fragment, chain continues`, "color: purple;");
          lastChildOnToPage.setAttribute('data-split-point', 'start');
        } else {
          // This was the last piece, clean up
          console.log(`%c[Backward Reflow]: Pulled entire fragment, no more pieces - cleaning up`, "color: purple;");
          lastChildOnToPage.removeAttribute('data-split-point');
          lastChildOnToPage.removeAttribute('data-paragraph-id');
        }
        
        moved = true;
      }
      
      return moved;
    }

    // Handle pulling back regular elements or creating new splits
    if (firstChild.tagName === 'P' && firstChild.textContent?.trim()) {
      // Check if this paragraph is part of a split chain (middle or end piece)
      const paragraphId = firstChild.dataset.paragraphId;
      const isPartOfSplit = !!paragraphId;
      
      // Measure lines in the paragraph
      const lineInfo = measureLineHeights(firstChild);
      
      let linesToPull = 0;
      let accumulatedHeight = 0;
      
      for (let i = 0; i < lineInfo.length; i++) {
        const { lineHeight } = lineInfo[i];
        
        if (accumulatedHeight + lineHeight <= remainingHeight) {
          linesToPull++;
          accumulatedHeight += lineHeight;
        } else {
          break;
        }
      }

      if (linesToPull === lineInfo.length) {
        // Pull entire paragraph
        console.log(`%c[Backward Reflow]: Pulling entire paragraph (${lineInfo.length} lines)`, "color: purple;");
        
        // If it's part of a split, maintain the chain
        if (isPartOfSplit) {
          console.log(`%c[Backward Reflow]: Maintaining split chain [${paragraphId}] while moving entire paragraph`, "color: purple;");
        }
        
        toContent.appendChild(firstChild);
        moved = true;
      } else if (linesToPull > 0) {
        // Create a split - pull back what fits
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
          
          if (isPartOfSplit) {
            // Continue the existing split chain
            console.log(`%c[Backward Split]: Continuing existing split chain [${paragraphId}]`, "color: purple; font-weight: bold;");
            newParagraph.setAttribute('data-paragraph-id', paragraphId);
            newParagraph.setAttribute('data-split-point', 'start');
            // firstChild keeps its existing split attributes
          } else {
            // Create new split chain
            const newId = `para-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            console.log(`%c[Backward Split]: Creating new split chain [${newId}]`, "color: purple; font-weight: bold;");
            newParagraph.setAttribute('data-paragraph-id', newId);
            newParagraph.setAttribute('data-split-point', 'start');
            firstChild.setAttribute('data-paragraph-id', newId);
            firstChild.setAttribute('data-split-point', 'end');
          }
          
          toContent.appendChild(newParagraph);
          moved = true;
          
          console.log(`%c[Backward Split]: Created split pulling ${linesToPull}/${lineInfo.length} line(s)`, "color: purple;");
        }
      }
    } else {
      // Non-paragraph element
      const firstChildRect = firstChild.getBoundingClientRect();
      if (firstChildRect.height < remainingHeight) {
        console.log(`%c[Backward Reflow]: Pulling back non-paragraph element`, "color: purple;");
        toContent.appendChild(firstChild);
        moved = true;
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
      const remainingHeight = availableHeight - contentHeight;
      
      if (remainingHeight > 5) {
        console.log(`%c[Backward Reflow Trigger]: ${Math.round(remainingHeight)}px available on page`, "color: #9C27B0;");
        
        if (moveContentToPreviousPage(nextPage, pageElement, availableHeight)) {
          hasChanges = true;
          
          // Check if we over-pulled
          const newContentHeight = getContentHeight(currentContent);
          if (newContentHeight > availableHeight) {
            console.log(`%c[Reflow Correction]: Backward reflow over-pulled. Correcting...`, 'color: #e65100;');
            moveContentToNextPage(pageElement, nextPage, availableHeight);
          }

          // Cleanup empty last page
          const nextPageContent = nextPage.querySelector('.page-content') as HTMLElement;
          const isNextPageEmpty = nextPageContent && 
            nextPageContent.textContent?.trim() === '' && 
            nextPageContent.querySelectorAll('img, .math-wrapper, .graph-wrapper, .template-wrapper').length === 0;

          if (isNextPageEmpty && !nextPage.nextElementSibling) {
            console.log(`%c[Reflow Cleanup]: Removing empty last page after backward reflow.`, 'color: blue;');
            nextPage.remove();
          }
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

    // Forward pass
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

    // Backward pass
    for (let i = pages.length - 2; i >= 0; i--) {
      const currentPage = pages[i];
      const nextPage = pages[i + 1];
      const currentContent = currentPage.querySelector('.page-content') as HTMLElement;
      if (!currentContent || !nextPage) continue;
      
      const contentHeight = getContentHeight(currentContent);
      const remainingHeight = availableHeight - contentHeight;
      
      if (remainingHeight > 5) {
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

    // Cleanup empty last page
    const updatedPages = Array.from(container.querySelectorAll('.page')) as HTMLElement[];
    if (updatedPages.length > 1) {
      const lastPage = updatedPages[updatedPages.length - 1];
      const content = lastPage.querySelector('.page-content') as HTMLElement;

      if (content && 
          content.textContent?.trim() === '' && 
          content.querySelectorAll('img, .math-wrapper, .graph-wrapper, .template-wrapper').length === 0) {
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

  const reflowSplitParagraph = useCallback((paragraphId: string): boolean => {
  if (!containerRef.current || isReflowingRef.current) return false;

  console.log(`%c[Split Paragraph Reflow]: Processing paragraph chain [${paragraphId}]`, 'color: #FF6B6B; font-weight: bold;');

  isReflowingRef.current = true;
  const container = containerRef.current;
  const availableHeight = getAvailableHeight(DEFAULT_OPTIONS);
  let hasChanges = false;

  // Find all pieces of this split paragraph
  const allPieces = Array.from(
    container.querySelectorAll(`p[data-paragraph-id="${paragraphId}"]`)
  ) as HTMLElement[];

  if (allPieces.length === 0) {
    isReflowingRef.current = false;
    return false;
  }

  console.log(`%c[Split Paragraph Reflow]: Found ${allPieces.length} piece(s) of paragraph [${paragraphId}]`, 'color: #FF6B6B;');

  // Process each piece
  for (const piece of allPieces) {
    const pageContent = piece.closest('.page-content') as HTMLElement;
    const page = pageContent?.closest('.page') as HTMLElement;
    
    if (!pageContent || !page) continue;

    const contentHeight = getContentHeight(pageContent);

    // Check if this page is overflowing
    if (contentHeight > availableHeight) {
      console.log(`%c[Split Paragraph Reflow]: Page overflowing, pushing content forward`, 'color: #FF6B6B;');
      
      let nextPage = page.nextElementSibling as HTMLElement;
      if (!nextPage) {
        nextPage = createNewPage();
        container.appendChild(nextPage);
      }
      
      if (moveContentToNextPage(page, nextPage, availableHeight)) {
        hasChanges = true;
      }
    } else {
      // Check if we can pull content back
      const nextPage = page.nextElementSibling as HTMLElement;
      if (nextPage) {
        const remainingHeight = availableHeight - contentHeight;
        
        if (remainingHeight > 5) {
          console.log(`%c[Split Paragraph Reflow]: Space available (${Math.round(remainingHeight)}px), pulling content back`, 'color: #FF6B6B;');
          
          if (moveContentToPreviousPage(nextPage, page, availableHeight)) {
            hasChanges = true;
            
            // Check if we over-pulled
            const newContentHeight = getContentHeight(pageContent);
            if (newContentHeight > availableHeight) {
              console.log(`%c[Split Paragraph Reflow]: Over-pulled, correcting...`, 'color: #e65100;');
              moveContentToNextPage(page, nextPage, availableHeight);
            }
          }
        }
      }
    }
  }

  // Cleanup empty pages
  const allPages = Array.from(container.querySelectorAll('.page')) as HTMLElement[];
  for (let i = allPages.length - 1; i > 0; i--) {
    const page = allPages[i];
    const content = page.querySelector('.page-content') as HTMLElement;
    
    if (content && 
        content.textContent?.trim() === '' && 
        content.querySelectorAll('img, .math-wrapper, .graph-wrapper, .template-wrapper').length === 0) {
      console.log(`%c[Split Paragraph Reflow]: Removing empty page`, 'color: blue;');
      page.remove();
      hasChanges = true;
    }
  }

  isReflowingRef.current = false;
  
  if (hasChanges) {
    saveToHistory(true);
  }

  return hasChanges;
}, [containerRef, getAvailableHeight, getContentHeight, moveContentToPreviousPage, saveToHistory, DEFAULT_OPTIONS]);

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
//src/components/editor/hooks/useLineBasedReflow.ts

'use client';

import { useCallback, useRef } from 'react';

interface ReflowOptions {
  pageHeight: number;
  marginTop: number;
  marginBottom: number;
}

interface LineInfo {
  element: HTMLElement;
  range: Range;
  height: number;
  text: string;
  isLineStart: boolean;
  isLineEnd: boolean;
  boundingRect: DOMRect;
}

interface BlockInfo {
  element: HTMLElement;
  lines: LineInfo[];
  totalHeight: number;
  isSpecialBlock: boolean; // images, math, graphs that shouldn't be split
}

export const useLineBasedReflow = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  saveToHistory: (force?: boolean) => void
) => {
  const reflowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReflowingRef = useRef(false);

  const DEFAULT_OPTIONS: ReflowOptions = {
    pageHeight: 936,
    marginTop: 0,
    marginBottom: 0
  };

  /**
   * Get line-by-line breakdown of text content within an element
   */
  const getLineBreakdown = useCallback((element: HTMLElement): LineInfo[] => {
    const lines: LineInfo[] = [];
    
    // Skip special blocks that shouldn't be split
    if (element.classList.contains('math-wrapper') || 
        element.classList.contains('graph-wrapper') || 
        element.classList.contains('image-wrapper') ||
        element.classList.contains('template-wrapper')) {
      return [];
    }

    const range = document.createRange();
    range.selectNodeContents(element);
    
    // Create a temporary element to measure line heights
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
      position: absolute;
      visibility: hidden;
      white-space: nowrap;
      font: inherit;
      line-height: inherit;
      letter-spacing: inherit;
    `;
    document.body.appendChild(tempDiv);
    
    try {
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null
      );

      let textNode = walker.nextNode() as Text;
      while (textNode) {
        const text = textNode.textContent || '';
        if (text.trim()) {
          // Split text into words and measure line breaks
          const words = text.split(/(\s+)/);
          let currentLine = '';
          let lineStart = 0;
          
          for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i];
            tempDiv.textContent = testLine;
            
            // Check if this word would cause a line break
            const parentRect = textNode.parentElement?.getBoundingClientRect();
            if (parentRect && tempDiv.offsetWidth > parentRect.width && currentLine) {
              // Create range for current line
              const lineRange = document.createRange();
              lineRange.setStart(textNode, lineStart);
              lineRange.setEnd(textNode, lineStart + currentLine.length);
              
              const lineRect = lineRange.getBoundingClientRect();
              
              lines.push({
                element: textNode.parentElement as HTMLElement,
                range: lineRange.cloneRange(),
                height: lineRect.height || 20, // fallback height
                text: currentLine.trim(),
                isLineStart: lineStart === 0,
                isLineEnd: false,
                boundingRect: lineRect
              });
              
              // Start new line
              currentLine = words[i];
              lineStart += currentLine.length;
            } else {
              currentLine = testLine;
            }
          }
          
          // Add remaining text as final line
          if (currentLine.trim()) {
            const lineRange = document.createRange();
            lineRange.setStart(textNode, lineStart);
            lineRange.setEnd(textNode, textNode.textContent!.length);
            
            const lineRect = lineRange.getBoundingClientRect();
            
            lines.push({
              element: textNode.parentElement as HTMLElement,
              range: lineRange.cloneRange(),
              height: lineRect.height || 20,
              text: currentLine.trim(),
              isLineStart: lineStart === 0,
              isLineEnd: true,
              boundingRect: lineRect
            });
          }
        }
        
        textNode = walker.nextNode() as Text;
      }
    } finally {
      document.body.removeChild(tempDiv);
    }
    
    return lines;
  }, []);

  /**
   * Analyze all blocks in a page and get their line breakdown
   */
  const analyzePageContent = useCallback((pageContent: HTMLElement): BlockInfo[] => {
    const blocks: BlockInfo[] = [];
    const children = Array.from(pageContent.children) as HTMLElement[];
    
    for (const child of children) {
      const isSpecialBlock = child.classList.contains('math-wrapper') || 
                           child.classList.contains('graph-wrapper') || 
                           child.classList.contains('image-wrapper') ||
                           child.classList.contains('template-wrapper');
      
      if (isSpecialBlock) {
        // Special blocks can't be split
        blocks.push({
          element: child,
          lines: [],
          totalHeight: child.getBoundingClientRect().height,
          isSpecialBlock: true
        });
      } else {
        // Regular text blocks - get line breakdown
        const lines = getLineBreakdown(child);
        const totalHeight = lines.reduce((sum, line) => sum + line.height, 0);
        
        blocks.push({
          element: child,
          lines,
          totalHeight,
          isSpecialBlock: false
        });
      }
    }
    
    return blocks;
  }, [getLineBreakdown]);

  /**
   * Split a block at a specific line index
   */
  const splitBlockAtLine = useCallback((block: BlockInfo, splitLineIndex: number): {
    firstPart: HTMLElement;
    secondPart: HTMLElement;
  } => {
    const originalElement = block.element;
    const firstPart = originalElement.cloneNode(true) as HTMLElement;
    const secondPart = originalElement.cloneNode(true) as HTMLElement;
    
    // Clear content
    firstPart.textContent = '';
    secondPart.textContent = '';
    
    // Rebuild first part with lines 0 to splitLineIndex-1
    for (let i = 0; i < splitLineIndex; i++) {
      const line = block.lines[i];
      const textNode = document.createTextNode(line.text + (i < splitLineIndex - 1 ? ' ' : ''));
      firstPart.appendChild(textNode);
    }
    
    // Rebuild second part with lines splitLineIndex to end
    for (let i = splitLineIndex; i < block.lines.length; i++) {
      const line = block.lines[i];
      const textNode = document.createTextNode(line.text + (i < block.lines.length - 1 ? ' ' : ''));
      secondPart.appendChild(textNode);
    }
    
    return { firstPart, secondPart };
  }, []);

  /**
   * Move lines from one page to the next when content overflows
   */
  const moveLinesToNextPage = useCallback((
    fromPage: HTMLElement,
    toPage: HTMLElement,
    availableHeight: number
  ): boolean => {
    const fromContent = fromPage.querySelector('.page-content') as HTMLElement;
    const toContent = toPage.querySelector('.page-content') as HTMLElement;
    
    if (!fromContent || !toContent) return false;
    
    const blocks = analyzePageContent(fromContent);
    let currentHeight = 0;
    let moved = false;
    
    // Find where to split
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      const block = blocks[blockIndex];
      
      if (block.isSpecialBlock) {
        // Check if special block fits
        if (currentHeight + block.totalHeight > availableHeight && currentHeight > 0) {
          // Move this block and all following blocks to next page
          const elementsToMove = Array.from(fromContent.children).slice(blockIndex);
          
          for (const element of elementsToMove) {
            if (toContent.firstChild) {
              toContent.insertBefore(element, toContent.firstChild);
            } else {
              toContent.appendChild(element);
            }
          }
          moved = true;
          break;
        }
        currentHeight += block.totalHeight;
      } else {
        // Check line by line for text blocks
        let lineHeight = 0;
        let splitLineIndex = -1;
        
        for (let lineIndex = 0; lineIndex < block.lines.length; lineIndex++) {
          const line = block.lines[lineIndex];
          
          if (currentHeight + lineHeight + line.height > availableHeight && currentHeight > 0) {
            splitLineIndex = lineIndex;
            break;
          }
          lineHeight += line.height;
        }
        
        if (splitLineIndex > 0) {
          // Split block at this line
          const { firstPart, secondPart } = splitBlockAtLine(block, splitLineIndex);
          
          // Replace original with first part
          fromContent.replaceChild(firstPart, block.element);
          
          // Add second part to next page
          if (toContent.firstChild) {
            toContent.insertBefore(secondPart, toContent.firstChild);
          } else {
            toContent.appendChild(secondPart);
          }
          
          // Move all remaining blocks
          const remainingElements = Array.from(fromContent.children).slice(blockIndex + 1);
          for (const element of remainingElements) {
            toContent.appendChild(element);
          }
          
          moved = true;
          break;
        } else if (splitLineIndex === 0) {
          // Move entire block and all following blocks
          const elementsToMove = Array.from(fromContent.children).slice(blockIndex);
          
          for (const element of elementsToMove) {
            if (toContent.firstChild) {
              toContent.insertBefore(element, toContent.firstChild);
            } else {
              toContent.appendChild(element);
            }
          }
          moved = true;
          break;
        }
        
        currentHeight += lineHeight;
      }
    }
    
    return moved;
  }, [analyzePageContent, splitBlockAtLine]);

  /**
   * Pull lines from next page to fill current page
   */
  const pullLinesToCurrentPage = useCallback((
    currentPage: HTMLElement,
    nextPage: HTMLElement,
    availableHeight: number
  ): boolean => {
    const currentContent = currentPage.querySelector('.page-content') as HTMLElement;
    const nextContent = nextPage.querySelector('.page-content') as HTMLElement;
    
    if (!currentContent || !nextContent) return false;
    
    const currentHeight = currentContent.getBoundingClientRect().height;
    const remainingSpace = availableHeight - currentHeight;
    
    if (remainingSpace < 50) return false; // Not enough space to pull content
    
    const nextBlocks = analyzePageContent(nextContent);
    let pulledHeight = 0;
    let moved = false;
    
    for (let blockIndex = 0; blockIndex < nextBlocks.length; blockIndex++) {
      const block = nextBlocks[blockIndex];
      
      if (block.isSpecialBlock) {
        if (pulledHeight + block.totalHeight <= remainingSpace) {
          // Move entire special block
          currentContent.appendChild(block.element);
          pulledHeight += block.totalHeight;
          moved = true;
        } else {
          break; // Can't fit, stop pulling
        }
      } else {
        // Pull lines from text block
        let linesPulled = 0;
        let lineHeight = 0;
        
        for (const line of block.lines) {
          if (pulledHeight + lineHeight + line.height <= remainingSpace) {
            lineHeight += line.height;
            linesPulled++;
          } else {
            break;
          }
        }
        
        if (linesPulled > 0) {
          if (linesPulled === block.lines.length) {
            // Pull entire block
            currentContent.appendChild(block.element);
            moved = true;
          } else {
            // Split block and pull first part
            const { firstPart, secondPart } = splitBlockAtLine(block, linesPulled);
            currentContent.appendChild(firstPart);
            nextContent.replaceChild(secondPart, block.element);
            moved = true;
          }
          pulledHeight += lineHeight;
        }
        
        // Stop if we can't pull any more lines from this block
        if (linesPulled === 0) break;
      }
    }
    
    return moved;
  }, [analyzePageContent, splitBlockAtLine]);

  const createNewPage = useCallback((): HTMLElement => {
    const newPageDiv = document.createElement('div');
    newPageDiv.className = 'page';
    
    const newPageContent = document.createElement('div');
    newPageContent.className = 'page-content';
    newPageContent.contentEditable = 'true';
    
    newPageDiv.appendChild(newPageContent);
    return newPageDiv;
  }, []);

  const getAvailableHeight = useCallback((options: ReflowOptions): number => {
    return options.pageHeight - options.marginTop - options.marginBottom;
  }, []);

  /**
   * Main reflow function using line-based logic
   */
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
      
      const contentHeight = currentContent.getBoundingClientRect().height;
      
      if (contentHeight > availableHeight) {
        // Need to move content to next page
        let nextPage = pages[i + 1];
        
        if (!nextPage) {
          // Create new page
          nextPage = createNewPage();
          container.appendChild(nextPage);
          pages.push(nextPage);
        }
        
        if (moveLinesToNextPage(currentPage, nextPage, availableHeight)) {
          hasChanges = true;
        }
      }
    }

    // Backward pass: fill up pages by pulling content from next pages
    for (let i = pages.length - 2; i >= 0; i--) {
      const currentPage = pages[i];
      const nextPage = pages[i + 1];
      
      if (!nextPage) continue;
      
      if (pullLinesToCurrentPage(currentPage, nextPage, availableHeight)) {
        hasChanges = true;
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
      
      if (content && !isUserActive && !hasFocus && 
          (!content.textContent?.trim() || content.innerHTML === '<p><br></p>' || content.innerHTML === '<br>' || content.innerHTML === '')) {
        page.remove();
        hasChanges = true;
      }
    }

    isReflowingRef.current = false;
    
    if (hasChanges) {
      saveToHistory(true);
    }
  }, [containerRef, getAvailableHeight, createNewPage, moveLinesToNextPage, pullLinesToCurrentPage, saveToHistory, DEFAULT_OPTIONS]);

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
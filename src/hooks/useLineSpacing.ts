//src/hooks/useLineSpacing.ts

'use client';

import { useState, useCallback } from 'react';

export type LineSpacing = 'single' | '1.5' | 'double';

export const useLineSpacing = () => {
  const [currentLineSpacing, setCurrentLineSpacing] = useState<LineSpacing>('1.5'); // Default to 1.5

  const getLineHeightValue = useCallback((spacing: LineSpacing): string => {
    switch (spacing) {
      case 'single':
        return '1.2';
      case '1.5':
        return '1.8';
      case 'double':
        return '2.4';
      default:
        return '1.8'; // Default to 1.5
    }
  }, []);

  const applyLineSpacing = useCallback((spacing: LineSpacing) => {
    const selection = window.getSelection();
    if (!selection) return;

    // Save the current selection/range
    let savedRange: Range | null = null;
    if (selection.rangeCount > 0) {
      savedRange = selection.getRangeAt(0).cloneRange();
    }

    const lineHeight = getLineHeightValue(spacing);

    // If no selection or collapsed selection, handle the current context
    if (!selection.rangeCount || selection.getRangeAt(0).collapsed) {
      // Find the current block element or create one if needed
      let targetElement: HTMLElement | null = null;
      
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        let element = node.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : node.parentElement;
        
        // Find the closest block element
        while (element && element.contentEditable !== 'true') {
          if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV', 'BLOCKQUOTE', 'LI'].includes(element.tagName)) {
            targetElement = element;
            break;
          }
          element = element.parentElement;
        }
        
        // If we're directly in page-content (no block element), we need to handle this specially
        if (!targetElement && element && element.classList.contains('page-content')) {
          // Check if there's any content in the page
          const textContent = element.textContent?.trim();
          if (textContent && textContent !== 'Start typing...') {
            // There's content but no proper block element, wrap it in a paragraph
            const p = document.createElement('p');
            p.style.lineHeight = lineHeight;
            p.dataset.lineSpacing = spacing;
            
            // Move all content to the new paragraph
            while (element.firstChild) {
              p.appendChild(element.firstChild);
            }
            element.appendChild(p);
            
            // Update the range to be inside the new paragraph
            if (savedRange) {
              try {
                savedRange.setStart(p, 0);
                savedRange.collapse(true);
              } catch (e) {
                // If range setting fails, create a new range
                savedRange = document.createRange();
                savedRange.setStart(p, 0);
                savedRange.collapse(true);
              }
            }
            targetElement = p;
          } else {
            // No content yet, just set the default for future content
            // We'll handle this when content is actually typed
            targetElement = element;
          }
        }
      } else {
        // No selection at all, find the first page content
        const pageContent = document.querySelector('.page-content') as HTMLElement;
        if (pageContent) {
          targetElement = pageContent;
        }
      }

      if (targetElement) {
        if (targetElement.classList.contains('page-content')) {
          // Apply to the page content as default, but don't override existing elements
          targetElement.dataset.defaultLineSpacing = spacing;
          
          // Apply to any existing children that don't have line spacing set
          const children = targetElement.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, blockquote, li');
          children.forEach(child => {
            const childElement = child as HTMLElement;
            if (!childElement.dataset.lineSpacing) {
              childElement.style.lineHeight = lineHeight;
              childElement.dataset.lineSpacing = spacing;
            }
          });
        } else {
          // Apply to the specific block element
          targetElement.style.lineHeight = lineHeight;
          targetElement.dataset.lineSpacing = spacing;
        }
      }
    } else {
      // Handle text selection
      const range = selection.getRangeAt(0);
      const getBlockElement = (node: Node): HTMLElement | null => {
        let current = node.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : node.parentElement;
        while (current && current.contentEditable !== 'true') {
          if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV', 'BLOCKQUOTE', 'LI'].includes(current.tagName)) {
            return current;
          }
          current = current.parentElement;
        }
        return null;
      };

      const startBlock = getBlockElement(range.startContainer);
      const endBlock = getBlockElement(range.endContainer);

      if (!startBlock) return;

      const elementsToUpdate = new Set<HTMLElement>();

      if (startBlock === endBlock) {
        elementsToUpdate.add(startBlock);
      } else {
        const pageContent = startBlock.closest('.page-content');
        if (pageContent) {
          const walker = document.createTreeWalker(
            pageContent,
            NodeFilter.SHOW_ELEMENT,
            {
              acceptNode: (node) => {
                const element = node as HTMLElement;
                if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV', 'BLOCKQUOTE', 'LI'].includes(element.tagName)) {
                  if (range.intersectsNode(element)) {
                    return NodeFilter.FILTER_ACCEPT;
                  }
                }
                return NodeFilter.FILTER_SKIP;
              }
            }
          );

          let node;
          while (node = walker.nextNode()) {
            elementsToUpdate.add(node as HTMLElement);
          }
        }
      }

      elementsToUpdate.forEach(element => {
        element.style.lineHeight = lineHeight;
        element.dataset.lineSpacing = spacing;
      });
    }

    setCurrentLineSpacing(spacing);

    // Restore the selection after a brief delay
    setTimeout(() => {
      if (savedRange) {
        try {
          selection.removeAllRanges();
          selection.addRange(savedRange);
        } catch (error) {
          console.warn('Could not restore selection:', error);
        }
      }
    }, 10);
  }, [getLineHeightValue]);

  const detectCurrentLineSpacing = useCallback((): LineSpacing => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return currentLineSpacing;

    const range = selection.getRangeAt(0);
    let node = range.startContainer;
    let element = node.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : node.parentElement;

    while (element && element.contentEditable !== 'true') {
      if (element.dataset.lineSpacing) {
        const spacing = element.dataset.lineSpacing as LineSpacing;
        setCurrentLineSpacing(spacing);
        return spacing;
      }
      
      if (element.style.lineHeight) {
        const lineHeight = parseFloat(element.style.lineHeight);
        let detectedSpacing: LineSpacing = '1.5';
        
        if (lineHeight >= 2.2) {
          detectedSpacing = 'double';
        } else if (lineHeight >= 1.6) {
          detectedSpacing = '1.5';
        } else {
          detectedSpacing = 'single';
        }
        
        setCurrentLineSpacing(detectedSpacing);
        return detectedSpacing;
      }
      
      element = element.parentElement;
    }

    // Check if page content has a default line spacing
    if (element && element.classList.contains('page-content')) {
      const defaultSpacing = element.dataset.defaultLineSpacing as LineSpacing;
      if (defaultSpacing) {
        setCurrentLineSpacing(defaultSpacing);
        return defaultSpacing;
      }
    }

    return currentLineSpacing;
  }, [currentLineSpacing]);

  const initializeDefaultLineSpacing = useCallback((pageContent: HTMLElement) => {
    if (!pageContent) return;
    
    const defaultSpacing = '1.5';
    
    // Don't apply line-height to the container itself
    // Instead, store the default spacing for new elements
    pageContent.dataset.defaultLineSpacing = defaultSpacing;
    setCurrentLineSpacing(defaultSpacing);
  }, []);

  const applyDefaultLineSpacingToElement = useCallback((element: HTMLElement) => {
    const pageContent = element.closest('.page-content') as HTMLElement;
    if (pageContent && pageContent.dataset.defaultLineSpacing) {
      const defaultSpacing = pageContent.dataset.defaultLineSpacing as LineSpacing;
      const lineHeight = getLineHeightValue(defaultSpacing);
      element.style.lineHeight = lineHeight;
      element.dataset.lineSpacing = defaultSpacing;
    }
  }, [getLineHeightValue]);

  return {
    currentLineSpacing,
    applyLineSpacing,
    detectCurrentLineSpacing,
    getLineHeightValue,
    initializeDefaultLineSpacing,
    applyDefaultLineSpacingToElement
  };
};
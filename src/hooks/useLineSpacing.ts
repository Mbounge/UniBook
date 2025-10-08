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

    let savedRange: Range | null = null;
    if (selection.rangeCount > 0) {
      savedRange = selection.getRangeAt(0).cloneRange();
    }

    const lineHeight = getLineHeightValue(spacing);

    if (!selection.rangeCount || selection.getRangeAt(0).collapsed) {
      let targetElement: HTMLElement | null = null;
      
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        let element = node.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : node.parentElement;
        
        while (element && element.contentEditable !== 'true') {
          if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV', 'BLOCKQUOTE', 'LI'].includes(element.tagName)) {
            targetElement = element;
            break;
          }
          element = element.parentElement;
        }
      }

      if (targetElement) {
          targetElement.style.lineHeight = lineHeight;
          targetElement.dataset.lineSpacing = spacing;
      }
    } else {
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
    
    return currentLineSpacing;
  }, [currentLineSpacing]);

  const initializeDefaultLineSpacing = useCallback((pageContent: HTMLElement) => {
    if (!pageContent) return;
    const defaultSpacing = '1.5';
    pageContent.dataset.defaultLineSpacing = defaultSpacing;
    setCurrentLineSpacing(defaultSpacing);
  }, []);

  return {
    currentLineSpacing,
    applyLineSpacing,
    detectCurrentLineSpacing,
    getLineHeightValue,
    initializeDefaultLineSpacing,
  };
};
//src/hooks/useLineSpacing.ts

'use client';

import { useState, useCallback } from 'react';

export type LineSpacing = '1.0' | '1.2' | '1.5' | 'double';

export const useLineSpacing = () => {
  // MODIFICATION: Changed the default initial state from '1.5' to '1.2'
  const [currentLineSpacing, setCurrentLineSpacing] = useState<LineSpacing>('1.2');

  const getLineHeightValue = useCallback((spacing: LineSpacing): string => {
    switch (spacing) {
      case '1.0': return '1.2';
      case '1.2': return '1.5';
      case '1.5': return '1.8';
      case 'double': return '2.4';
      default: return '1.5'; 
    }
  }, []);

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
        let detectedSpacing: LineSpacing = '1.2'; 
        
        if (lineHeight >= 2.2) {
          detectedSpacing = 'double';
        } else if (lineHeight >= 1.6) {
          detectedSpacing = '1.5';
        } else if (lineHeight >= 1.4) {
          detectedSpacing = '1.2';
        } else {
          detectedSpacing = '1.0';
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
    
    const defaultSpacing = '1.2';
    pageContent.dataset.defaultLineSpacing = defaultSpacing;
    setCurrentLineSpacing(defaultSpacing);
  }, []);


  return {
    currentLineSpacing,
    detectCurrentLineSpacing,
    getLineHeightValue,
    initializeDefaultLineSpacing,
  };
};
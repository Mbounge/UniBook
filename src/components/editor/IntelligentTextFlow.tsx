'use client';

import React, { useEffect } from 'react';

interface IntelligentTextFlowProps {
  editorRef: React.RefObject<HTMLDivElement>;
}

export const IntelligentTextFlow: React.FC<IntelligentTextFlowProps> = ({ editorRef }) => {
  
  const handleEnterKey = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || !editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const currentNode = range.startContainer;
    
    // Find if cursor is near an image
    const nearbyImage = findNearbyImage(currentNode, range.startOffset);
    
    if (nearbyImage) {
      const imageWrapper = nearbyImage.closest('.image-wrapper') as HTMLElement;
      const imagePosition = imageWrapper?.dataset.position;
      
      if (imagePosition === 'left' || imagePosition === 'right') {
        const shouldClearFloat = shouldClearToNextLine(nearbyImage, range);
        
        if (shouldClearFloat) {
          e.preventDefault();
          insertLineAfterImage(nearbyImage, range);
        }
        // If not clearing, let default behavior continue (text wraps alongside image)
      }
    }
  };

  const findNearbyImage = (node: Node, offset: number): HTMLImageElement | null => {
    const editor = editorRef.current;
    if (!editor) return null;

    // Get all images in the editor
    const images = Array.from(editor.querySelectorAll('.editor-image')) as HTMLImageElement[];
    
    // Find the image that might affect the current cursor position
    for (const image of images) {
      const imageWrapper = image.closest('.image-wrapper') as HTMLElement;
      if (!imageWrapper) continue;

      const position = imageWrapper.dataset.position;
      if (position === 'left' || position === 'right') {
        // Check if cursor is within the text wrapping area of this image
        if (isWithinImageWrappingArea(imageWrapper, node, offset)) {
          return image;
        }
      }
    }

    return null;
  };

  const isWithinImageWrappingArea = (imageWrapper: HTMLElement, node: Node, offset: number): boolean => {
    try {
      const imageRect = imageWrapper.getBoundingClientRect();
      const editor = editorRef.current;
      if (!editor) return false;

      // Create a range at the current cursor position
      const range = document.createRange();
      if (node.nodeType === Node.TEXT_NODE) {
        range.setStart(node, offset);
        range.setEnd(node, offset);
      } else {
        range.setStartBefore(node);
        range.setEndBefore(node);
      }

      const cursorRect = range.getBoundingClientRect();
      const editorRect = editor.getBoundingClientRect();

      // Check if cursor is vertically aligned with the image
      const imageTop = imageRect.top;
      const imageBottom = imageRect.bottom;
      const cursorY = cursorRect.top;

      // Check if cursor is within the image's vertical bounds
      if (cursorY >= imageTop && cursorY <= imageBottom) {
        const position = imageWrapper.dataset.position;
        
        if (position === 'left') {
          // For left-floated images, check if cursor is in the right area
          return cursorRect.left > imageRect.right;
        } else if (position === 'right') {
          // For right-floated images, check if cursor is in the left area
          return cursorRect.right < imageRect.left;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  };

  const shouldClearToNextLine = (image: HTMLImageElement, range: Range): boolean => {
    try {
      // Get current line text
      const currentLine = getCurrentLineText(range);
      const imageWrapper = image.closest('.image-wrapper') as HTMLElement;
      const imageRect = imageWrapper?.getBoundingClientRect();
      const editor = editorRef.current;
      
      if (!imageRect || !editor) return false;

      const editorRect = editor.getBoundingClientRect();
      const availableWidth = imageWrapper.dataset.position === 'left' 
        ? editorRect.right - imageRect.right - 32 // 32px for margins
        : imageRect.left - editorRect.left - 32;

      // Estimate if there's enough space for more text on this line
      const averageCharWidth = 8; // Approximate character width
      const currentLineLength = currentLine.length;
      const estimatedTextWidth = currentLineLength * averageCharWidth;
      
      // If we're close to filling the available space, move to next line
      return estimatedTextWidth > (availableWidth * 0.8);
    } catch (error) {
      return true; // Default to clearing when in doubt
    }
  };

  const getCurrentLineText = (range: Range): string => {
    try {
      const startContainer = range.startContainer;
      let textContent = '';

      if (startContainer.nodeType === Node.TEXT_NODE) {
        // Get text from start of current text node to cursor
        textContent = startContainer.textContent?.substring(0, range.startOffset) || '';
        
        // Try to get text from previous siblings on the same line
        let previousSibling = startContainer.previousSibling;
        while (previousSibling) {
          if (previousSibling.nodeType === Node.TEXT_NODE) {
            const text = previousSibling.textContent || '';
            // If we encounter a line break, stop
            if (text.includes('\n')) {
              const lastLineIndex = text.lastIndexOf('\n');
              textContent = text.substring(lastLineIndex + 1) + textContent;
              break;
            }
            textContent = text + textContent;
          } else if (previousSibling.nodeName === 'BR') {
            break;
          }
          previousSibling = previousSibling.previousSibling;
        }
      }

      return textContent;
    } catch (error) {
      return '';
    }
  };

  const insertLineAfterImage = (image: HTMLImageElement, currentRange: Range) => {
    try {
      const imageWrapper = image.closest('.image-wrapper') as HTMLElement;
      if (!imageWrapper) return;

      // Create a new paragraph after the image wrapper
      const newParagraph = document.createElement('div');
      newParagraph.style.clear = 'both';
      newParagraph.style.marginTop = '8px';
      newParagraph.innerHTML = '<br>'; // Ensure it's not empty

      // Insert after the image wrapper
      if (imageWrapper.nextSibling) {
        imageWrapper.parentNode?.insertBefore(newParagraph, imageWrapper.nextSibling);
      } else {
        imageWrapper.parentNode?.appendChild(newParagraph);
      }

      // Position cursor in the new paragraph
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.setStart(newParagraph, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }

    } catch (error) {
      console.warn('Error inserting line after image:', error);
    }
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.addEventListener('keydown', handleEnterKey);
    
    return () => {
      editor.removeEventListener('keydown', handleEnterKey);
    };
  }, [editorRef]);

  return null;
};
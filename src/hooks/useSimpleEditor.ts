"use client";

import { useRef, useCallback } from 'react';

// Defines the structure for image data
export interface ImageData {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export const useSimpleEditor = () => {
  const editorRef = useRef<HTMLDivElement>(null);

  /**
   * Inserts an image into the contentEditable div at the current cursor position.
   * This function creates a structured wrapper around the image to allow for
   * proper selection, alignment, and text flow.
   */
  const insertImage = useCallback((imageData: ImageData) => {
    if (!editorRef.current) {
      console.warn('Editor ref is not available for image insertion.');
      return;
    }

    const selection = window.getSelection();
    let range: Range;

    // Find a valid insertion point, defaulting to the end of the document
    if (selection && selection.rangeCount > 0 && editorRef.current.contains(selection.getRangeAt(0).commonAncestorContainer)) {
      range = selection.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false); // false collapses to the end
    }

    // Create the image element
    const img = document.createElement('img');
    img.src = imageData.src;
    img.alt = imageData.alt || '';
    img.className = 'editor-image'; // Crucial class for the ImageResizer to find it
    img.style.width = `${imageData.width}px`;
    img.style.height = `${imageData.height}px`;
    img.style.maxWidth = '100%';
    img.style.display = 'block'; // Ensures it behaves as a block inside the wrapper
    img.contentEditable = 'false'; // Prevents the image itself from being editable
    img.draggable = false; // We handle dragging with ImageResizer

    // Create a wrapper div. This is essential for floating and resizing.
    const wrapper = document.createElement('div');
    wrapper.className = 'image-wrapper';
    wrapper.style.display = 'inline-block'; // Default state is inline with text
    wrapper.style.position = 'relative';
    wrapper.style.width = `${imageData.width}px`;
    wrapper.style.height = `${imageData.height}px`;
    wrapper.contentEditable = 'false';
    wrapper.appendChild(img);

    // Insert the wrapper into the document
    range.deleteContents(); // Clear any selected text
    range.insertNode(wrapper);

    // Create a non-breaking space after the image to ensure the cursor
    // can be placed after it easily.
    const spaceNode = document.createTextNode('\u00A0');
    range.setStartAfter(wrapper);
    range.insertNode(spaceNode);

    // Move the cursor to be immediately after the space
    range.setStartAfter(spaceNode);
    range.collapse(true);

    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    editorRef.current.focus();
  }, []);

  return {
    editorRef,
    insertImage,
  };
};
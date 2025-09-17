"client-side";

import { useState, useEffect, useCallback, RefObject } from 'react';

/**
 * A simple hook to track whether there is an active text selection within the editor.
 * @param editorRef A React ref to the main contentEditable element, which can be null initially.
 * @returns An object containing a boolean `hasSelection`.
 */
// FIXED: The type now correctly accepts a ref that can be null.
export const useSimpleSelection = (editorRef: RefObject<HTMLDivElement | null>) => {
  const [hasSelection, setHasSelection] = useState(false);

  /**
   * Checks the window's current selection to see if it's a highlighted range
   * of text inside our editor.
   */
  const checkSelection = useCallback(() => {
    const selection = window.getSelection();
    
    // Ensure there is a selection and it has a range.
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // A "collapsed" range means it's just a blinking cursor, not a selection.
      const isCollapsed = range.collapsed;
      
      // Verify that the selection is actually inside the editor element.
      // This check now safely handles the possibility of editorRef.current being null.
      const isWithinEditor = editorRef.current && editorRef.current.contains(range.commonAncestorContainer);
      
      // Update state only if it's a non-collapsed selection within the editor.
      setHasSelection(!isCollapsed && !!isWithinEditor);
    } else {
      // No selection at all.
      setHasSelection(false);
    }
  }, [editorRef]);

  // Set up a listener to run the check whenever the user's selection changes.
  useEffect(() => {
    document.addEventListener('selectionchange', checkSelection);
    
    // Clean up the listener when the component unmounts.
    return () => {
      document.removeEventListener('selectionchange', checkSelection);
    };
  }, [checkSelection]);

  return {
    hasSelection,
  };
};
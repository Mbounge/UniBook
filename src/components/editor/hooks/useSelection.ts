//src/components/editor/hooks/useSelection.ts

'use client';

import { useCallback, useEffect, useState } from 'react';

export const useSelection = () => {
  const [selectedText, setSelectedText] = useState('');
  const [hasSelection, setHasSelection] = useState(false);

  const updateSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString() || '';
    setSelectedText(text);
    setHasSelection(text.length > 0);
  }, []);

  const copyText = useCallback(async () => {
    if (selectedText) {
      try {
        await navigator.clipboard.writeText(selectedText);
      } catch (err) {
        // Fallback
        document.execCommand('copy');
      }
    }
  }, [selectedText]);

  const cutText = useCallback(async () => {
    if (selectedText) {
      try {
        await navigator.clipboard.writeText(selectedText);
        document.execCommand('delete');
      } catch (err) {
        document.execCommand('cut');
      }
    }
  }, [selectedText]);

  const pasteText = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      document.execCommand('insertText', false, text);
    } catch (err) {
      // Fallback to browser paste
      document.execCommand('paste');
    }
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', updateSelection);
    return () => document.removeEventListener('selectionchange', updateSelection);
  }, [updateSelection]);

  return {
    selectedText,
    hasSelection,
    copyText,
    cutText,
    pasteText
  };
};
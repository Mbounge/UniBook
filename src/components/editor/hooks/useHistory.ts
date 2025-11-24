'use client';

import { useState, useCallback, useRef } from 'react';

interface HistoryPatch {
  pageIndex: number;
  html: string; // innerHTML of the .page element
}

interface HistoryState {
  patches: HistoryPatch[];
  startOffset: number;
  endOffset: number;
}

// Optimized debounce time for responsiveness
const INPUT_DEBOUNCE_MS = 200;
const MAX_HISTORY_STACK = 50; // Limit memory usage for large documents

const getSelectionOffsets = (container: HTMLElement): { startOffset: number; endOffset: number } => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return { startOffset: 0, endOffset: 0 };
  const range = selection.getRangeAt(0);
  const preSelectionRange = document.createRange();
  preSelectionRange.selectNodeContents(container);
  preSelectionRange.setEnd(range.startContainer, range.startOffset);
  const startOffset = preSelectionRange.toString().length;
  const endOffset = startOffset + range.toString().length;
  return { startOffset, endOffset };
};

const restoreSelectionFromOffsets = (container: HTMLElement, startOffset: number, endOffset: number): HTMLElement | null => {
  const selection = window.getSelection();
  if (!selection) return null;
  const range = document.createRange();
  const nodeIterator = document.createNodeIterator(container, NodeFilter.SHOW_TEXT);
  let currentNode: Node | null;
  let charCount = 0;
  let startNode: Node | null = null;
  let endNode: Node | null = null;
  let rangeStartOffset = 0;
  let rangeEndOffset = 0;
  while ((currentNode = nodeIterator.nextNode())) {
    const nodeLength = currentNode.textContent?.length ?? 0;
    if (!startNode && charCount + nodeLength >= startOffset) {
      startNode = currentNode;
      rangeStartOffset = startOffset - charCount;
    }
    if (!endNode && charCount + nodeLength >= endOffset) {
      endNode = currentNode;
      rangeEndOffset = endOffset - charCount;
      break;
    }
    charCount += nodeLength;
  }
  if (startNode && endNode) {
    try {
      range.setStart(startNode, rangeStartOffset);
      range.setEnd(endNode, rangeEndOffset);
      selection.removeAllRanges();
      selection.addRange(range);

      let elementToScrollTo = range.commonAncestorContainer;
      if (elementToScrollTo.nodeType === Node.TEXT_NODE) {
        elementToScrollTo = elementToScrollTo.parentElement!;
      }
      return elementToScrollTo as HTMLElement;

    } catch (e) { 
      console.error("Failed to restore selection:", e); 
      return null;
    }
  } else {
    try {
        range.selectNodeContents(container);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    } catch (e) { console.error("Failed to set cursor in empty editor:", e); }
    return container;
  }
};

const getCleanPageSnapshot = (pageElement: HTMLElement): string => {
  // Clone is expensive, but necessary for isolation. 
  // For 200 pages, we only call this on specific pages that change, not the whole doc.
  const pageClone = pageElement.cloneNode(true) as HTMLElement;
  
  // Clean up interactive/temporary elements before saving state
  pageClone.querySelectorAll('.math-wrapper, .graph-wrapper').forEach(el => { el.innerHTML = ''; });
  pageClone.querySelectorAll('.image-resize-overlay, .template-resize-overlay, .image-toolbar, .template-toolbar, .graph-resize-overlay, .graph-toolbar, .math-resize-overlay, .math-toolbar').forEach(el => el.remove());
  pageClone.querySelectorAll('.template-selected, .graph-selected, .math-selected').forEach(el => { 
    el.classList.remove('template-selected'); 
    el.classList.remove('graph-selected');
    el.classList.remove('math-selected');
  });
  
  return pageClone.innerHTML;
};


export const useHistory = (editorRef: React.RefObject<HTMLDivElement | null>) => {
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const inputTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTyping = useRef(false);
  const pendingPatches = useRef<Map<number, string>>(new Map());

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const commit = useCallback(() => {
    if (!editorRef.current || pendingPatches.current.size === 0) {
      if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current);
      isTyping.current = false;
      return;
    };
    
    isTyping.current = false;
    if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current);

    const { startOffset, endOffset } = getSelectionOffsets(editorRef.current);
    
    const newPatches: HistoryPatch[] = [];
    pendingPatches.current.forEach((html, pageIndex) => {
      newPatches.push({ pageIndex, html });
    });
    pendingPatches.current.clear();

    const newState: HistoryState = { patches: newPatches, startOffset, endOffset };
    
    // OPTIMIZATION: Slice history to prevent memory overflow
    const newHistory = [...history.slice(0, currentIndex + 1), newState].slice(-MAX_HISTORY_STACK);
    
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  }, [history, currentIndex, editorRef]);

  const record = useCallback((type: 'action' | 'input', affectedElements?: HTMLElement[]) => {
    if (!editorRef.current) return;
    if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current);

    const allPages = Array.from(editorRef.current.querySelectorAll('.page'));
    let elementsToPatch = affectedElements || [];

    // If no specific elements provided, find the page where the cursor is
    if (elementsToPatch.length === 0) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const startNode = range.startContainer;
        const parentElement = startNode.nodeType === Node.ELEMENT_NODE ? startNode as HTMLElement : startNode.parentElement;
        const page = parentElement?.closest('.page');
        if (page instanceof HTMLElement) {
          elementsToPatch.push(page);
        }
      }
    }

    // Only snapshot the pages that are actually affected
    elementsToPatch.forEach(el => {
      const page = el.closest('.page') as HTMLElement;
      if (page) {
        const pageIndex = allPages.indexOf(page);
        if (pageIndex !== -1) {
          pendingPatches.current.set(pageIndex, getCleanPageSnapshot(page));
        }
      }
    });

    if (type === 'action') {
      if (isTyping.current) {
        commit(); 
      }
      // Small delay to ensure DOM updates settle before commit
      setTimeout(commit, 50); 
    } else {
      isTyping.current = true;
      inputTimeoutRef.current = setTimeout(commit, INPUT_DEBOUNCE_MS);
    }
  }, [commit]);

  const undo = useCallback((): HistoryState | null => {
    if (isTyping.current) {
      commit();
      setTimeout(() => {
        if (canUndo) {
          setCurrentIndex(prev => prev - 1);
        }
      }, 50);
      return canUndo ? history[currentIndex -1] : null;
    }
    
    if (canUndo) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1];
    }
    return null;
  }, [canUndo, history, currentIndex, commit]);

  const redo = useCallback((): HistoryState | null => {
    if (canRedo) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1];
    }
    return null;
  }, [canRedo, history, currentIndex]);
  
  const initialize = useCallback(() => {
     if (editorRef.current && history.length === 0) {
        // Initial snapshot of the entire document
        // This is the only time we snapshot everything at once
        const allPages = Array.from(editorRef.current.querySelectorAll('.page')) as HTMLElement[];
        const initialPatches = allPages.map((page, index) => ({
          pageIndex: index,
          html: getCleanPageSnapshot(page)
        }));
        const initialState: HistoryState = { patches: initialPatches, startOffset: 0, endOffset: 0 };
        setHistory([initialState]);
        setCurrentIndex(0);
     }
  }, [editorRef, history.length]);

  const resetHistory = useCallback(() => {
    if (!editorRef.current) return;
    const allPages = Array.from(editorRef.current.querySelectorAll('.page')) as HTMLElement[];
    const initialPatches = allPages.map((page, index) => ({
      pageIndex: index,
      html: getCleanPageSnapshot(page)
    }));
    const initialState: HistoryState = { patches: initialPatches, startOffset: 0, endOffset: 0 };
    setHistory([initialState]);
    setCurrentIndex(0);
  }, [editorRef]);

  return {
    record,
    undo,
    redo,
    canUndo,
    canRedo,
    initialize,
    resetHistory,
    forceCommit: commit,
    restoreSelection: restoreSelectionFromOffsets,
  };
};
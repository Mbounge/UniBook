//src/components/editor/hooks/useHistory.ts

'use client';

import { useState, useCallback, useRef } from 'react';

interface HistoryState {
  html: string;
  startOffset: number;
  endOffset: number;
}

const INPUT_DEBOUNCE_MS = 1000;

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

const restoreSelectionFromOffsets = (container: HTMLElement, startOffset: number, endOffset: number) => {
  const selection = window.getSelection();
  if (!selection) return;
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
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const currentRange = selection.getRangeAt(0);
          let elementToScrollTo = currentRange.commonAncestorContainer;
          if (elementToScrollTo.nodeType === Node.TEXT_NODE) {
            elementToScrollTo = elementToScrollTo.parentElement!;
          }
          if (elementToScrollTo && (elementToScrollTo as HTMLElement).scrollIntoView) {
            (elementToScrollTo as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          }
        }
      }, 0);
    } catch (e) { console.error("Failed to restore selection:", e); }
  } else {
    const scrollableContainer = container.parentElement;
    if (scrollableContainer && typeof scrollableContainer.scrollTo === 'function') {
        scrollableContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
    try {
        range.selectNodeContents(container);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    } catch (e) { console.error("Failed to set cursor in empty editor:", e); }
  }
};

export const useHistory = (editorRef: React.RefObject<HTMLDivElement | null>) => {
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const inputTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTyping = useRef(false);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const getCleanSnapshot = useCallback((): string => {
    if (!editorRef.current) return '';
    const editorClone = editorRef.current.cloneNode(true) as HTMLElement;
    editorClone.querySelectorAll('.math-wrapper, .graph-wrapper').forEach(el => { el.innerHTML = ''; });
    editorClone.querySelectorAll('.image-resize-overlay, .template-resize-overlay, .image-toolbar, .template-toolbar, .graph-resize-overlay, .graph-toolbar').forEach(el => el.remove());
    editorClone.querySelectorAll('.template-selected, .graph-selected').forEach(el => { el.classList.remove('template-selected'); el.classList.remove('graph-selected'); });
    return editorClone.innerHTML;
  }, [editorRef]);

  const commit = useCallback(() => {
    if (!editorRef.current) return;
    isTyping.current = false;
    if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current);
    const { startOffset, endOffset } = getSelectionOffsets(editorRef.current);
    const newHtml = getCleanSnapshot();
    if (history[currentIndex]?.html === newHtml) return;
    const newState: HistoryState = { html: newHtml, startOffset, endOffset };
    const newHistory = [...history.slice(0, currentIndex + 1), newState].slice(-100);
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  }, [getCleanSnapshot, history, currentIndex, editorRef]);

  const record = useCallback((type: 'action' | 'input') => {
    if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current);
    if (type === 'action') {
      if (isTyping.current) commit();
      setTimeout(commit, 50); 
    } else {
      isTyping.current = true;
      inputTimeoutRef.current = setTimeout(commit, INPUT_DEBOUNCE_MS);
    }
  }, [commit]);

  const undo = useCallback((): HistoryState | null => {
    if (isTyping.current) commit();
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
        const initialHtml = getCleanSnapshot();
        const initialState: HistoryState = { html: initialHtml, startOffset: 0, endOffset: 0 };
        setHistory([initialState]);
        setCurrentIndex(0);
     }
  }, [editorRef, getCleanSnapshot, history.length]);

  const resetHistory = useCallback(() => {
    if (!editorRef.current) return;
    const initialHtml = getCleanSnapshot();
    const initialState: HistoryState = { html: initialHtml, startOffset: 0, endOffset: 0 };
    setHistory([initialState]);
    setCurrentIndex(0);
  }, [editorRef, getCleanSnapshot]);

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
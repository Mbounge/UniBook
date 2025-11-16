"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { FindOptions } from '../FindReplacePanel';

export interface Match { 
  node: Text;
  startOffset: number;
  endOffset: number;
  pageIndex: number;
}

export const useFindReplace = (
  editorRef: React.RefObject<HTMLDivElement | null>,
  saveToHistory: (force?: boolean, affectedElements?: HTMLElement[]) => void,
  fullDocumentReflow: () => Promise<void>
) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const currentQuery = useRef<{ query: string; options: FindOptions } | null>(null);

  const clearFindHighlights = useCallback(() => {
    setMatches([]);
    setCurrentIndex(-1);
    currentQuery.current = null;
  }, []);

  const findAll = useCallback(async (query: string, options: FindOptions) => {
    if (!editorRef.current || !query) {
      clearFindHighlights();
      return;
    }

    if (
      currentQuery.current?.query === query &&
      currentQuery.current?.options.matchCase === options.matchCase &&
      currentQuery.current?.options.wholeWord === options.wholeWord
    ) {
      if (matches.length > 0) {
        const newIndex = 0;
        setCurrentIndex(newIndex);
        selectMatch(newIndex, matches);
      }
      return;
    }

    setIsSearching(true);
    currentQuery.current = { query, options };
    
    await new Promise(resolve => setTimeout(resolve, 50));

    const newMatches: Match[] = [];
    const pages = Array.from(editorRef.current!.querySelectorAll('.page'));
    const flags = options.matchCase ? 'g' : 'gi';
    const searchPattern = options.wholeWord ? `\\b${query}\\b` : query;
    const regex = new RegExp(searchPattern, flags);

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex];
      const contentAreas = page.querySelectorAll('.page-content, .page-header, .page-footer');
      
      contentAreas.forEach(area => {
        const walker = document.createTreeWalker(area, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          const textNode = node as Text;
          const text = textNode.textContent || '';
          let match;
          while ((match = regex.exec(text)) !== null) {
            newMatches.push({
              node: textNode,
              startOffset: match.index,
              endOffset: match.index + match[0].length,
              pageIndex,
            });
          }
        }
      });

      if (pageIndex > 0 && pageIndex % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    setMatches(newMatches);
    setCurrentIndex(newMatches.length > 0 ? 0 : -1);
    setIsSearching(false);
  }, [editorRef, clearFindHighlights, matches.length]);

  const selectMatch = useCallback((index: number, currentMatches: Match[]) => {
    if (index < 0 || index >= currentMatches.length) return;
    const match = currentMatches[index];
    if (!document.body.contains(match.node)) {
      console.warn("Stale match detected, clearing results.");
      clearFindHighlights();
      return;
    }

    const range = document.createRange();
    range.setStart(match.node, match.startOffset);
    range.setEnd(match.node, match.endOffset);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const elementToScroll = match.node.parentElement;
    elementToScroll?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [clearFindHighlights]);

  useEffect(() => {
    if (matches.length > 0 && currentIndex >= 0) {
      const activeEl = document.activeElement;
      selectMatch(currentIndex, matches);

      if (activeEl && (activeEl as HTMLElement).closest('.find-replace-panel')) {
        (activeEl as HTMLElement).focus();
      }
    }
  }, [matches, currentIndex, selectMatch]);

  const findNext = useCallback(() => {
    if (matches.length === 0) return;
    const nextIndex = (currentIndex + 1) % matches.length;
    setCurrentIndex(nextIndex);
  }, [matches, currentIndex]);

  const findPrev = useCallback(() => {
    if (matches.length === 0) return;
    const prevIndex = (currentIndex - 1 + matches.length) % matches.length;
    setCurrentIndex(prevIndex);
  }, [matches, currentIndex]);

  const replace = useCallback((replaceText: string) => {
    if (currentIndex < 0 || currentIndex >= matches.length) return;

    const match = matches[currentIndex];
    if (!document.body.contains(match.node)) {
      clearFindHighlights();
      return;
    }

    const range = document.createRange();
    range.setStart(match.node, match.startOffset);
    range.setEnd(match.node, match.endOffset);
    range.deleteContents();
    range.insertNode(document.createTextNode(replaceText));

    saveToHistory(true);

    if (currentQuery.current) {
      findAll(currentQuery.current.query, currentQuery.current.options);
    }
  }, [matches, currentIndex, saveToHistory, findAll, clearFindHighlights]);

  const replaceAll = useCallback(async (replaceText: string) => {
    if (matches.length === 0) return;

    const affectedPages = new Set<HTMLElement>();

    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      if (document.body.contains(match.node)) {
        const page = match.node.parentElement?.closest('.page');
        if (page instanceof HTMLElement) {
          affectedPages.add(page);
        }
        const range = document.createRange();
        range.setStart(match.node, match.startOffset);
        range.setEnd(match.node, match.endOffset);
        range.deleteContents();
        range.insertNode(document.createTextNode(replaceText));
      }
    }

    clearFindHighlights();
    saveToHistory(true, Array.from(affectedPages));
    await fullDocumentReflow();
  }, [matches, saveToHistory, clearFindHighlights, fullDocumentReflow]);

  return {
    findAll,
    findNext,
    findPrev,
    replace,
    replaceAll,
    clearFindHighlights,
    findMatchIndex: currentIndex,
    findTotalMatches: matches.length,
    isSearching,
    matches, // --- MODIFICATION: Expose the raw matches array
  };
};
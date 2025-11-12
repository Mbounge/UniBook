"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { FindOptions } from '../FindReplacePanel';

interface Match {
  node: Text;
  startOffset: number;
  endOffset: number;
  pageIndex: number;
}

const getRectsForMatch = (match: Match): DOMRect[] => {
  if (!document.body.contains(match.node)) return [];
  const range = document.createRange();
  try {
    range.setStart(match.node, match.startOffset);
    range.setEnd(match.node, match.endOffset);
    return Array.from(range.getClientRects());
  } catch (e) {
    console.error("Error creating range for match:", e);
    return [];
  }
};

export const useFindReplace = (
  editorRef: React.RefObject<HTMLDivElement | null>,
  saveToHistory: (force?: boolean) => void,
  fullDocumentReflow: () => Promise<void> // --- MODIFICATION: Updated function signature to reflect it's a Promise
) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [findHighlightRects, setFindHighlightRects] = useState<DOMRect[]>([]);
  const currentQuery = useRef<{ query: string; options: FindOptions } | null>(null);

  const clearFindHighlights = useCallback(() => {
    setMatches([]);
    setCurrentIndex(-1);
    setFindHighlightRects([]);
    currentQuery.current = null;
  }, []);

  const findAll = useCallback((query: string, options: FindOptions) => {
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
        setCurrentIndex(0);
      }
      return;
    }

    setIsSearching(true);
    currentQuery.current = { query, options };
    
    setTimeout(() => {
      const newMatches: Match[] = [];
      const pages = Array.from(editorRef.current!.querySelectorAll('.page'));
      const flags = options.matchCase ? 'g' : 'gi';
      const searchPattern = options.wholeWord ? `\\b${query}\\b` : query;
      const regex = new RegExp(searchPattern, flags);

      pages.forEach((page, pageIndex) => {
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
      });

      setMatches(newMatches);
      setCurrentIndex(newMatches.length > 0 ? 0 : -1);
      setIsSearching(false);
    }, 50);
  }, [editorRef, clearFindHighlights, matches.length]);

  const selectMatch = useCallback((index: number) => {
    if (index < 0 || index >= matches.length) return;
    const match = matches[index];
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
  }, [matches, clearFindHighlights]);

  useEffect(() => {
    if (matches.length > 0 && currentIndex >= 0) {
      const activeEl = document.activeElement;

      selectMatch(currentIndex);

      if (activeEl && (activeEl as HTMLElement).closest('.find-replace-panel')) {
        (activeEl as HTMLElement).focus();
      }

      const allRects = matches.flatMap(getRectsForMatch);
      setFindHighlightRects(allRects);
    } else {
      setFindHighlightRects([]);
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

  // --- MODIFICATION START ---
  // Made this function async and replaced setTimeout with await.
  const replaceAll = useCallback(async (replaceText: string) => {
    if (matches.length === 0) return;

    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      if (document.body.contains(match.node)) {
        const range = document.createRange();
        range.setStart(match.node, match.startOffset);
        range.setEnd(match.node, match.endOffset);
        range.deleteContents();
        range.insertNode(document.createTextNode(replaceText));
      }
    }

    clearFindHighlights();
    saveToHistory(true);
    await fullDocumentReflow();
  }, [matches, saveToHistory, clearFindHighlights, fullDocumentReflow]);
  // --- MODIFICATION END ---

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
    findHighlightRects,
  };
};
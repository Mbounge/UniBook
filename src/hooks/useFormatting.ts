// src/hooks/useFormatting.ts

'use client';

import { useCallback } from 'react';
import { PageData, EditorLine, Span } from '@/types/editor';

// This is a simplified parser. A real-world scenario would be more robust.
const parseSpansFromHTML = (html: string): Span[] => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const spans: Span[] = [];

  const parseNode = (node: Node, formatting: any = {}) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) {
        spans.push({
          id: `span-${Date.now()}-${Math.random()}`,
          text: node.textContent,
          formatting,
        });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      let newFormatting = { ...formatting };
      switch (element.tagName) {
        case 'B': newFormatting.bold = true; break;
        case 'I': newFormatting.italic = true; break;
        case 'U': newFormatting.underline = true; break;
      }
      element.childNodes.forEach(child => parseNode(child, newFormatting));
    }
  };

  tempDiv.childNodes.forEach(node => parseNode(node));
  
  // If no content, ensure there's at least one empty span
  if (spans.length === 0) {
      spans.push({ id: `span-${Date.now()}`, text: '', formatting: {} });
  }

  return spans;
};

interface UseFormattingProps {
  pages: PageData[];
  setPages: (pages: PageData[]) => void;
  getAllLines: () => EditorLine[];
  getFlatIndexFromPageLine: (pageIndex: number, lineIndex: number) => number;
  redistributeContent: (lines: EditorLine[]) => PageData[];
}

export const useFormatting = ({
  pages,
  setPages,
  getAllLines,
  getFlatIndexFromPageLine,
  redistributeContent,
}: UseFormattingProps) => {

  const applyFormat = useCallback((command: 'bold' | 'italic' | 'underline') => {
    document.execCommand(command, false);
    // After command execution, we need to re-parse the HTML of the affected line
    // and update the state. This is handled by the onInput event in EditableLine.
  }, []);

  const updateLineFromHTML = useCallback((pageIndex: number, lineIndex: number, html: string) => {
    const newSpans = parseSpansFromHTML(html);
    const allLines = getAllLines();
    const flatIndex = getFlatIndexFromPageLine(pageIndex, lineIndex);

    const updatedLines = allLines.map((line, index) => 
      index === flatIndex ? { ...line, spans: newSpans } : line
    );
    
    const newPages = redistributeContent(updatedLines);
    setPages(newPages);
  }, [getAllLines, getFlatIndexFromPageLine, redistributeContent, setPages]);

  return {
    applyFormat,
    updateLineFromHTML,
  };
};
// src/types/editor.ts

export interface Span {
    id: string;
    text: string;
    formatting: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
    };
  }
  
  export interface EditorLine {
    id: string;
    spans: Span[];
  }
  
  export interface PageData {
    id: string;
    lines: EditorLine[];
    header?: string;
    footer?: string;
  }
  
  export interface CursorPosition {
    pageIndex: number;
    lineIndex: number;
    charIndex: number;
  }
  
  export interface SelectedRange {
    start: CursorPosition;
    end: CursorPosition;
  }
  
  // Helper to get plain text from a line
  export const getLineText = (line: EditorLine): string => {
    return line.spans.map(span => span.text).join('');
  };
  
  // Helper to convert an array of spans to an HTML string
  export const spansToHTML = (spans: Span[]): string => {
    if (!spans || spans.length === 0) return '';
    return spans.map(span => {
      let text = span.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (span.formatting.underline) text = `<u>${text}</u>`;
      if (span.formatting.italic) text = `<i>${text}</i>`;
      if (span.formatting.bold) text = `<b>${text}</b>`;
      return text;
    }).join('');
  };
  
  // --- NEW PARSER: Converts an HTML string from a contentEditable element back into EditorLine[] ---
  export const htmlToLines = (html: string): EditorLine[] => {
    const container = document.createElement('div');
    container.innerHTML = html;
    const newLines: EditorLine[] = [];
  
    // Helper to parse a single node into spans
    const parseNodeToSpans = (node: Node, formatting: any = {}): Span[] => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent ? [{ id: `span-${Date.now()}-${Math.random()}`, text: node.textContent, formatting }] : [];
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        let newFormatting = { ...formatting };
        switch (element.tagName) {
          case 'B': newFormatting.bold = true; break;
          case 'I': newFormatting.italic = true; break;
          case 'U': newFormatting.underline = true; break;
        }
        let childSpans: Span[] = [];
        element.childNodes.forEach(child => {
          childSpans = childSpans.concat(parseNodeToSpans(child, newFormatting));
        });
        return childSpans;
      }
      return [];
    };
  
    // Each direct child of the container is treated as a line
    container.childNodes.forEach((lineNode, index) => {
      let spans: Span[] = [];
      if (lineNode.nodeType === Node.ELEMENT_NODE) {
          lineNode.childNodes.forEach(child => {
              spans = spans.concat(parseNodeToSpans(child));
          });
      } else if (lineNode.nodeType === Node.TEXT_NODE) {
          // Handle case where a line is just plain text
          spans = parseNodeToSpans(lineNode);
      }
  
      // Ensure a line always has at least one span, even if empty
      if (spans.length === 0) {
        spans.push({ id: `span-${Date.now()}-${Math.random()}`, text: '', formatting: {} });
      }
      
      newLines.push({ id: `line-${Date.now()}-${Math.random()}-${index}`, spans });
    });
  
    // Ensure there's always at least one line
    if (newLines.length === 0) {
      newLines.push({ id: `line-${Date.now()}`, spans: [{ id: `span-${Date.now()}`, text: '', formatting: {} }] });
    }
  
    return newLines;
  };
  
  // --- UNUSED HELPERS (can be removed or kept for reference) ---
  export const comparePositions = (pos1: CursorPosition, pos2: CursorPosition): number => {
      if (pos1.pageIndex !== pos2.pageIndex) return pos1.pageIndex - pos2.pageIndex;
      if (pos1.lineIndex !== pos2.lineIndex) return pos1.lineIndex - pos2.lineIndex;
      return pos1.charIndex - pos2.charIndex;
  };
  
  export const getSelectedTextContent = (pages: PageData[], selectedRange: SelectedRange): string => {
      // This function would need to be updated to work with the new selection model if needed,
      // but for now, native browser copy/paste is sufficient.
      return '';
  };
import { EditorLine, EditorPage, CursorPosition } from '@/components/editor/types';

// A4 dimensions in pixels (at 96 DPI)
export const A4_WIDTH = 794; // 210mm
export const A4_HEIGHT = 1123; // 297mm
export const HEADER_HEIGHT = 60;
export const FOOTER_HEIGHT = 60;
export const MARGIN = 40;
export const CONTENT_HEIGHT = A4_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT - (MARGIN * 2);
export const LINE_HEIGHT = 24;

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const createEmptyLine = (): EditorLine => ({
  id: generateId(),
  content: '',
  height: LINE_HEIGHT,
  type: 'text',
});

export const createEmptyPage = (): EditorPage => ({
  id: generateId(),
  lines: [createEmptyLine()],
  header: '',
  footer: '',
});

export const measureLineHeight = (element: HTMLElement): number => {
  const computedStyle = window.getComputedStyle(element);
  const lineHeight = computedStyle.lineHeight;
  
  if (lineHeight === 'normal') {
    return parseFloat(computedStyle.fontSize) * 1.2;
  }
  
  return parseFloat(lineHeight);
};

export const canLinesFitInPage = (lines: EditorLine[], maxHeight: number): boolean => {
  const totalHeight = lines.reduce((sum, line) => sum + line.height, 0);
  return totalHeight <= maxHeight;
};
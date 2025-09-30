export interface EditorLine {
  id: string;
  content: string;
  height: number;
  type: 'text' | 'image' | 'latex' | 'template';
  styles?: Record<string, any>;
}

export interface EditorPage {
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

export interface EditorState {
  pages: EditorPage[];
  cursor: CursorPosition;
  selection?: {
    start: CursorPosition;
    end: CursorPosition;
  };
}
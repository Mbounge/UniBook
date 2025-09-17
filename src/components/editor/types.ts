export interface EditorState {
    content: string;
    pages: HTMLElement[];
    currentPage: number;
    cursorPosition: number;
  }
  
  export interface ImageElement {
    id: string;
    src: string;
    width: number;
    height: number;
    x: number;
    y: number;
    alt?: string;
  }
  
  export interface EditorConfig {
    pageWidth: number;
    pageHeight: number;
    margin: number;
    lineHeight: number;
    fontSize: number;
  }
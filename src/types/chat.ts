// This file will contain types shared between the ChatAssistant component and the useChatStore hook.

export interface StagedItem {
    id: string;
    type: 'book' | 'chapter' | 'subsection';
    bookTitle: string;
    coverImage: string;
    chapterTitle?: string;
    subsectionTitle?: string;
    content?: string;
  }
  
  export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'error';
    content: string;
    stagedContent?: StagedItem[];
    isRetryable?: boolean;
    componentState?: any;
    isStreaming?: boolean;
  }
//src/hooks/useChatStore.ts

import { create } from 'zustand';
import { Message, StagedItem } from '@/types/chat'; // <-- CORRECTED IMPORT

// Define the state and the actions
interface ChatState {
  messages: Message[];
  stagedContent: StagedItem[];
  isLoading: boolean;
  lastUserMessage: Message | null;
  
  // Actions
  setStagedContent: (items: StagedItem[]) => void;
  sendMessage: (userMessage: Message) => Promise<void>;
  resetConversation: () => void;
  handleAddToStaging: (item: Omit<StagedItem, 'id'>) => void;
  updateComponentState: (messageId: string, newState: any) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial State
  messages: [],
  stagedContent: [],
  isLoading: false,
  lastUserMessage: null,

  // Action to add items to staging area
  handleAddToStaging: (item) => {
    set(state => {
      const uniqueId = `${item.type}-${item.bookTitle}-${item.chapterTitle || ''}-${item.subsectionTitle || ''}`;
      const exists = state.stagedContent.some(staged => staged.id === uniqueId);
      if (!exists) {
        return { stagedContent: [...state.stagedContent, { ...item, id: uniqueId }] };
      }
      return {};
    });
  },

  // Action to manually set/clear staged content
  setStagedContent: (items) => set({ stagedContent: items }),

  // Action to update the state of an interactive component within a message
  updateComponentState: (messageId, newState) => {
    set(state => ({
      messages: state.messages.map(msg => 
        msg.id === messageId ? { ...msg, componentState: newState } : msg
      )
    }));
  },

  // The core action to send a message to the API
  sendMessage: async (userMessage) => {
    set({ isLoading: true, lastUserMessage: userMessage });
    
    const currentMessages = [...get().messages, userMessage];
    set({ messages: currentMessages });

    try {
      const response = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: currentMessages }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to get a response from the server.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = '';
      const assistantMessageId = (Date.now() + 1).toString();

      set(state => ({
        messages: [...state.messages, { 
          id: assistantMessageId, 
          role: 'assistant', 
          content: '', 
          componentState: {},
          isStreaming: true 
        }]
      }));

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistantResponse += chunk;
        
        set(state => ({
          messages: state.messages.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: assistantResponse, isStreaming: !done } 
              : msg
          )
        }));
      }
    } catch (error) {
      console.error("Error submitting chat message:", error);
      const errorId = (Date.now() + 2).toString();
      set(state => ({
        messages: [...state.messages, { id: errorId, role: 'error', content: 'Sorry, I encountered an error. Please try again.', isRetryable: true }]
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  // Action to completely reset the conversation state
  resetConversation: () => {
    set({
      messages: [],
      stagedContent: [],
      isLoading: false,
      lastUserMessage: null,
    });
  },
}));
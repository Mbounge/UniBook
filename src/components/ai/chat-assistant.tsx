// src/components/ai/chat-assistant.tsx

"use client";

import React, { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, X, Send, Loader2, Wand2, Merge, Video, Image, Bot, User, Copy, BotMessageSquareIcon } from "lucide-react";

// Mock API function
const mockApiRequest = async (body: any) => {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return { response: `This is an AI-generated response to: "${body.message}"` };
};

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
}

interface ChatAssistantProps {
  onClose?: () => void;
  selectedContent?: string;
  isPanel?: boolean;
}

export default function ChatAssistant({ onClose, selectedContent, isPanel = false }: ChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", type: "assistant", content: "Hi! How can I help you?" }
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const chatMutation = useMutation({
    mutationFn: (params: { message: string; context?: string }) => mockApiRequest(params),
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { id: Date.now().toString(), type: "assistant", content: data.response }]);
    },
    onError: () => {
      toast({ title: "AI Chat Error", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMessage: Message = { id: Date.now().toString(), type: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate({ message: input, context: selectedContent });
    setInput("");
  };

  const handleQuickAction = (action: string) => {
    if (!selectedContent) {
      toast({ title: "Please select text in the editor first.", variant: "destructive" });
      return;
    }
    let prompt = "";
    // Logic for different quick actions
    switch (action) {
      case "format": prompt = "Format this content for a textbook."; break;
      default: prompt = `Perform action '${action}' on the selected text.`;
    }
    const userMessage: Message = { id: Date.now().toString(), type: "user", content: prompt };
    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate({ message: prompt, context: selectedContent });
  };

  if (!isPanel) return null;

  return (
    <div className="w-96 bg-white border-r border-gray-200 flex flex-col animate-in slide-in-from-left duration-300 h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BotMessageSquareIcon className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-4 h-4 text-black" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => handleQuickAction('format')} disabled={!selectedContent} className="p-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center disabled:opacity-50">
            <Wand2 className="w-4 h-4 mr-2" /> Format
          </button>
          <button onClick={() => handleQuickAction('merge')} disabled={!selectedContent} className="p-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center disabled:opacity-50">
            <Merge className="w-4 h-4 mr-2" /> Merge
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex items-end gap-2 ${message.type === "user" ? "justify-end" : "justify-start"}`}>
            {message.type === "assistant" && <Bot className="w-6 h-6 text-gray-400 flex-shrink-0" />}
            <div className={`max-w-xs px-4 py-2 rounded-lg ${message.type === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"}`}>
              <p className="text-sm">{message.content}</p>
            </div>
            {message.type === "user" && <User className="w-6 h-6 text-gray-400 flex-shrink-0" />}
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2 text-sm">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-black"
            disabled={chatMutation.isPending}
          />
          <button
            onClick={handleSend}
            disabled={chatMutation.isPending || !input.trim()}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center disabled:bg-purple-400"
          >
            {chatMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
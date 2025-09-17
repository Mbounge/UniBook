// src/components/tools/ai-content-lab.tsx

"use client";

import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Wand2, FileText, Zap, Book, Brain, Copy, Loader2 } from "lucide-react";

export default function AIContentLab() {
  const [prompt, setPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [contentType, setContentType] = useState("text");
  const { toast } = useToast();

  const contentTypes = [
    { id: "text", label: "Text", icon: FileText },
    { id: "quiz", label: "Quiz", icon: Zap },
    { id: "summary", label: "Summary", icon: Book },
    { id: "explanation", label: "Explanation", icon: Brain },
  ];

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({ title: "Prompt Required", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setGeneratedContent("");
    setTimeout(() => {
      // Mock generation logic
      setGeneratedContent(`This is an AI-generated ${contentType} for the prompt: "${prompt}"`);
      setIsGenerating(false);
      toast({ title: "Content Generated!" });
    }, 1500);
  };

  const copyToClipboard = () => {
    if (!generatedContent) return;
    navigator.clipboard.writeText(generatedContent);
    toast({ title: "Copied to clipboard!" });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 flex items-center">
          <Wand2 className="w-5 h-5 mr-2 text-blue-600" />
          AI Content Lab
        </h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">1. Select Content Type</label>
              <div className="grid grid-cols-2 gap-2">
                {contentTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setContentType(type.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center transition-colors ${
                      contentType === type.id
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <type.icon className="h-4 w-4 mr-2" />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">2. Describe What to Generate</label>
              <textarea
                id="prompt"
                placeholder="e.g., Explain photosynthesis for first-year students..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:bg-blue-400"
            >
              {isGenerating ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Sparkles className="h-5 w-5 mr-2" />}
              {isGenerating ? "Generating..." : "Generate Content"}
            </button>
          </div>

          {/* Output Panel */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-900">Generated Content</h3>
              {generatedContent && (
                <button onClick={copyToClipboard} className="p-2 hover:bg-gray-200 rounded-lg">
                  <Copy className="h-4 w-4 text-gray-600" />
                </button>
              )}
            </div>
            <div className="w-full h-64 bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-800 overflow-y-auto">
              {isGenerating ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : generatedContent ? (
                <p>{generatedContent}</p>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>Your generated content will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
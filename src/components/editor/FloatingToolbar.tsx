"use client";

import React, { useEffect, useState } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Link, 
  Highlighter, 
  Sparkles, 
  MessageSquarePlus 
} from 'lucide-react';

interface FloatingToolbarProps {
  position: { top: number; left: number } | null;
  isVisible: boolean;
  states: {
    isBold: boolean;
    isItalic: boolean;
    isUnderline: boolean;
    isHighlighted: boolean;
    isLink: boolean;
  };
  onFormat: (command: string, value?: string) => void;
  onAiAssist: () => void;
}

export const FloatingToolbar = ({ 
  position, 
  isVisible, 
  states, 
  onFormat,
  onAiAssist 
}: FloatingToolbarProps) => {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isVisible) {
      setShowLinkInput(false);
      setLinkUrl('');
    }
  }, [isVisible]);

  useEffect(() => {
    if (showLinkInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showLinkInput]);

  if (!isVisible || !position) return null;

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFormat('createLink', linkUrl);
    setShowLinkInput(false);
    setLinkUrl('');
  };

  return (
    <div
      className="fixed z-50 flex items-center bg-gray-900 text-white rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-200"
      style={{
        top: position.top - 50, // Position above selection
        left: position.left,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing selection focus
    >
      {showLinkInput ? (
        <form onSubmit={handleLinkSubmit} className="flex items-center p-1">
          <input
            ref={inputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Paste link..."
            className="bg-transparent border-none text-white text-sm px-2 py-1 w-48 focus:ring-0 focus:outline-none placeholder-gray-400"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowLinkInput(false);
              e.stopPropagation(); // Prevent editor from catching keys
            }}
          />
          <button 
            type="submit"
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <Link className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <div className="flex items-center p-1 gap-0.5">
          <button
            onClick={() => onAiAssist()}
            className="flex items-center gap-1 px-2 py-1 hover:bg-purple-600 text-purple-200 hover:text-white rounded transition-colors mr-1 border-r border-gray-700"
            title="AI Assist"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-medium">Ask AI</span>
          </button>

          <ToolbarButton 
            isActive={states.isBold} 
            onClick={() => onFormat('bold')} 
            icon={Bold} 
          />
          <ToolbarButton 
            isActive={states.isItalic} 
            onClick={() => onFormat('italic')} 
            icon={Italic} 
          />
          <ToolbarButton 
            isActive={states.isUnderline} 
            onClick={() => onFormat('underline')} 
            icon={Underline} 
          />
          <ToolbarButton 
            isActive={states.isHighlighted} 
            onClick={() => onFormat('hiliteColor', states.isHighlighted ? 'transparent' : '#FFF3A3')} 
            icon={Highlighter} 
          />
          
          <div className="w-px h-4 bg-gray-700 mx-1" />
          
          <ToolbarButton 
            isActive={states.isLink} 
            onClick={() => setShowLinkInput(true)} 
            icon={Link} 
          />
          <ToolbarButton 
            isActive={false} 
            onClick={() => {}} 
            icon={MessageSquarePlus} 
          />
        </div>
      )}
      
      {/* Little arrow pointing down */}
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 rotate-45" />
    </div>
  );
};

const ToolbarButton = ({ 
  isActive, 
  onClick, 
  icon: Icon 
}: { 
  isActive: boolean; 
  onClick: () => void; 
  icon: React.ElementType 
}) => (
  <button
    onClick={onClick}
    className={`p-1.5 rounded transition-colors ${
      isActive ? 'text-blue-400 bg-gray-800' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`}
  >
    <Icon className="w-4 h-4" />
  </button>
);
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Image as ImageIcon, 
  Table, 
  Sigma, 
  Quote, 
  Code,
  Minus
} from 'lucide-react';

interface SlashMenuProps {
  position: { top: number; left: number };
  onSelect: (command: string) => void;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

export const SlashMenu = ({ position, onSelect, onClose }: SlashMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items: CommandItem[] = [
    { id: 'h1', label: 'Heading 1', icon: Heading1, description: 'Big section heading' },
    { id: 'h2', label: 'Heading 2', icon: Heading2, description: 'Medium section heading' },
    { id: 'h3', label: 'Heading 3', icon: Heading3, description: 'Small section heading' },
    { id: 'bullet', label: 'Bulleted List', icon: List, description: 'Create a simple bulleted list' },
    { id: 'number', label: 'Numbered List', icon: ListOrdered, description: 'Create a numbered list' },
    { id: 'image', label: 'Image', icon: ImageIcon, description: 'Upload or embed an image' },
    { id: 'table', label: 'Table', icon: Table, description: 'Insert a simple table' },
    { id: 'math', label: 'Math Formula', icon: Sigma, description: 'Insert a LaTeX equation' },
    { id: 'quote', label: 'Blockquote', icon: Quote, description: 'Capture a quote' },
    { id: 'code', label: 'Code Block', icon: Code, description: 'Capture a code snippet' },
    { id: 'divider', label: 'Divider', icon: Minus, description: 'Visually separate content' },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + items.length) % items.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(items[selectedIndex].id);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, items, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = menuRef.current?.children[0]?.children[selectedIndex] as HTMLElement;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Close if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col"
      style={{ 
        top: position.top + 24, 
        left: position.left,
        maxHeight: '300px'
      }}
    >
      <div className="overflow-y-auto py-2">
        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50 border-b border-gray-100 mb-1">
          Basic Blocks
        </div>
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors ${
              index === selectedIndex 
                ? 'bg-blue-50' 
                : 'hover:bg-gray-50'
            }`}
          >
            <div className={`p-1.5 rounded border ${
              index === selectedIndex 
                ? 'bg-white border-blue-200 text-blue-600' 
                : 'bg-white border-gray-200 text-gray-500'
            }`}>
              <item.icon className="w-4 h-4" />
            </div>
            <div>
              <div className={`text-sm font-medium ${
                index === selectedIndex ? 'text-blue-900' : 'text-gray-700'
              }`}>
                {item.label}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {item.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
// src/components/editor/EditorToolbar.tsx (COMPLETE FIXED FILE)
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo, Redo, ChevronDown
} from 'lucide-react';

const ToolbarButton = React.forwardRef<HTMLButtonElement, { 
  onClick: () => void; 
  title: string; 
  isActive?: boolean; 
  disabled?: boolean; 
  children: React.ReactNode; 
}>(({ onClick, title, isActive, disabled, children }, ref) => (
  <button 
    ref={ref} 
    onMouseDown={(e) => {
      e.preventDefault(); // Prevent focus loss from editor
      onClick();
    }}
    title={title} 
    disabled={disabled} 
    className={`p-2 rounded-lg transition-all duration-200 ${
      isActive 
        ? "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border border-blue-200" 
        : "hover:bg-gray-100 text-gray-700 hover:text-gray-900 border border-transparent"
    } disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95`}
  >
    {children}
  </button>
));
ToolbarButton.displayName = 'ToolbarButton';

const Dropdown = ({ 
  options, 
  value, 
  onChange, 
  title, 
  widthClass = "w-40" 
}: { 
  options: { label: string, value: string }[], 
  value: string, 
  onChange: (value: string) => void, 
  title: string, 
  widthClass?: string 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find(opt => opt.value === value)?.label || value;
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { 
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false); 
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  return (
    <div ref={ref} className="relative">
      <button 
        onMouseDown={(e) => {
          e.preventDefault(); // Prevent focus loss
          setIsOpen(!isOpen);
        }}
        className={`flex items-center justify-between px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 ${widthClass} hover:scale-105 active:scale-95`}
      >
        <span className="truncate font-medium text-gray-700">{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 ml-2 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className={`absolute z-20 top-full mt-2 bg-white rounded-lg border border-gray-200 overflow-hidden max-h-60 overflow-y-auto ${widthClass}`}>
          {options.map(option => (
            <button 
              key={option.value} 
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent focus loss
                onChange(option.value); 
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors duration-150 font-medium text-gray-700 hover:text-gray-900"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface EditorToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onBlockTypeChange: (type: string) => void;
  onFontChange: (font: string) => void;
  onSizeChange: (size: string) => void;
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onAlign: (alignment: 'left' | 'center' | 'right' | 'justify') => void;
  canUndo: boolean;
  canRedo: boolean;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  textAlign: string;
  currentBlockType: string;
  currentFont: string;
  currentSize: string;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onUndo,
  onRedo,
  onBlockTypeChange,
  onFontChange,
  onSizeChange,
  onBold,
  onItalic,
  onUnderline,
  onAlign,
  canUndo,
  canRedo,
  isBold,
  isItalic,
  isUnderline,
  textAlign,
  currentBlockType,
  currentFont,
  currentSize,
}) => {
  const blockTypeOptions = [
    { label: "Paragraph", value: "p" },
    { label: "Heading 1", value: "h1" },
    { label: "Heading 2", value: "h2" },
    { label: "Heading 3", value: "h3" },
    { label: "Heading 4", value: "h4" }
  ];

  const fontOptions = [
    { label: "Inter", value: "Inter" },
    { label: "Arial", value: "Arial" },
    { label: "Georgia", value: "Georgia" },
    { label: "Times New Roman", value: "Times New Roman" }
  ];

  const fontSizeOptions = [
    { label: "12pt", value: "12pt" },
    { label: "14pt", value: "14pt" },
    { label: "16pt", value: "16pt" },
    { label: "18pt", value: "18pt" },
    { label: "24pt", value: "24pt" }
  ];

  return (
    <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-lg p-3 flex items-center flex-wrap gap-1 mb-4">
      <ToolbarButton onClick={onUndo} title="Undo" disabled={!canUndo}>
        <Undo className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={onRedo} title="Redo" disabled={!canRedo}>
        <Redo className="w-4 h-4" />
      </ToolbarButton>
      
      <div className="h-6 w-px bg-gray-200 mx-2"></div>
      
      <Dropdown 
        options={blockTypeOptions} 
        value={currentBlockType} 
        onChange={onBlockTypeChange} 
        title="Block Type" 
        widthClass="w-36" 
      />
      
      <div className="h-6 w-px bg-gray-200 mx-2"></div>
      
      <Dropdown 
        options={fontOptions} 
        value={currentFont} 
        onChange={onFontChange} 
        title="Font Family" 
      />
      <Dropdown 
        options={fontSizeOptions} 
        value={currentSize} 
        onChange={onSizeChange} 
        title="Font Size" 
        widthClass="w-24" 
      />
      
      <div className="h-6 w-px bg-gray-200 mx-2"></div>
      
      <ToolbarButton onClick={onBold} title="Bold" isActive={isBold}>
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={onItalic} title="Italic" isActive={isItalic}>
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={onUnderline} title="Underline" isActive={isUnderline}>
        <Underline className="w-4 h-4" />
      </ToolbarButton>
      
      <div className="h-6 w-px bg-gray-200 mx-2"></div>
      
      <ToolbarButton onClick={() => onAlign('left')} title="Align Left" isActive={textAlign === 'left'}>
        <AlignLeft className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => onAlign('center')} title="Align Center" isActive={textAlign === 'center'}>
        <AlignCenter className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => onAlign('right')} title="Align Right" isActive={textAlign === 'right'}>
        <AlignRight className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => onAlign('justify')} title="Align Justify" isActive={textAlign === 'justify'}>
        <AlignJustify className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
};
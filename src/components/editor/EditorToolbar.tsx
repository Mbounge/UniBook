// src/components/editor/EditorToolbar.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Image, Undo, Redo, Highlighter, List, ListOrdered,
  MessageSquareQuote, Code, ChevronDown, ListTree, Table, Sigma, Link,
  ArrowUpToLine, ArrowDownToLine
} from 'lucide-react';
import { TableCreationGrid } from './TableCreationGrid';
import { ColorPicker } from './ColorPicker';
import { LineSpacingDropdown } from './LineSpacingDropdown';
import { LineSpacing } from '@/hooks/useLineSpacing';

const ToolbarButton = React.forwardRef<HTMLButtonElement, { onClick: () => void; title: string; isActive?: boolean; disabled?: boolean; children: React.ReactNode; }>(
  ({ onClick, title, isActive, disabled, children }, ref) => (
    <button ref={ref} onMouseDown={(e) => e.preventDefault()} onClick={onClick} title={title} disabled={disabled} className={`p-2 rounded-lg transition-all duration-200 ${isActive ? "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border border-blue-200" : "hover:bg-gray-100 text-gray-700 hover:text-gray-900 border border-transparent"} disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95`}>
      {children}
    </button>
  )
);
ToolbarButton.displayName = 'ToolbarButton';

// --- NEW LABELED BUTTON COMPONENT ---
const LabeledToolbarButton: React.FC<{
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, title, children }) => (
  <button
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    title={title}
    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-800 border border-gray-200 transition-all duration-200 hover:scale-105 active:scale-95"
  >
    {children}
  </button>
);
// --- END NEW COMPONENT ---

const Dropdown = ({ options, value, onChange, title, widthClass = "w-40" }: { options: { label: string, value: string }[], value: string, onChange: (value: string) => void, title: string, widthClass?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find(opt => opt.value === value)?.label || value;
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button 
        onMouseDown={(e) => e.preventDefault()} 
        onClick={() => setIsOpen(!isOpen)} 
        className={`flex items-center justify-between px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 ${widthClass} hover:scale-105 active:scale-95`}
      >
        <span className="truncate font-medium text-gray-700">{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 ml-2 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className={`absolute z-20 top-full mt-2 bg-white rounded-lg border border-gray-200 overflow-hidden max-h-60 overflow-y-auto ${widthClass}`}>
          {options.map(option => (<button key={option.value} onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(option.value); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors duration-150 font-medium text-gray-700 hover:text-gray-900">{option.label}</button>))}
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
  onHighlight: () => void;
  onAlign: (alignment: 'left' | 'center' | 'right' | 'justify') => void;
  onBulletedList: () => void;
  onNumberedList: () => void;
  onInsertImage: () => void;
  onBlockquote: () => void;
  onCodeBlock: () => void;
  onToggleOutline: () => void;
  onToggleStyleStudio: () => void;
  onToggleAiPanel: () => void;
  onInsertTable: (rows: number, cols: number) => void;
  onTableMenuOpen: () => void;
  onTextColorChange: (color: string) => void;
  onColorMenuOpen: () => void;
  onLineSpacingChange: (spacing: LineSpacing) => void;
  onLineSpacingMenuOpen: () => void;
  onInsertMath: () => void;
  onLink: () => void;
  onEditHeader: () => void;
  onEditFooter: () => void;
  isTocOpen: boolean;
  isStyleStudioOpen: boolean;
  isAiPanelOpen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isHighlighted: boolean;
  isLink: boolean;
  textAlign: string;
  currentBlockType: string;
  currentFont: string;
  currentSize: string;
  currentTextColor: string;
  currentLineSpacing: LineSpacing;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = (props) => {
  const {
    canUndo, canRedo, isBold, isItalic, isUnderline, isHighlighted, isLink, textAlign,
    currentBlockType, currentFont, currentSize, currentTextColor, currentLineSpacing,
    onUndo, onRedo, onBlockTypeChange, onFontChange, onSizeChange, onBold, onItalic,
    onUnderline, onHighlight, onAlign, onBulletedList, onNumberedList, onInsertImage,
    onBlockquote, onCodeBlock, onToggleOutline, onInsertTable, onTableMenuOpen, 
    onTextColorChange, onColorMenuOpen, onLineSpacingChange, onLineSpacingMenuOpen, 
    onInsertMath, onLink, onEditHeader, onEditFooter,
    isTocOpen
  } = props;

  const [isTableMenuOpen, setTableMenuOpen] = useState(false);
  const tableMenuRef = useRef<HTMLDivElement>(null);
  const tableButtonRef = useRef<HTMLButtonElement>(null);
  const [gridPositionStyle, setGridPositionStyle] = useState({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tableMenuRef.current && !tableMenuRef.current.contains(event.target as Node)) {
        setTableMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTableSelect = (rows: number, cols: number) => {
    onInsertTable(rows, cols);
    setTableMenuOpen(false);
  };

  const handleTableButtonClick = () => {
    if (tableButtonRef.current) {
      const rect = tableButtonRef.current.getBoundingClientRect();
      const gridWidth = 160;

      if (rect.right + gridWidth > window.innerWidth) {
        setGridPositionStyle({ right: 0 });
      } else {
        setGridPositionStyle({ left: 0 });
      }
    }
    
    onTableMenuOpen();
    setTableMenuOpen(!isTableMenuOpen);
  };

  const blockTypeOptions = [{ label: "Paragraph", value: "p" }, { label: "Heading 1", value: "h1" }, { label: "Heading 2", value: "h2" }, { label: "Heading 3", "value": "h3" }, { label: "Heading 4", value: "h4" }];
  const fontOptions = [{ label: "Inter", value: "Inter" }, { label: "Arial", value: "Arial" }, { label: "Georgia", value: "Georgia" }, { label: "Times New Roman", value: "Times New Roman" }];
  const fontSizeOptions = [{ label: "12pt", value: "12pt" }, { label: "14pt", value: "14pt" }, { label: "16pt", value: "16pt" }, { label: "18pt", value: "18pt" }, { label: "24pt", value: "24pt" }];

  return (
    <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-lg p-3 flex items-center flex-wrap gap-1">
      <ToolbarButton onClick={onToggleOutline} title="Outline" isActive={isTocOpen}><ListTree className="w-4 h-4" /></ToolbarButton>
      <div className="h-6 w-px bg-gray-200 mx-2"></div>
      <ToolbarButton onClick={onUndo} title="Undo" disabled={!canUndo}><Undo className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton onClick={onRedo} title="Redo" disabled={!canRedo}><Redo className="w-4 h-4" /></ToolbarButton>
      <div className="h-6 w-px bg-gray-200 mx-2"></div>
      <Dropdown options={blockTypeOptions} value={currentBlockType} onChange={onBlockTypeChange} title="Block Type" widthClass="w-36" />
      <div className="h-6 w-px bg-gray-200 mx-2"></div>
      <Dropdown options={fontOptions} value={currentFont} onChange={onFontChange} title="Font Family" />
      <Dropdown options={fontSizeOptions} value={currentSize} onChange={onSizeChange} title="Font Size" widthClass="w-24" />
      <div className="h-6 w-px bg-gray-200 mx-2"></div>
      <ToolbarButton onClick={onBold} title="Bold" isActive={isBold}><Bold className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton onClick={onItalic} title="Italic" isActive={isItalic}><Italic className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton onClick={onUnderline} title="Underline" isActive={isUnderline}><Underline className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton onClick={onLink} title="Link" isActive={isLink}><Link className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton onClick={onHighlight} title="Highlight" isActive={isHighlighted}><Highlighter className="w-4 h-4" /></ToolbarButton>
      <ColorPicker 
        currentColor={currentTextColor} 
        onColorChange={onTextColorChange} 
        onMenuOpen={onColorMenuOpen}
      />
      <div className="h-6 w-px bg-gray-200 mx-2"></div>
      <ToolbarButton onClick={() => onAlign('left')} title="Align Left" isActive={textAlign === 'left'}><AlignLeft className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton onClick={() => onAlign('center')} title="Align Center" isActive={textAlign === 'center'}><AlignCenter className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton onClick={() => onAlign('right')} title="Align Right" isActive={textAlign === 'right'}><AlignRight className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton onClick={() => onAlign('justify')} title="Align Justify" isActive={textAlign === 'justify'}><AlignJustify className="w-4 h-4" /></ToolbarButton>
      <LineSpacingDropdown
        currentSpacing={currentLineSpacing}
        onSpacingChange={onLineSpacingChange}
        onMenuOpen={onLineSpacingMenuOpen}
      />
      <div className="h-6 w-px bg-gray-200 mx-2"></div>
      <ToolbarButton onClick={onBulletedList} title="Bulleted List"><List className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton onClick={onNumberedList} title="Numbered List"><ListOrdered className="w-4 h-4" /></ToolbarButton>
      <div className="h-6 w-px bg-gray-200 mx-2"></div>
      <ToolbarButton onClick={onInsertImage} title="Add Image"><Image className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton onClick={onInsertMath} title="Insert Formula"><Sigma className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton onClick={onBlockquote} title="Blockquote"><MessageSquareQuote className="w-4 h-4" /></ToolbarButton>
      <ToolbarButton onClick={onCodeBlock} title="Code Block"><Code className="w-4 h-4" /></ToolbarButton>
      <div ref={tableMenuRef} className="relative">
        <ToolbarButton ref={tableButtonRef} onClick={handleTableButtonClick} title="Insert Table">
          <Table className="w-4 h-4" />
        </ToolbarButton>
        {isTableMenuOpen && (
          <div style={gridPositionStyle} className="absolute z-50 mt-2">
            <TableCreationGrid onSelect={handleTableSelect} />
          </div>
        )}
      </div>
      {/* --- REVISED HEADER/FOOTER BUTTONS --- */}
      <div className="h-6 w-px bg-gray-200 mx-2"></div>
      <LabeledToolbarButton onClick={onEditHeader} title="Edit Header">
        <ArrowUpToLine className="w-4 h-4" />
        <span>Header</span>
      </LabeledToolbarButton>
      <LabeledToolbarButton onClick={onEditFooter} title="Edit Footer">
        <ArrowDownToLine className="w-4 h-4" />
        <span>Footer</span>
      </LabeledToolbarButton>
      {/* --- END REVISED BUTTONS --- */}
    </div>
  );
};
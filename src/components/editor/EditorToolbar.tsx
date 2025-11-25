'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Image, Undo, Redo, Highlighter, List, ListOrdered,
  MessageSquareQuote, Code, ChevronDown, ListTree, Table, Sigma, Link,
  ArrowUpToLine, ArrowDownToLine, Search, Type
} from 'lucide-react';
import { TableCreationGrid } from './TableCreationGrid';
import { ColorPicker } from './ColorPicker';
import { LineSpacingDropdown } from './LineSpacingDropdown';
import { LineSpacing } from '@/hooks/useLineSpacing';

const ToolbarButton = React.forwardRef<HTMLButtonElement, { onClick: () => void; title: string; isActive?: boolean; disabled?: boolean; children: React.ReactNode; className?: string }>(
  ({ onClick, title, isActive, disabled, children, className }, ref) => (
    <button 
      ref={ref} 
      onMouseDown={(e) => e.preventDefault()} 
      onClick={onClick} 
      title={title} 
      disabled={disabled} 
      className={`
        p-1.5 rounded-md transition-all duration-200 flex items-center justify-center
        ${isActive 
          ? "bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100" 
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        } 
        disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent
        ${className || ''}
      `}
    >
      {children}
    </button>
  )
);
ToolbarButton.displayName = 'ToolbarButton';

const ToolbarDivider = () => (
  <div className="h-5 w-px bg-gray-200 mx-1 self-center flex-shrink-0" />
);

const Dropdown = ({ options, value, onChange, title, widthClass = "w-32", icon: Icon }: { options: { label: string, value: string }[], value: string, onChange: (value: string) => void, title: string, widthClass?: string, icon?: React.ElementType }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find(opt => opt.value === value)?.label || value;
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button 
        onMouseDown={(e) => e.preventDefault()} 
        onClick={() => setIsOpen(!isOpen)} 
        className={`
          flex items-center justify-between px-2 py-1.5 rounded-md text-sm 
          text-gray-700 hover:bg-gray-100 transition-all duration-200 
          ${widthClass}
          ${isOpen ? 'bg-gray-100' : ''}
        `}
        title={title}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {Icon && <Icon className="w-3.5 h-3.5 text-gray-500" />}
          <span className="truncate font-medium">{selectedLabel}</span>
        </div>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white rounded-lg border border-gray-100 shadow-lg py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-100">
          {options.map(option => (
            <button 
              key={option.value} 
              onMouseDown={(e) => e.preventDefault()} 
              onClick={() => { onChange(option.value); setIsOpen(false); }} 
              className={`
                w-full text-left px-3 py-1.5 text-sm transition-colors duration-150
                ${option.value === value ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}
              `}
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
  onFind: () => void;
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
    onInsertMath, onLink, onEditHeader, onEditFooter, onFind,
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
      if (rect.right + 160 > window.innerWidth) {
        setGridPositionStyle({ right: 0 });
      } else {
        setGridPositionStyle({ left: 0 });
      }
    }
    onTableMenuOpen();
    setTableMenuOpen(!isTableMenuOpen);
  };

  const blockTypeOptions = [{ label: "Paragraph", value: "p" }, { label: "Heading 1", value: "h1" }, { label: "Heading 2", value: "h2" }, { label: "Heading 3", "value": "h3" }];
  const fontOptions = [{ label: "Inter", value: "Inter" }, { label: "Serif", value: "Georgia" }, { label: "Mono", value: "Courier New" }];
  const fontSizeOptions = [{ label: "12", value: "12pt" }, { label: "14", value: "14pt" }, { label: "16", value: "16pt" }, { label: "18", value: "18pt" }, { label: "24", value: "24pt" }];

  return (
    <div className="bg-white/80 backdrop-blur-md border border-gray-200/60 shadow-sm rounded-xl p-1.5 flex items-center gap-0.5 transition-all duration-200 hover:shadow-md hover:bg-white/95">
      
      {/* Left Group: Navigation & History */}
      <div className="flex items-center gap-0.5 pr-1 flex-shrink-0">
        <ToolbarButton onClick={onToggleOutline} title="Outline" isActive={isTocOpen}>
          <ListTree className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onFind} title="Find & Replace">
          <Search className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      <div className="flex items-center gap-0.5 flex-shrink-0">
        <ToolbarButton onClick={onUndo} title="Undo" disabled={!canUndo}>
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onRedo} title="Redo" disabled={!canRedo}>
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      {/* Typography Group */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Dropdown options={blockTypeOptions} value={currentBlockType} onChange={onBlockTypeChange} title="Block Type" widthClass="w-28" />
        <Dropdown options={fontOptions} value={currentFont} onChange={onFontChange} title="Font Family" widthClass="w-20" icon={Type} />
        <Dropdown options={fontSizeOptions} value={currentSize.replace('pt', '')} onChange={onSizeChange} title="Size" widthClass="w-16" />
      </div>

      <ToolbarDivider />

      {/* Formatting Group */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <ToolbarButton onClick={onBold} title="Bold" isActive={isBold}><Bold className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={onItalic} title="Italic" isActive={isItalic}><Italic className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={onUnderline} title="Underline" isActive={isUnderline}><Underline className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={onHighlight} title="Highlight" isActive={isHighlighted}><Highlighter className="w-4 h-4" /></ToolbarButton>
        <ColorPicker currentColor={currentTextColor} onColorChange={onTextColorChange} onMenuOpen={onColorMenuOpen} />
      </div>

      <ToolbarDivider />

      {/* Alignment & Lists */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <ToolbarButton onClick={() => onAlign('left')} title="Left" isActive={textAlign === 'left'}><AlignLeft className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => onAlign('center')} title="Center" isActive={textAlign === 'center'}><AlignCenter className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => onAlign('right')} title="Right" isActive={textAlign === 'right'}><AlignRight className="w-4 h-4" /></ToolbarButton>
        <LineSpacingDropdown currentSpacing={currentLineSpacing} onSpacingChange={onLineSpacingChange} onMenuOpen={onLineSpacingMenuOpen} />
      </div>

      <ToolbarDivider />

      {/* Insert Group */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <ToolbarButton onClick={onBulletedList} title="Bullet List"><List className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={onNumberedList} title="Numbered List"><ListOrdered className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={onInsertImage} title="Image"><Image className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={onInsertMath} title="Formula"><Sigma className="w-4 h-4" /></ToolbarButton>
        <div ref={tableMenuRef} className="relative">
          <ToolbarButton ref={tableButtonRef} onClick={handleTableButtonClick} title="Table">
            <Table className="w-4 h-4" />
          </ToolbarButton>
          {isTableMenuOpen && (
            <div style={gridPositionStyle} className="absolute z-50 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 animate-in fade-in zoom-in-95 duration-100">
              <TableCreationGrid onSelect={handleTableSelect} />
            </div>
          )}
        </div>
        <ToolbarButton onClick={onLink} title="Link" isActive={isLink}><Link className="w-4 h-4" /></ToolbarButton>
      </div>

      <ToolbarDivider />

      {/* Page Layout Group */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <ToolbarButton 
          onClick={onEditHeader} 
          title="Edit Header" 
          className="w-auto px-2 gap-1.5 text-gray-600 hover:text-gray-900"
        >
          <ArrowUpToLine className="w-4 h-4" />
          <span className="text-xs font-medium">Header</span>
        </ToolbarButton>
        <ToolbarButton 
          onClick={onEditFooter} 
          title="Edit Footer" 
          className="w-auto px-2 gap-1.5 text-gray-600 hover:text-gray-900"
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span className="text-xs font-medium">Footer</span>
        </ToolbarButton>
      </div>

    </div>
  );
};
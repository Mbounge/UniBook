// src/components/editor/MathBlock.tsx
"use client";

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { 
  Calculator, 
  FunctionSquare, 
  Sigma, 
  Binary, 
  ArrowRightLeft,
  X,
  Check,
  Trash2
} from 'lucide-react';

interface MathBlockProps {
  initialTex: string;
  fontSize: number;
  onUpdate: (newTex: string) => void;
  onRemove: () => void;
}

// --- TYPES ---
type MathCategory = 'basic' | 'algebra' | 'greek' | 'logic' | 'calculus';

interface MathSymbol {
  name: string;
  display: string;
  insert: string;
  offset?: number;
}

// --- CONFIGURATION ---
const MATH_CATEGORIES: { id: MathCategory; icon: React.ElementType; label: string }[] = [
  { id: 'basic', icon: Calculator, label: 'Basic' },
  { id: 'algebra', icon: FunctionSquare, label: 'Algebra' },
  { id: 'calculus', icon: Sigma, label: 'Calculus' },
  { id: 'greek', icon: Binary, label: 'Greek' },
  { id: 'logic', icon: ArrowRightLeft, label: 'Logic' },
];

const MATH_SYMBOLS: Record<MathCategory, MathSymbol[]> = {
  basic: [
    { name: 'Fraction', display: '\\frac{a}{b}', insert: '\\frac{}{}', offset: -3 },
    { name: 'Square Root', display: '\\sqrt{x}', insert: '\\sqrt{}', offset: -1 },
    { name: 'Power', display: 'x^n', insert: '^{}', offset: -1 },
    { name: 'Subscript', display: 'x_n', insert: '_{}', offset: -1 },
    { name: 'Multiply', display: '\\times', insert: '\\times ' },
    { name: 'Divide', display: '\\div', insert: '\\div ' },
    { name: 'Plus Minus', display: '\\pm', insert: '\\pm ' },
    { name: 'Approx', display: '\\approx', insert: '\\approx ' },
    { name: 'Not Equal', display: '\\neq', insert: '\\neq ' },
    { name: 'Infinity', display: '\\infty', insert: '\\infty ' },
  ],
  algebra: [
    { name: 'Parentheses', display: '(x)', insert: '()' },
    { name: 'Brackets', display: '[x]', insert: '[]', offset: -1 },
    { name: 'Braces', display: '\\{x\\}', insert: '\\{\\}', offset: -2 },
    { name: 'Sum', display: '\\sum', insert: '\\sum_{}^{}', offset: -4 },
    { name: 'Vector', display: '\\vec{x}', insert: '\\vec{}', offset: -1 },
    { name: 'Matrix', display: '\\begin{bmatrix}\\dots\\end{bmatrix}', insert: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}' },
  ],
  calculus: [
    { name: 'Integral', display: '\\int', insert: '\\int_{}^{}', offset: -4 },
    { name: 'Limit', display: '\\lim', insert: '\\lim_{x \\to }', offset: -1 },
    { name: 'Derivative', display: '\\frac{d}{dx}', insert: '\\frac{d}{dx}' },
    { name: 'Partial', display: '\\partial', insert: '\\partial ' },
    { name: 'Nabla', display: '\\nabla', insert: '\\nabla ' },
  ],
  greek: [
    { name: 'Alpha', display: '\\alpha', insert: '\\alpha ' },
    { name: 'Beta', display: '\\beta', insert: '\\beta ' },
    { name: 'Gamma', display: '\\gamma', insert: '\\gamma ' },
    { name: 'Delta', display: '\\Delta', insert: '\\Delta ' },
    { name: 'Theta', display: '\\theta', insert: '\\theta ' },
    { name: 'Pi', display: '\\pi', insert: '\\pi ' },
    { name: 'Sigma', display: '\\sigma', insert: '\\sigma ' },
    { name: 'Omega', display: '\\Omega', insert: '\\Omega ' },
    { name: 'Phi', display: '\\phi', insert: '\\phi ' },
  ],
  logic: [
    { name: 'Right Arrow', display: '\\rightarrow', insert: '\\rightarrow ' },
    { name: 'Left Arrow', display: '\\leftarrow', insert: '\\leftarrow ' },
    { name: 'Implies', display: '\\Rightarrow', insert: '\\Rightarrow ' },
    { name: 'For All', display: '\\forall', insert: '\\forall ' },
    { name: 'Exists', display: '\\exists', insert: '\\exists ' },
    { name: 'Element Of', display: '\\in', insert: '\\in ' },
    { name: 'Therefore', display: '\\therefore', insert: '\\therefore ' },
  ],
};

// --- HELPER: MATH BUTTON ---
const MathButton = ({ symbol, onClick }: { symbol: MathSymbol; onClick: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(symbol.display, ref.current, {
          throwOnError: false,
          displayMode: false,
        });
      } catch (e) {
        ref.current.innerText = symbol.name;
      }
    }
  }, [symbol]);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className="group relative w-full aspect-square flex items-center justify-center rounded-md border border-gray-200 bg-white hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 shadow-sm"
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }} 
    >
      <div ref={ref} className="pointer-events-none transform scale-90 group-hover:scale-110 transition-transform duration-200" />
      
      {/* Tooltip */}
      <div 
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-medium rounded shadow-lg 
                   opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                   transition-all duration-200 pointer-events-none whitespace-nowrap z-[60]"
      >
        {symbol.name}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </button>
  );
};

// --- FLOATING EDITOR COMPONENT ---
const MathEditorPopover = ({ 
  tex, 
  setTex, 
  onSave, 
  onRemove, 
  onClose
}: { 
  tex: string; 
  setTex: (t: string) => void; 
  onSave: () => void; 
  onRemove: () => void; 
  onClose: () => void;
}) => {
  const [activeCategory, setActiveCategory] = useState<MathCategory>('basic');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Focus management
  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize height
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(Math.max(textareaRef.current.scrollHeight, 80), 200)}px`;
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation(); // Stop propagation to prevent parent editor from handling keys
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.stopPropagation(); // Stop propagation
    setTex(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 80), 200)}px`;
  };

  const insertSymbol = (symbol: MathSymbol) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newTex = tex.substring(0, start) + symbol.insert + tex.substring(end);
    
    setTex(newTex);

    const newCursorPos = start + symbol.insert.length + (symbol.offset || 0);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div 
      ref={popoverRef}
      className="absolute z-[9999] animate-in fade-in zoom-in-95 duration-200 mt-2 left-1/2 -translate-x-1/2"
      style={{
        width: '600px',
        maxWidth: '90vw',
        top: '100%', 
        cursor: 'default'
      }}
      // Stop propagation of mousedown to prevent parent from stealing focus
      onMouseDown={(e) => e.stopPropagation()} 
      onClick={(e) => e.stopPropagation()}
    >
      {/* Force Selection Color Style */}
      <style>
        {`
          .math-textarea::selection {
            background-color: #bfdbfe !important; /* blue-200 */
            color: #1e3a8a !important; /* blue-900 */
          }
        `}
      </style>

      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* --- HEADER --- */}
        <div className="flex items-center justify-between bg-white border-b border-gray-100 px-4 pt-4 pb-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0">
            {MATH_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveCategory(cat.id);
                  }}
                  className={`
                    flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all
                    ${isActive 
                      ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' 
                      : 'bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }
                  `}
                >
                  <Icon size={14} />
                  {cat.label}
                </button>
              );
            })}
          </div>
          
          <div className="flex items-center gap-1">
             <button 
               onClick={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 onRemove();
               }}
               className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
               title="Remove Block"
             >
               <Trash2 size={16} />
             </button>
          </div>
        </div>

        {/* --- PALETTE --- */}
        <div className="p-4 bg-gray-50/50 border-b border-gray-100">
          <div className="grid grid-cols-10 gap-2 max-h-32 overflow-y-auto custom-scrollbar">
            {MATH_SYMBOLS[activeCategory].map((symbol, idx) => (
              <MathButton 
                key={`${activeCategory}-${idx}`} 
                symbol={symbol} 
                onClick={() => insertSymbol(symbol)} 
              />
            ))}
          </div>
        </div>

        {/* --- INPUT AREA --- */}
        <div className="p-4 bg-white">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            LaTeX Code
          </label>
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={tex}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              // Stop propagation of click events inside textarea
              onClick={(e) => e.stopPropagation()}
              className="math-textarea w-full font-mono text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all leading-relaxed"
              placeholder="Type equation..."
              spellCheck={false}
            />
          </div>
        </div>

        {/* --- FOOTER --- */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-col gap-1.5">
            <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
              <span className="font-mono bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[10px] shadow-sm min-w-[32px] text-center">Enter</span> 
              <span>to save</span>
            </div>
            <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
              <span className="font-mono bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[10px] shadow-sm min-w-[32px] text-center">Shift+Ent</span> 
              <span>new line</span>
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSave();
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all hover:shadow hover:-translate-y-0.5 active:translate-y-0"
          >
            <Check size={14} />
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export const MathBlock: React.FC<MathBlockProps> = ({
  initialTex,
  fontSize,
  onUpdate,
  onRemove
}) => {
  const [isEditing, setIsEditing] = useState(initialTex === '');
  const [tex, setTex] = useState(initialTex);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- EVENT LISTENERS ---
  useEffect(() => {
    const currentRef = containerRef.current;
    if (!currentRef) return;

    const handleEdit = () => {
      setIsEditing(true);
    };

    const handleUpdateFontSize = (e: CustomEvent<{ fontSize: number }>) => {
      if (containerRef.current) {
        containerRef.current.style.fontSize = `${e.detail.fontSize}px`;
      }
    };

    currentRef.addEventListener('editMath', handleEdit);
    currentRef.addEventListener('updateMath', handleUpdateFontSize as EventListener);

    return () => {
      currentRef.removeEventListener('editMath', handleEdit);
      currentRef.removeEventListener('updateMath', handleUpdateFontSize as EventListener);
    };
  }, []);

  // --- RENDER MATH (ALWAYS VISIBLE) ---
  useEffect(() => {
    if (containerRef.current) {
      try {
        const renderTex = tex.trim() === '' ? '\\text{\\color{#cbd5e1}Empty Formula}' : tex;
        
        katex.render(renderTex, containerRef.current, {
          throwOnError: false,
          displayMode: true,
          strict: false,
          trust: true,
          macros: { "\\ce": "\\mathrm{#1}", "\\pu": "\\mathrm{#1}" }
        });
      } catch (error: any) {
        containerRef.current.innerText = `Error: ${error.message}`;
        containerRef.current.style.color = 'red';
      }
    }
  }, [tex]);

  const handleSave = useCallback(() => {
    if (tex.trim() === '') {
      onRemove();
    } else {
      onUpdate(tex);
      setIsEditing(false);
    }
  }, [tex, onRemove, onUpdate]);

  const handleClose = useCallback(() => {
    handleSave();
  }, [handleSave]);

  return (
    <div className="relative inline-block w-full">
      <div
        ref={containerRef}
        contentEditable={false}
        className={`math-rendered transition-all rounded-lg cursor-pointer ${isEditing ? '' : 'hover:bg-blue-50/50 hover:ring-2 hover:ring-blue-100'}`}
        title="Click to edit formula"
        style={{
          fontSize: `${fontSize}px`,
          padding: '12px 16px',
          display: 'block',
          textAlign: 'center',
          minHeight: '2em',
          // Removed margin to fix height mismatch with resizer overlay
        }}
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      />

      {isEditing && (
        <MathEditorPopover 
          tex={tex}
          setTex={setTex}
          onSave={handleSave}
          onRemove={onRemove}
          onClose={handleClose}
        />
      )}
    </div>
  );
};